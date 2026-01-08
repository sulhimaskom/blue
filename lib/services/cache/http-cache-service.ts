import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "../../redis";
import { logger } from "../../logger";
import { CacheKeyGeneratorService } from "./key-generator-service";
import { CacheCompressionService } from "./compression-service";
import { CacheTTLService } from "./ttl-calculator-service";
import { CacheStatisticsService } from "./cache-statistics-service";
import { CacheTimerService } from "./cache-timer-service";

/**
 * Cached response interface
 */
export interface CachedResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  metadata: {
    createdAt: string;
    etag: string;
    compressed: boolean;
    size: number;
    originalSize?: number;
    compressionRatio?: string;
    tags: string[];
  };
}

/**
 * HTTP-specific cache options interface
 */
export interface HttpCacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  varyBy?: string[];
  compress?: boolean;
  conditional?: boolean; // Enable ETag conditional requests
}

/**
 * Atomic service specialized in HTTP response caching
 *
 * Handles Next.js request/response caching with ETag support,
 * conditional requests, and HTTP-specific optimizations.
 */
export class HttpCacheService {
  /**
   * Get cached response for HTTP request
   */
  static async getCachedResponse(
    request: NextRequest,
    options: HttpCacheOptions = {},
  ): Promise<NextResponse | null> {
    const timer = CacheTimerService.forResponse("get", request.url);

    try {
      const cacheKey = CacheKeyGeneratorService.generateResponseKey(
        request,
        options.varyBy,
      );

      const cached = await redisManager.executeWithFallback(
        async (client) => await client.get(cacheKey),
        async () => null,
      );

      if (!cached) {
        await CacheStatisticsService.updateStats({ type: "miss" });
        timer.finish({ status: "miss" });
        return null;
      }

      const parsed: CachedResponse = JSON.parse(cached);

      // Handle conditional requests with ETag
      if (options.conditional) {
        const response = this.handleConditionalRequest(request, parsed);
        if (response) {
          timer.finish({ status: "conditional_hit" });
          return response;
        }
      }

      // Decompress and reconstruct response
      const finalResponse = await this.reconstructResponse(parsed);

      this.addCacheHeaders(finalResponse, parsed);

      await CacheStatisticsService.updateStats({
        type: "hit",
        pattern: "response",
      });

      timer.finish({ status: "hit", compressed: parsed.metadata.compressed });
      return finalResponse;
    } catch (error) {
      logger.error("HTTP cache response get failed", {
        url: request.url,
        error: error instanceof Error ? error.message : error,
      });

      await CacheStatisticsService.updateStats({ type: "miss" });
      timer.finish({ status: "error" });
      return null;
    }
  }

  /**
   * Cache HTTP response
   */
  static async setCachedResponse(
    request: NextRequest,
    response: NextResponse,
    options: HttpCacheOptions = {},
  ): Promise<void> {
    const timer = CacheTimerService.forResponse("set", request.url);

    try {
      // Validate response is cacheable
      if (!this.isResponseCacheable(response)) {
        timer.finish({ status: "not_cacheable" });
        return;
      }

      const responseClone = response.clone();
      const data = await responseClone.text();

      const cacheKey = CacheKeyGeneratorService.generateResponseKey(
        request,
        options.varyBy,
      );

      // Calculate TTL for HTTP responses
      const ttl = CacheTTLService.calculateTTL(
        "response",
        { url: request.url, status: response.status },
        {
          customTTL: options.ttl,
          isUserSpecific: request.url.includes("user"),
        },
      );

      // Compress if beneficial
      const shouldCompress =
        options.compress || CacheCompressionService.shouldCompress(data);
      const processedData = shouldCompress
        ? await CacheCompressionService.compressResponseData(data)
        : data;

      // Create cache entry with HTTP-specific metadata
      const cacheEntry: CachedResponse = {
        data: processedData,
        status: response.status,
        headers: this.extractCacheableHeaders(response),
        metadata: {
          createdAt: new Date().toISOString(),
          etag: CacheKeyGeneratorService.generateETag(data),
          compressed: shouldCompress,
          size: JSON.stringify(processedData).length,
          originalSize: data.length,
          compressionRatio: shouldCompress
            ? `${(1 - (JSON.stringify(processedData).length / data.length) * 100).toFixed(1)}%`
            : undefined,
          tags: options.tags || [],
        },
      };

      // Store in Redis
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(cacheKey, ttl, JSON.stringify(cacheEntry));
        },
        async () => {
          logger.warn("HTTP cache response fallback", { url: request.url });
        },
      );

      // Store tag relationships
      if (options.tags) {
        await this.storeTagRelationships(cacheKey, options.tags);
      }

      await CacheStatisticsService.updateStats({
        type: "set",
        pattern: "response",
      });

      timer.finish({
        status: "cached",
        compressed: shouldCompress,
        size: cacheEntry.metadata.size,
      });
    } catch (error) {
      logger.error("HTTP cache response set failed", {
        url: request.url,
        error: error instanceof Error ? error.message : error,
      });

      timer.finish({ status: "error" });
    }
  }

  /**
   * Wrapper for HTTP response caching - cache miss → execute → cache result
   */
  static async withCache(
    request: NextRequest,
    handler: () => Promise<NextResponse>,
    options: HttpCacheOptions = {},
  ): Promise<NextResponse> {
    const cachedResponse = await this.getCachedResponse(request, options);
    if (cachedResponse) {
      return cachedResponse;
    }

    const freshResponse = await handler();
    await this.setCachedResponse(request, freshResponse, options);
    freshResponse.headers.set("x-cache-status", "MISS");

    return freshResponse;
  }

  /**
   * Handle conditional requests with ETag
   */
  private static handleConditionalRequest(
    request: NextRequest,
    cachedResponse: CachedResponse,
  ): NextResponse | null {
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === cachedResponse.metadata.etag) {
      return new NextResponse(null, { status: 304 });
    }
    return null;
  }

  /**
   * Reconstruct NextResponse from cached data
   */
  private static async reconstructResponse(
    cachedResponse: CachedResponse,
  ): Promise<NextResponse> {
    // Decompress response data if needed
    const data = await CacheCompressionService.decompressResponseData(
      cachedResponse.data,
      cachedResponse.metadata.compressed,
    );

    return new NextResponse(data.data, {
      status: cachedResponse.status,
      headers: cachedResponse.headers,
    });
  }

  /**
   * Add cache-specific headers to response
   */
  private static addCacheHeaders(
    response: NextResponse,
    cachedResponse: CachedResponse,
  ): void {
    response.headers.set("ETag", cachedResponse.metadata.etag);
    response.headers.set("X-Cache", "HIT");
    response.headers.set(
      "X-Cache-Compressed",
      cachedResponse.metadata.compressed.toString(),
    );

    if (cachedResponse.metadata.compressionRatio) {
      response.headers.set(
        "X-Cache-Compression-Ratio",
        cachedResponse.metadata.compressionRatio,
      );
    }
  }

  /**
   * Extract cacheable headers from response
   */
  private static extractCacheableHeaders(
    response: NextResponse,
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    const nonCacheableHeaders = new Set([
      "set-cookie",
      "authorization",
      "proxy-authorization",
      "www-authenticate",
    ]);

    for (const [key, value] of response.headers.entries()) {
      if (!nonCacheableHeaders.has(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    return headers;
  }

  /**
   * Check if response is cacheable based on HTTP rules
   */
  static isResponseCacheable(response: NextResponse): boolean {
    const status = response.status;
    const contentType = response.headers.get("content-type");
    const cacheControl = response.headers.get("cache-control");

    // Only cache successful responses
    if (status < 200 || status >= 300) {
      return false;
    }

    // Respect explicit no-cache directives
    if (
      cacheControl?.includes("no-store") ||
      cacheControl?.includes("private")
    ) {
      return false;
    }

    // Don't cache streaming responses
    if (contentType?.includes("text/event-stream")) {
      return false;
    }

    // Don't cache already cached responses
    if (response.headers.get("x-cache") === "HIT") {
      return false;
    }

    return true;
  }

  /**
   * Store tag relationships for HTTP cache invalidation
   */
  private static async storeTagRelationships(
    key: string,
    tags: string[],
  ): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `ai-platform:tags:${tag}`;
        await redisManager.executeWithFallback(
          async (client) => {
            await client.sAdd(tagKey, key);
          },
          async () => {},
        );
      }
    } catch (error) {
      logger.debug("Failed to store HTTP cache tag relationships", {
        key,
        tags,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Invalidate HTTP cache by URL pattern
   */
  static async invalidateByUrlPattern(pattern: string): Promise<void> {
    try {
      // This would require Redis SCAN operations for pattern matching
      // For now, we'll delegate to the invalidation service
      logger.info("HTTP cache invalidate by pattern", { pattern });
    } catch (error) {
      logger.error("Failed to invalidate HTTP cache by pattern", {
        pattern,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
