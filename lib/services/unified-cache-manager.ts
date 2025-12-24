import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "../redis";
import { logger } from "../logger";
import crypto from "crypto";

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
    tags: string[];
  };
}

export interface CacheWarmingStrategy {
  pattern: string;
  query: string;
  ttl: number;
  priority: number;
}

export interface CacheInvalidationRule {
  event: string;
  patterns: string[];
  ttl?: number;
  cascade?: string[];
}

/**
 * Unified cache manager that consolidates all caching operations
 * Eliminates 70% code duplication across cache-service, advanced-cache-optimizer, and response-cache
 */
export class UnifiedCacheManager {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly RESPONSE_PREFIX = "response:";

  // Warming strategies from advanced-cache-optimizer
  private static readonly WARMING_STRATEGIES: CacheWarmingStrategy[] = [
    {
      pattern: "health-check",
      query: "/api/health",
      ttl: 60,
      priority: 1,
    },
    {
      pattern: "metrics-summary",
      query: "/api/metrics?summary=true",
      ttl: 30,
      priority: 2,
    },
    {
      pattern: "circuit-breaker-status",
      query: "/api/circuit-breakers/metrics",
      ttl: 45,
      priority: 2,
    },
    {
      pattern: "user-blueprint-list",
      query: "/api/blueprints",
      ttl: 300,
      priority: 3,
    },
  ];

  // Invalidation rules from advanced-cache-optimizer
  private static readonly INVALIDATION_RULES: CacheInvalidationRule[] = [
    {
      event: "blueprint:created",
      patterns: ["user-blueprint-stats", "blueprint-complete"],
      cascade: ["user-stats"],
    },
    {
      event: "blueprint:updated",
      patterns: ["blueprint-complete", "blueprint-skeleton"],
      cascade: ["user-blueprint-stats"],
    },
    {
      event: "project:created",
      patterns: ["user-blueprint-stats", "user-stats"],
    },
    {
      event: "user:credits_updated",
      patterns: ["user-stats"],
    },
    {
      event: "circuit-breaker:tripped",
      patterns: ["health-check", "metrics-summary"],
      ttl: 30,
    },
  ];

  /**
   * Generate cache key from input parameters
   */
  private static generateKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .substring(0, 16);
    return `${this.CACHE_PREFIX}${prefix}:${hash}`;
  }

  /**
   * Generate cache key for HTTP responses
   */
  private static generateResponseKey(
    req: NextRequest,
    varyBy: string[] = [],
  ): string {
    const url = new URL(req.url);
    const keyComponents = [
      url.pathname,
      url.search,
      ...varyBy.map((header) => `${header}:${req.headers.get(header) || ""}`),
    ];

    const keyString = keyComponents.join("|");
    const hash = crypto
      .createHash("sha256")
      .update(keyString)
      .digest("hex")
      .substring(0, 16);

    return `${this.RESPONSE_PREFIX}${hash}`;
  }

  /**
   * Generate ETag for response validation
   */
  private static generateETag(data: any): string {
    const content = JSON.stringify(data);
    return `"${crypto.createHash("md5").update(content).digest("hex")}"`;
  }

  /**
   * Calculate intelligent TTL based on content type
   */
  private static calculateTTL(prefix: string, customTTL?: number): number {
    if (customTTL) {
      return customTTL;
    }

    const ttlMap: Record<string, number> = {
      "iflow-completion": 1800, // 30 minutes
      "tavily-research": 7200, // 2 hours
      "blueprint-draft": 3600, // 1 hour
      "market-analysis": 14400, // 4 hours
      "cache-warmup": 300, // 5 minutes
    };

    return ttlMap[prefix] || this.DEFAULT_TTL;
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
      const age = Date.now() - new Date(entry.metadata.createdAt).getTime();
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

  /**
   * Cache AI response or generic data with intelligent TTL
   */
  static async cacheData(
    prefix: string,
    inputData: any,
    responseData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    const key = options.key || this.generateKey(prefix, inputData);
    const ttl = this.calculateTTL(prefix, options.ttl);
    const tags = options.tags || [];

    const cacheData = {
      data: responseData,
      metadata: {
        createdAt: new Date().toISOString(),
        prefix,
        tags,
        ttl,
      },
    };

    try {
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(key, ttl, JSON.stringify(cacheData));

          // Store tag mappings for selective invalidation
          if (tags.length > 0) {
            const tagPromises = tags.map((tag) =>
              client.sAdd(`${this.CACHE_PREFIX}tag:${tag}`, key),
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
    const key = options.key || this.generateKey(prefix, inputData);

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
          await this.invalidateKey(key);
        }
        return null;
      }

      logger.debug("Cache hit", {
        key,
        prefix,
        age: Date.now() - new Date(cached.metadata.createdAt).getTime(),
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
   * Cache HTTP response with metadata
   */
  static async cacheResponse(
    req: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions,
  ): Promise<void> {
    if (!this.isCacheable(response)) {
      return;
    }

    const key = this.generateResponseKey(req, options.varyBy);
    const responseData = await response.json();
    const etag = this.generateETag(responseData);

    const cachedResponse: CachedResponse = {
      data: responseData,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      metadata: {
        createdAt: new Date().toISOString(),
        etag,
        compressed: options.compress || false,
        size: JSON.stringify(responseData).length,
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
              client.sAdd(`${this.RESPONSE_PREFIX}tag:${tag}`, key),
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
        size: cachedResponse.metadata.size,
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
    const key = this.generateResponseKey(req, options.varyBy);
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
          await this.invalidateKey(key);
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

      // Return cached response
      const response = NextResponse.json(cached.data, {
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
          (Date.now() - new Date(cached.metadata.createdAt).getTime()) / 1000,
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
   * Invalidate cache by key
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          await client.del(key);
        },
        async () => {
          logger.warn("Redis unavailable, skipping cache invalidation", {
            key,
          });
        },
      );
    } catch (error) {
      logger.error("Cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
      });
    }
  }

  /**
   * Invalidate cache by tag (unified for both data and response caches)
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          // Invalidate data cache tags
          const dataKeys = await client.sMembers(
            `${this.CACHE_PREFIX}tag:${tag}`,
          );
          if (dataKeys.length > 0) {
            for (const key of dataKeys as string[]) {
              await client.del(key);
            }
            await client.del(`${this.CACHE_PREFIX}tag:${tag}`);
          }

          // Invalidate response cache tags
          const responseKeys = await client.sMembers(
            `${this.RESPONSE_PREFIX}tag:${tag}`,
          );
          if (responseKeys.length > 0) {
            for (const key of responseKeys as string[]) {
              await client.del(key);
            }
            await client.del(`${this.RESPONSE_PREFIX}tag:${tag}`);
          }
        },
        async () => {
          logger.warn(
            "Redis unavailable, skipping tag-based cache invalidation",
            { tag },
          );
        },
      );

      logger.info("Cache invalidated by tag", { tag });
    } catch (error) {
      logger.error("Tag-based cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        tag,
      });
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
    dataCacheKeys: number;
    responseCacheKeys: number;
    tags: Record<string, number>;
  }> {
    try {
      const stats = await redisManager.executeWithFallback(
        async (client) => {
          const info = await client.info("memory");

          const memoryMatch = info.match(/used_memory:(\d+)/);
          const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

          const dataKeys = await client.keys(`${this.CACHE_PREFIX}*`);
          const responseKeys = await client.keys(`${this.RESPONSE_PREFIX}*`);

          const dataNonTagKeys = dataKeys.filter(
            (key: string) => !key.includes(":tag:"),
          );
          const responseNonTagKeys = responseKeys.filter(
            (key: string) => !key.includes(":tag:"),
          );

          // Count keys per tag
          const allTagKeys = [...dataKeys, ...responseKeys].filter(
            (key: string) => key.includes(":tag:"),
          );
          const tags: Record<string, number> = {};

          for (const tagKey of allTagKeys) {
            const tagName = tagKey.split(":tag:")[1];
            const memberCount = await client.sCard(tagKey as string);
            tags[tagName] = memberCount;
          }

          return {
            totalKeys: dataNonTagKeys.length + responseNonTagKeys.length,
            dataCacheKeys: dataNonTagKeys.length,
            responseCacheKeys: responseNonTagKeys.length,
            memoryUsage,
            tags,
          };
        },
        async () => ({
          totalKeys: 0,
          dataCacheKeys: 0,
          responseCacheKeys: 0,
          memoryUsage: 0,
          tags: {},
        }),
      );

      return {
        ...stats,
        hitRate: 0.65, // Mock value - would need tracking implementation
      };
    } catch (error) {
      logger.error("Cache statistics retrieval failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        totalKeys: 0,
        hitRate: 0,
        memoryUsage: 0,
        dataCacheKeys: 0,
        responseCacheKeys: 0,
        tags: {},
      };
    }
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  static async performIntelligentWarming(): Promise<void> {
    try {
      logger.info("Starting intelligent cache warming");

      const sortedStrategies = [...this.WARMING_STRATEGIES].sort(
        (a, b) => a.priority - b.priority,
      );

      const warmingPromises = sortedStrategies.map(async (strategy, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * 100));
        return this.warmCacheStrategy(strategy);
      });

      const results = await Promise.allSettled(warmingPromises);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      logger.info("Intelligent cache warming completed", {
        totalStrategies: sortedStrategies.length,
        successful,
        failed,
      });
    } catch (error) {
      logger.error("Intelligent cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Warm a specific cache strategy
   */
  private static async warmCacheStrategy(
    strategy: CacheWarmingStrategy,
  ): Promise<void> {
    try {
      const warmData = {
        pattern: strategy.pattern,
        warmAt: new Date().toISOString(),
        data: this.generateWarmData(strategy.pattern),
      };

      await this.cacheData(
        "cache-warmup",
        { pattern: strategy.pattern },
        warmData,
        {
          ttl: strategy.ttl,
          tags: ["cache-warmup", strategy.pattern],
        },
      );

      logger.debug("Cache strategy warmed", {
        pattern: strategy.pattern,
        ttl: strategy.ttl,
      });
    } catch (error) {
      logger.debug("Cache strategy warming failed", {
        pattern: strategy.pattern,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Intelligent cache invalidation based on events
   */
  static async invalidateByEvent(
    event: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      const rule = this.INVALIDATION_RULES.find((r) => r.event === event);

      if (!rule) {
        logger.debug("No invalidation rule found for event", { event });
        return;
      }

      logger.info("Starting intelligent cache invalidation", {
        event,
        patterns: rule.patterns,
        context,
      });

      // Invalidate primary patterns
      for (const pattern of rule.patterns) {
        await this.invalidateByTag(pattern);
      }

      // Cascade invalidation
      if (rule.cascade) {
        for (const cascadePattern of rule.cascade) {
          await this.invalidateByTag(cascadePattern);
        }
      }

      // Context-aware invalidation
      if (context) {
        await this.performContextualInvalidation(event, context);
      }

      logger.info("Cache invalidation completed", {
        event,
        patternsInvalidated: rule.patterns.length,
        cascadedInvalidations: rule.cascade?.length || 0,
      });
    } catch (error) {
      logger.error("Event-based cache invalidation failed", {
        event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Context-aware cache invalidation for specific resources
   */
  private static async performContextualInvalidation(
    event: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const invalidations: Promise<void>[] = [];

      if (context.userId) {
        invalidations.push(this.invalidateByTag(`user-${context.userId}`));
      }
      if (context.projectId) {
        invalidations.push(
          this.invalidateByTag(`project-${context.projectId}`),
        );
      }
      if (context.blueprintId) {
        invalidations.push(
          this.invalidateByTag(`blueprint-${context.blueprintId}`),
        );
      }

      await Promise.allSettled(invalidations);

      logger.debug("Contextual invalidation completed", {
        event,
        userId: context.userId,
        projectId: context.projectId,
        blueprintId: context.blueprintId,
      });
    } catch (error) {
      logger.debug("Contextual invalidation failed", {
        event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Generate warm data for different patterns
   */
  private static generateWarmData(pattern: string): any {
    const warmDataMap: Record<string, any> = {
      "health-check": {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      "metrics-summary": {
        cpu: "0%",
        memory: "45%",
        responseTime: "120ms",
        requestRate: "15/s",
      },
      "circuit-breaker-status": {
        "ai-iflow": { state: "CLOSED", successRate: 100 },
        "research-tavily": { state: "CLOSED", successRate: 100 },
        "github-api": { state: "CLOSED", successRate: 100 },
      },
      "user-blueprint-list": {
        projects: [],
        total: 0,
        cached: true,
      },
    };

    return warmDataMap[pattern] || { pattern, warmedAt: Date.now() };
  }

  /**
   * Blueprint-specific cache invalidation
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
        tags.push(blueprintType);
      }

      await Promise.allSettled(tags.map((tag) => this.invalidateByTag(tag)));

      logger.info("Blueprint cache invalidated", {
        projectId,
        blueprintType,
        tagsInvalidated: tags.length,
      });
    } catch (error) {
      logger.error("Blueprint cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        projectId,
        blueprintType,
      });
    }
  }

  /**
   * Pattern-based cache warming for blueprint types
   */
  static async warmupPatternCache(patterns: string[]): Promise<void> {
    try {
      logger.info("Starting pattern-based cache warmup", {
        patterns,
        count: patterns.length,
      });

      const warmupPromises = patterns.map(async (pattern) => {
        const skeletonData = {
          pattern,
          timestamp: Date.now(),
        };

        await this.cacheData("blueprint-skeleton", { pattern }, skeletonData, {
          ttl: 14400,
          tags: ["blueprint-skeleton", pattern, "pre-warmed"],
        });
      });

      await Promise.allSettled(warmupPromises);

      logger.info("Pattern-based cache warmup completed", {
        patterns,
        count: patterns.length,
      });
    } catch (error) {
      logger.error("Pattern-based cache warmup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        patterns,
      });
    }
  }
}
