import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "../redis";
import { logger } from "../logger";
import { CacheKeyGeneratorService } from "./cache/key-generator-service";
import { CacheCompressionService } from "./cache/compression-service";
import { CacheTTLService } from "./cache/ttl-calculator-service";
import { CacheInvalidationService } from "./cache/cache-invalidation-service";
import { CacheWarmingService } from "./cache/cache-warming-service";
import { CacheStatisticsService } from "./cache/cache-statistics-service";
import { CacheTimerService } from "./cache/cache-timer-service";
import { HttpCacheService } from "./cache/http-cache-service";

/**
 * Re-export CachedResponse for backward compatibility
 */
export type { CachedResponse } from "./cache/http-cache-service";

/**
 * Team-specific cache service for team management operations
 */
export const teamCache = {
  get: (key: string) => UnifiedCacheManager.getData(key),
  set: (key: string, value: any, ttl?: number) => UnifiedCacheManager.setData(key, value, { ttl }),
  invalidate: (key: string) => UnifiedCacheManager.invalidateKey(key),
};

/**
 * Main cache options interface
 */
export interface UnifiedCacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  varyBy?: string[];
  compress?: boolean;
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
 * - HttpCacheService: HTTP-specific caching operations
 * - CacheTimerService: Performance measurement
 */
export class UnifiedCacheManager {
  /**
   * Get data from cache
   */
  static async getData<T = any>(
    key: string,
    options: UnifiedCacheOptions = {},
  ): Promise<T | null> {
    const timer = CacheTimerService.forGet(key);

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
        timer.finish({ status: "miss" });
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

      timer.finish({ status: "hit" });
      return data;
    } catch (error) {
      logger.error("Cache get failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });

      await CacheStatisticsService.updateStats({ type: "miss" });
      timer.finish({ status: "error" });
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
    const timer = CacheTimerService.forSet(key);

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

      timer.finish({ status: "set" });
    } catch (error) {
      logger.error("Cache set failed", {
        key,
        error: error instanceof Error ? error.message : error,
      });

      timer.finish({ status: "error" });
    }
  }

  /**
   * Get cached response - delegates to HttpCacheService
   */
  static async getCachedResponse(
    request: NextRequest,
    options: UnifiedCacheOptions = {},
  ): Promise<NextResponse | null> {
    return HttpCacheService.getCachedResponse(request, {
      ...options,
      conditional: true, // Enable ETag by default
    });
  }

  /**
   * Cache response - delegates to HttpCacheService
   */
  static async setCachedResponse(
    request: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    return HttpCacheService.setCachedResponse(request, response, options);
  }

  /**
   * HTTP response caching wrapper - delegates to HttpCacheService
   */
  static async withCache(
    request: NextRequest,
    handler: () => Promise<NextResponse>,
    options: UnifiedCacheOptions = {},
  ): Promise<NextResponse> {
    return HttpCacheService.withCache(request, handler, options);
  }

  /**
   * Delegate methods to specialized services
   */

  static async invalidateKey(key: string): Promise<void> {
    const timer = CacheTimerService.forInvalidation("key", key);
    await CacheInvalidationService.invalidateKey(key);
    timer.finish();
  }

  static async invalidateByTag(tag: string): Promise<void> {
    const timer = CacheTimerService.forInvalidation("tag", tag);
    await CacheInvalidationService.invalidateByTag(tag);
    timer.finish();
  }

  static async invalidateByEvent(
    event: string,
    cascade: string[] = [],
  ): Promise<void> {
    const timer = CacheTimerService.forInvalidation("event", event, {
      cascade,
    });
    await CacheInvalidationService.invalidateByEvent(event, cascade);
    timer.finish();
  }

  static async getCacheStats() {
    return CacheStatisticsService.getRichCacheStats();
  }

  static async performIntelligentWarming() {
    const timer = CacheTimerService.forWarming("intelligent");
    const result = CacheWarmingService.performIntelligentWarming();
    timer.finish();
    return result;
  }

  static async performAdaptiveWarming() {
    const timer = CacheTimerService.forWarming("adaptive");
    const result = CacheWarmingService.performAdaptiveWarming();
    timer.finish();
    return result;
  }

  static async warmupPatternCache(patterns: string[]) {
    const timer = CacheTimerService.forWarming("pattern", { patterns });
    const result = CacheWarmingService.warmupPatternCache(patterns);
    timer.finish();
    return result;
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
   * Check if response is cacheable - delegates to HttpCacheService
   */
  static isCacheable(response: NextResponse): boolean {
    return HttpCacheService.isResponseCacheable(response);
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

  /**
   * Backward-compatible cacheData method - delegates to setData
   * Maintains compatibility with consumers using legacy API
   */
  static async cacheData(
    prefix: string,
    inputData: any,
    responseData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    const key =
      options.key || CacheKeyGeneratorService.generateKey(prefix, inputData);

    await this.setData(key, responseData, {
      ...options,
      tags: options.tags || [],
    });
  }

  /**
   * Backward-compatible cacheResponse method - delegates to setCachedResponse
   * Maintains compatibility with consumers using legacy API
   */
  static async cacheResponse(
    request: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    await this.setCachedResponse(request, response, options);
  }

  /**
   * Backward-compatible getDataLegacy method - delegates to modern getData
   * Maintains compatibility with consumers using legacy 3-argument API
   */
  static async getDataLegacy(
    prefix: string,
    inputData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<any | null> {
    const key =
      options.key || CacheKeyGeneratorService.generateKey(prefix, inputData);
    return this.getData(key, options);
  }
}
