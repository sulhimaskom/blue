import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "../redis";
import { logger } from "../logger";
import { CacheKeyGeneratorService } from "./cache/key-generator-service";
import { CacheCompressionService } from "./cache/compression-service";
import { CacheTTLService } from "./cache/ttl-calculator-service";
import { CacheInvalidationService } from "./cache/cache-invalidation-service";
import { CacheWarmingService } from "./cache/cache-warming-service";
import { CacheStatisticsService } from "./cache/cache-statistics-service";

/**
 * Main cache options interface
 */
export interface UnifiedCacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key (auto-generated if not provided)
  tags?: string[]; // Cache tags for invalidation
  varyBy?: string[]; // Request headers to vary cache by (for responses)
  compress?: boolean; // Enable compression for larger responses
}

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
 * Main orchestrator for all cache operations
 *
 * This service delegates to specialized atomic services:
 * - CacheKeyGeneratorService: Key generation and normalization
 * - CacheCompressionService: Data compression/decompression
 * - CacheTTLService: TTL calculation and optimization
 * - CacheInvalidationService: Cache invalidation and cleanup
 * - CacheWarmingService: Proactive cache warming
 * - CacheStatisticsService: Statistics and monitoring
 */
export class UnifiedCacheManager {
  /**
   * Get data from cache
   */
  static async getData<T = any>(
    key: string,
    options: UnifiedCacheOptions = {},
  ): Promise<T | null> {
    const timer = new Timer("cache:get");

    try {
      const fullKey =
        options.key ||
        CacheKeyGeneratorService.generateKey("data", { key, ...options });

      const cached = await redisManager.executeWithFallback(
        async (client) => await client.get(fullKey),
        async () => null,
      );

      if (!cached) {
        await CacheStatisticsService.updateStats({ type: "miss" });
        logger.debug("Cache miss", { key: fullKey });
        return null;
      }

      // Parse and decompress if needed
      const parsed = JSON.parse(cached);
      const data = await CacheCompressionService.decompressResponseData(
        parsed.data,
        parsed.metadata?.compressed,
      );

      await CacheStatisticsService.updateStats({
        type: "hit",
        pattern: this.extractPattern(fullKey),
      });

      logger.debug("Cache hit", {
        key: fullKey,
        compressed: parsed.metadata?.compressed,
      });

      timer.finish();
      return data;
    } catch (error) {
      logger.error("Cache get failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });

      await CacheStatisticsService.updateStats({ type: "miss" });
      return null;
    }
  }

  /**
   * Set data in cache
   */
  static async setData(
    key: string,
    data: any,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    const timer = new Timer("cache:set");

    try {
      const fullKey =
        options.key ||
        CacheKeyGeneratorService.generateKey("data", { key, ...options });

      // Calculate TTL
      const ttl = CacheTTLService.calculateTTL(
        this.extractPattern(fullKey),
        data,
        {
          customTTL: options.ttl,
          isExpensive: true,
          isUserSpecific: key.includes("user"),
        },
      );

      // Compress if beneficial
      const shouldCompress =
        options.compress || CacheCompressionService.shouldCompress(data);
      const processedData = shouldCompress
        ? await CacheCompressionService.compressResponseData(data)
        : data;

      // Create cache entry with metadata
      const cacheEntry = {
        data: processedData,
        metadata: {
          createdAt: new Date().toISOString(),
          etag: CacheKeyGeneratorService.generateETag(data),
          compressed: shouldCompress,
          size: JSON.stringify(processedData).length,
          originalSize: JSON.stringify(data).length,
          tags: options.tags || [],
        },
      };

      // Store in Redis
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(fullKey, ttl, JSON.stringify(cacheEntry));
        },
        async () => {
          logger.warn("Cache set fallback", { key: fullKey });
        },
      );

      // Store tag relationships if provided
      if (options.tags) {
        await this.storeTagRelationships(fullKey, options.tags);
      }

      await CacheStatisticsService.updateStats({
        type: "set",
        pattern: this.extractPattern(fullKey),
      });

      logger.debug("Cache set", {
        key: fullKey,
        ttl,
        compressed: shouldCompress,
        size: cacheEntry.metadata.size,
      });

      timer.finish();
    } catch (error) {
      logger.error("Cache set failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Get cached response
   */
  static async getCachedResponse(
    request: NextRequest,
    options: UnifiedCacheOptions = {},
  ): Promise<NextResponse | null> {
    const timer = new Timer("cache:response:get");

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
        return null;
      }

      const parsed: CachedResponse = JSON.parse(cached);

      // Check ETag if request has If-None-Match header
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === parsed.metadata.etag) {
        return new NextResponse(null, { status: 304 });
      }

      // Decompress response data if needed
      const data = await CacheCompressionService.decompressResponseData(
        parsed.data,
        parsed.metadata.compressed,
      );

      const response = new NextResponse(data.data, {
        status: parsed.status,
        headers: parsed.headers,
      });

      // Add cache headers
      response.headers.set("ETag", parsed.metadata.etag);
      response.headers.set("X-Cache", "HIT");
      response.headers.set(
        "X-Cache-Compressed",
        parsed.metadata.compressed.toString(),
      );

      if (parsed.metadata.compressionRatio) {
        response.headers.set(
          "X-Cache-Compression-Ratio",
          parsed.metadata.compressionRatio,
        );
      }

      await CacheStatisticsService.updateStats({
        type: "hit",
        pattern: "response",
      });

      timer.finish();
      return response;
    } catch (error) {
      logger.error("Cache response get failed", {
        error: error instanceof Error ? error.message : error,
      });

      await CacheStatisticsService.updateStats({ type: "miss" });
      return null;
    }
  }

  /**
   * Cache response
   */
  static async setCachedResponse(
    request: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    const timer = new Timer("cache:response:set");

    try {
      const responseClone = response.clone();
      const data = await responseClone.text();

      const cacheKey = CacheKeyGeneratorService.generateResponseKey(
        request,
        options.varyBy,
      );

      // Calculate appropriate TTL for responses
      const ttl = CacheTTLService.calculateTTL(
        "response",
        { url: request.url, status: response.status },
        {
          customTTL: options.ttl,
          isUserSpecific: request.url.includes("user"),
        },
      );

      // Compress response data if beneficial
      const shouldCompress =
        options.compress || CacheCompressionService.shouldCompress(data);
      const processedData = shouldCompress
        ? await CacheCompressionService.compressResponseData(data)
        : data;

      // Create cache entry
      const cacheEntry: CachedResponse = {
        data: processedData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
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

      // Store in cache
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(cacheKey, ttl, JSON.stringify(cacheEntry));
        },
        async () => {
          logger.warn("Cache response fallback", { url: request.url });
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

      timer.finish();
    } catch (error) {
      logger.error("Cache response set failed", {
        url: request.url,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Delegate methods to specialized services
   */

  static async invalidateKey(key: string): Promise<void> {
    await CacheInvalidationService.invalidateKey(key);
  }

  static async invalidateByTag(tag: string): Promise<void> {
    await CacheInvalidationService.invalidateByTag(tag);
  }

  static async invalidateByEvent(
    event: string,
    cascade: string[] = [],
  ): Promise<void> {
    await CacheInvalidationService.invalidateByEvent(event, cascade);
  }

  static async getCacheStats() {
    return CacheStatisticsService.getRichCacheStats();
  }

  static async performIntelligentWarming() {
    return CacheWarmingService.performIntelligentWarming();
  }

  static async performAdaptiveWarming() {
    return CacheWarmingService.performAdaptiveWarming();
  }

  static async warmupPatternCache(patterns: string[]) {
    return CacheWarmingService.warmupPatternCache(patterns);
  }

  static async getPerformanceMetrics() {
    return CacheStatisticsService.getPerformanceMetrics();
  }

  /**
   * Validate cache entry
   */
  static validateCacheEntry(entry: any): boolean {
    try {
      return (
        entry &&
        entry.data !== undefined &&
        entry.metadata &&
        entry.metadata.createdAt &&
        entry.metadata.etag
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if response is cacheable
   */
  static isCacheable(response: NextResponse): boolean {
    const status = response.status;
    const contentType = response.headers.get("content-type");

    // Only cache successful responses
    if (status < 200 || status >= 300) {
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
   * Store tag relationships for invalidation
   */
  private static async storeTagRelationships(
    key: string,
    tags: string[],
  ): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `${this.extractPrefix()}:tags:${tag}`;
        await redisManager.executeWithFallback(
          async (client) => {
            await client.sAdd(tagKey, key);
          },
          async () => {},
        );
      }
    } catch (error) {
      logger.debug("Failed to store tag relationships", {
        key,
        tags,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Extract pattern from cache key
   */
  private static extractPattern(key: string): string {
    const parts = key.split(":");
    return parts.length >= 2 ? parts[1] : "unknown";
  }

  /**
   * Extract cache prefix
   */
  private static extractPrefix(): string {
    return "ai-platform";
  }

  /**
   * HTTP response caching wrapper - cache miss → execute handler → cache result
   */
  static async withCache(
    request: NextRequest,
    handler: () => Promise<NextResponse>,
    options: UnifiedCacheOptions = {},
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
   * Invalidate blueprint cache by project ID and type
   */
  static async invalidateBlueprintCache(
    projectId: string,
    blueprintType?: string,
  ): Promise<void> {
    try {
      const tags = [
        `project-${projectId}`,
        "blueprint-complete",
        "blueprint-skeleton",
      ];

      if (blueprintType) {
        tags.push(`blueprint-${blueprintType}`);
      }

      await this.invalidateByTag(tags[0]);

      for (const tag of tags.slice(1)) {
        await this.invalidateByTag(tag);
      }

      logger.info("Blueprint cache invalidated", {
        projectId,
        blueprintType,
        tags,
      });
    } catch (error) {
      logger.error("Failed to invalidate blueprint cache", {
        projectId,
        blueprintType,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

/**
 * Timer utility for performance measurement
 */
class Timer {
  private operation: string;
  private start: number;

  constructor(operation: string) {
    this.operation = operation;
    this.start = Date.now();
  }

  finish(): void {
    const duration = Date.now() - this.start;
    logger.debug(`Operation completed: ${this.operation}`, { duration });
  }
}
