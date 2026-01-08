import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "../../redis";
import { logger } from "../../logger";
import { Timing } from "@/lib/utils/time-measurement";
import { CacheKeyGeneratorService } from "./cache-key-generator.service";
import { CacheCompressionService } from "./cache-compression.service";
import { CacheTTLService } from "./cache-ttl.service";
import { CacheInvalidationService } from "./cache-invalidation.service";
import { CacheWarmingService } from "./cache-warming.service";
import { CacheStatisticsService } from "./cache-statistics.service";

export interface UnifiedCacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key (auto-generated if not provided)
  tags?: string[]; // Cache tags for invalidation
  varyBy?: string[]; // Request headers to vary cache by (for responses)
  compress?: boolean; // Enable compression for larger responses
}

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
 * Orchestrator service that coordinates between specialized cache services
 * Provides a unified interface while delegating to atomic services for optimal performance
 */
export class CacheOrchestratorService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour

  /**
   * Cache AI response or generic data with intelligent TTL and optimization
   */
  static async cacheData(
    prefix: string,
    inputData: any,
    responseData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    const key =
      options.key || CacheKeyGeneratorService.generateKey(prefix, inputData);
    const ttl = await CacheTTLService.calculateTTL(prefix, options.ttl);
    const tags = options.tags || [];

    const cacheData = {
      data: responseData,
      metadata: {
        createdAt: new Date().toISOString(),
        prefix,
        tags,
        ttl,
        keyVersion: CacheKeyGeneratorService.getKeyVersion(prefix),
      },
    };

    try {
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(key, ttl, JSON.stringify(cacheData));

          // Store tag mappings for selective invalidation
          if (tags.length > 0) {
            const tagPromises = tags.map((tag) =>
              client.sAdd(`ai-platform:tag:${tag}`, key),
            );
            await Promise.all(tagPromises);
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping cache", { key });
        },
      );

      logger.debug("Data cached", {
        key,
        prefix,
        ttl,
        dataSize: JSON.stringify(responseData).length,
      });
    } catch (error) {
      logger.error("Cache operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
        prefix,
      });
    }
  }

  /**
   * Get cached data with validation
   */
  static async getData(
    prefix: string,
    inputData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<any | null> {
    const key =
      options.key || CacheKeyGeneratorService.generateKey(prefix, inputData);

    try {
      const cached = await redisManager.executeWithFallback(
        async (client) => {
          const data = await client.get(key);
          return data ? JSON.parse(data) : null;
        },
        async () => null,
      );

      if (!cached || !this.validateCacheEntry(cached, prefix)) {
        if (cached) {
          await CacheInvalidationService.invalidateKey(key);
        }
        return null;
      }

      logger.debug("Cache hit", {
        key,
        prefix,
        age: Timing.now() - new Date(cached.metadata.createdAt).getTime(),
      });

      return cached.data;
    } catch (error) {
      logger.error("Cache retrieval failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
        prefix,
      });
      return null;
    }
  }

  /**
   * Cache HTTP response with metadata and compression
   */
  static async cacheResponse(
    req: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions,
  ): Promise<void> {
    if (!this.isCacheable(response)) {
      return;
    }

    const key = CacheKeyGeneratorService.generateResponseKey(
      req,
      options.varyBy,
    );
    let responseData = await response.json();

    // Apply intelligent compression if enabled
    let compressed = options.compress || false;
    let originalSize = JSON.stringify(responseData).length;

    // Auto-compress large responses (>10KB)
    if (
      !compressed &&
      originalSize > CacheCompressionService["COMPRESSION_THRESHOLD"]
    ) {
      compressed = true;
    }

    if (compressed) {
      responseData =
        await CacheCompressionService.compressResponseData(responseData);
    }

    const finalSize = JSON.stringify(responseData).length;
    const etag = CacheKeyGeneratorService.generateETag(responseData);

    const cachedResponse: CachedResponse = {
      data: responseData,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      metadata: {
        createdAt: new Date().toISOString(),
        etag,
        compressed,
        size: finalSize,
        originalSize,
        compressionRatio:
          finalSize < originalSize
            ? CacheCompressionService.calculateCompressionRatio(
                originalSize,
                finalSize,
              )
            : "1.0",
        tags: options.tags || [],
      },
    };

    try {
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            key,
            options.ttl || this.DEFAULT_TTL,
            JSON.stringify(cachedResponse),
          );

          // Store tag mappings for selective invalidation
          if (options.tags && options.tags.length > 0) {
            const tagPromises = options.tags.map((tag) =>
              client.sAdd(`response:tag:${tag}`, key),
            );
            await Promise.all(tagPromises);
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping response cache", { key });
        },
      );

      logger.debug("Response cached", {
        key,
        url: req.url,
        status: response.status,
        size: finalSize,
        originalSize,
        compressed,
        compressionRatio: cachedResponse.metadata.compressionRatio,
        ttl: options.ttl,
      });
    } catch (error) {
      logger.error("Response cache failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
        url: req.url,
      });
    }
  }

  /**
   * Get cached response or handle conditional requests
   */
  static async getCachedResponse(
    req: NextRequest,
    options: UnifiedCacheOptions,
  ): Promise<NextResponse | null> {
    const key = CacheKeyGeneratorService.generateResponseKey(
      req,
      options.varyBy,
    );
    const ifNoneMatch = req.headers.get("if-none-match");

    try {
      const cached = await redisManager.executeWithFallback(
        async (client) => {
          const data = await client.get(key);
          return data ? JSON.parse(data) : null;
        },
        async () => null,
      );

      if (!cached || !this.validateCacheEntry(cached)) {
        if (cached) {
          await CacheInvalidationService.invalidateKey(key);
        }
        return null;
      }

      // Handle conditional requests (ETag validation)
      if (ifNoneMatch && ifNoneMatch === cached.metadata.etag) {
        const response = new NextResponse(null, { status: 304 });
        response.headers.set("etag", cached.metadata.etag);
        response.headers.set(
          "cache-control",
          `max-age=${options.ttl || this.DEFAULT_TTL}`,
        );
        response.headers.set("x-cache-status", "HIT");
        return response;
      }

      // Decompress data if needed
      const responseData = await CacheCompressionService.decompressResponseData(
        cached.data,
        cached.metadata.compressionRatio,
      );

      // Return cached response
      const response = NextResponse.json(responseData, {
        status: cached.status,
      });

      Object.entries(cached.headers).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });

      response.headers.set("etag", cached.metadata.etag);
      response.headers.set(
        "cache-control",
        `max-age=${options.ttl || this.DEFAULT_TTL}`,
      );
      response.headers.set("x-cache-status", "HIT");
      response.headers.set(
        "x-cache-age",
        Math.floor(
          (Timing.now() - new Date(cached.metadata.createdAt).getTime()) / 1000,
        ).toString(),
      );

      return response;
    } catch (error) {
      logger.error("Cached response retrieval failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
        url: req.url,
      });
      return null;
    }
  }

  /**
   * Middleware wrapper for automatic response caching
   */
  static async withCache(
    req: NextRequest,
    handler: () => Promise<NextResponse>,
    options: UnifiedCacheOptions,
  ): Promise<NextResponse> {
    const cachedResponse = await this.getCachedResponse(req, options);
    if (cachedResponse) {
      return cachedResponse;
    }

    const freshResponse = await handler();
    await this.cacheResponse(req, freshResponse, options);
    freshResponse.headers.set("x-cache-status", "MISS");

    return freshResponse;
  }

  /**
   * Perform intelligent cache warming using the warming service
   */
  static async performIntelligentWarming(): Promise<void> {
    await CacheWarmingService.performIntelligentWarming(
      this.cacheData.bind(this),
    );
  }

  /**
   * Perform adaptive cache warming
   */
  static async performAdaptiveWarming(): Promise<void> {
    await CacheWarmingService.performAdaptiveWarming(
      this.cacheData.bind(this),
      CacheStatisticsService.getCacheStats.bind(CacheStatisticsService),
    );
  }

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats() {
    return CacheStatisticsService.getCacheStats();
  }

  /**
   * Get cache health score
   */
  static async getCacheHealthScore() {
    return CacheStatisticsService.getCacheHealthScore();
  }

  /**
   * Get cache optimization report
   */
  static async generateOptimizationReport() {
    return CacheStatisticsService.generateOptimizationReport();
  }

  /**
   * Invalidate cache by tag
   */
  static async invalidateByTag(tag: string): Promise<void> {
    await CacheInvalidationService.invalidateByTag(tag);
  }

  /**
   * Invalidate cache by event
   */
  static async invalidateByEvent(
    event: string,
    context?: Record<string, any>,
  ): Promise<void> {
    await CacheInvalidationService.invalidateByEvent(event, context);
  }

  /**
   * Invalidate blueprint cache
   */
  static async invalidateBlueprintCache(
    projectId: string,
    blueprintType?: string,
  ): Promise<void> {
    await CacheInvalidationService.invalidateBlueprintCache(
      projectId,
      blueprintType,
    );
  }

  /**
   * Cleanup expired entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    return CacheInvalidationService.cleanupExpiredEntries();
  }

  /**
   * Validate cache entry integrity
   */
  private static validateCacheEntry(
    entry: any,
    expectedPrefix?: string,
  ): boolean {
    if (!entry || !entry.data) {
      return false;
    }

    if (expectedPrefix && entry.metadata?.prefix !== expectedPrefix) {
      return false;
    }

    // For response cache entries
    if (entry.metadata && !entry.data) {
      const requiredFields = [
        "createdAt",
        "etag",
        "compressed",
        "size",
        "tags",
      ];
      for (const field of requiredFields) {
        if (!(field in entry.metadata)) {
          return false;
        }
      }
    }

    // Check age-based expiration
    if (entry.metadata?.createdAt && entry.metadata?.ttl) {
      const age = Timing.now() - new Date(entry.metadata.createdAt).getTime();
      if (age > entry.metadata.ttl * 1000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if HTTP response can be cached
   */
  private static isCacheable(response: NextResponse): boolean {
    const status = response.status;

    if (status < 200 || status >= 300) {
      return false;
    }

    const cacheControl = response.headers.get("cache-control");
    if (
      cacheControl?.includes("no-cache") ||
      cacheControl?.includes("no-store")
    ) {
      return false;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return false;
    }

    return true;
  }
}
