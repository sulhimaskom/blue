import { logger } from "../logger";
import { UnifiedCacheManager } from "./unified-cache-manager";
import { redisManager } from "../redis";
import crypto from "crypto";

export interface DatabaseCacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  key?: string; // Custom cache key
}

export interface QueryCacheStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgQueryTime: number;
  avgCacheTime: number;
  costSavings: number;
}

/**
 * Enhanced database query result caching service
 * Implements intelligent caching for expensive database operations
 */
export class DatabaseQueryCache {
  private static readonly DEFAULT_TTL = 1800; // 30 minutes
  private static readonly CACHE_PREFIX = "db-query:";

  /**
   * Track query performance statistics
   */
  private static queryStats: QueryCacheStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    avgQueryTime: 0,
    avgCacheTime: 0,
    costSavings: 0,
  };

  /**
   * Generate cache key for database queries
   */
  private static generateQueryKey(
    queryType: string,
    parameters: Record<string, any>,
    options?: DatabaseCacheOptions,
  ): string {
    // Normalize parameters for consistent cache keys
    const normalizedParams = this.normalizeParameters(parameters);

    // Create parameter hash
    const paramString = JSON.stringify(normalizedParams);
    const paramHash = crypto
      .createHash("sha256")
      .update(paramString)
      .digest("hex")
      .substring(0, 12);

    // Build cache key
    const cacheKey =
      options?.key || `${this.CACHE_PREFIX}${queryType}:${paramHash}`;

    return cacheKey;
  }

  /**
   * Normalize query parameters for better cache hits
   */
  private static normalizeParameters(
    parameters: Record<string, any>,
  ): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      // Normalize common patterns
      if (typeof value === "string") {
        // Normalize string trimming and case for better cache hits
        normalized[key] = value.trim();
      } else if (Array.isArray(value)) {
        // Sort arrays for consistent ordering
        normalized[key] = [...value].sort();
      } else if (typeof value === "object" && value !== null) {
        // Recursively normalize nested objects
        normalized[key] = this.normalizeParameters(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Calculate intelligent TTL based on query type and system performance
   */
  private static calculateTTL(queryType: string, customTTL?: number): number {
    if (customTTL) {
      return customTTL;
    }

    // Query-specific TTL optimization
    const ttlMap: Record<string, number> = {
      "user-blueprints": 600, // 10 minutes - user-specific data updates frequently
      "project-stats": 1800, // 30 minutes - project data moderately stable
      "blueprint-complete": 3600, // 1 hour - completed blueprints rarely change
      "user-stats": 900, // 15 minutes - user statistics change frequently
      "market-research": 7200, // 2 hours - research data stable
      "admin-metrics": 300, // 5 minutes - admin data updates frequently
      "system-health": 60, // 1 minute - health data time-sensitive
    };

    // Dynamic TTL adjustment based on system load
    const baseTTL = ttlMap[queryType] || this.DEFAULT_TTL;

    try {
      const redisMetrics = redisManager.getPerformanceMetrics();
      const errorRate = redisMetrics.operationMetrics.errorRate;

      // Adjust TTL based on Redis performance
      if (errorRate > 0.05) {
        // Reduce TTL during high error rates
        return Math.max(baseTTL * 0.7, 60);
      }

      return baseTTL;
    } catch (error) {
      // Fall back to base TTL if metrics unavailable
      return baseTTL;
    }
  }

  /**
   * Execute database query with intelligent caching
   */
  static async executeCachedQuery<T>(
    queryType: string,
    queryFn: () => Promise<T>,
    parameters: Record<string, any> = {},
    options: DatabaseCacheOptions = {},
  ): Promise<T> {
    const startTime = Date.now();
    this.queryStats.totalQueries++;

    const cacheKey = this.generateQueryKey(queryType, parameters, options);
    const ttl = this.calculateTTL(queryType, options.ttl);

    try {
      // Try to get from cache first
      const cached = await UnifiedCacheManager.getData(
        "database-query",
        { queryType, parameters },
        { key: cacheKey, ttl },
      );

      if (cached) {
        const cacheTime = Date.now() - startTime;
        this.queryStats.cacheHits++;
        this.updateCacheTime(cacheTime);

        logger.debug("Database query cache hit", {
          queryType,
          cacheKey,
          cacheTime,
          hitRate: this.queryStats.hitRate,
        });

        return cached as T;
      }

      // Cache miss - execute query
      this.queryStats.cacheMisses++;

      logger.debug("Database query cache miss", {
        queryType,
        cacheKey,
        hitRate: this.queryStats.hitRate,
      });

      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      // Update query time metrics
      this.updateQueryTime(queryTime);

      // Cache the result
      await UnifiedCacheManager.cacheData(
        "database-query",
        { queryType, parameters },
        result,
        {
          key: cacheKey,
          ttl,
          tags: options.tags || [`query-type:${queryType}`, "database-cache"],
        },
      );

      logger.debug("Database query result cached", {
        queryType,
        cacheKey,
        queryTime,
        resultSize: JSON.stringify(result).length,
        ttl,
      });

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      logger.error("Cached database query failed", {
        queryType,
        cacheKey,
        queryTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Cache user blueprint statistics
   */
  static async cacheUserBlueprintStats(
    userId: number,
    stats: {
      totalProjects: number;
      totalBlueprints: number;
      completedBlueprints: number;
      draftBlueprints: number;
      lastActivity: string | null;
    },
  ): Promise<void> {
    const cacheKey = this.generateQueryKey("user-blueprints", { userId });
    const ttl = this.calculateTTL("user-blueprints");

    await UnifiedCacheManager.cacheData(
      "database-query",
      { queryType: "user-blueprints", userId },
      stats,
      {
        key: cacheKey,
        ttl,
        tags: [`user-${userId}`, "user-stats", "blueprint-stats"],
      },
    );

    logger.debug("User blueprint stats cached", {
      userId,
      totalProjects: stats.totalProjects,
      totalBlueprints: stats.totalBlueprints,
      ttl,
    });
  }

  /**
   * Get cached user blueprint statistics
   */
  static async getCachedUserBlueprintStats(userId: number): Promise<{
    totalProjects: number;
    totalBlueprints: number;
    completedBlueprints: number;
    draftBlueprints: number;
    lastActivity: string | null;
  } | null> {
    return await UnifiedCacheManager.getData("database-query", {
      queryType: "user-blueprints",
      userId,
    });
  }

  /**
   * Cache completed blueprint data
   */
  static async cacheCompletedBlueprint(
    blueprintId: string,
    blueprintData: any,
  ): Promise<void> {
    const cacheKey = this.generateQueryKey("blueprint-complete", {
      blueprintId,
    });
    const ttl = this.calculateTTL("blueprint-complete");

    await UnifiedCacheManager.cacheData(
      "database-query",
      { queryType: "blueprint-complete", blueprintId },
      blueprintData,
      {
        key: cacheKey,
        ttl,
        tags: [
          `blueprint-${blueprintId}`,
          "completed-blueprint",
          "blueprint-stats",
        ],
      },
    );

    logger.debug("Completed blueprint cached", {
      blueprintId,
      ttl,
      dataSize: JSON.stringify(blueprintData).length,
    });
  }

  /**
   * Get cached completed blueprint
   */
  static async getCachedCompletedBlueprint(
    blueprintId: string,
  ): Promise<any | null> {
    return await UnifiedCacheManager.getData("database-query", {
      queryType: "blueprint-complete",
      blueprintId,
    });
  }

  /**
   * Cache project statistics
   */
  static async cacheProjectStats(
    projectId: string,
    stats: {
      blueprintCount: number;
      lastUpdated: string;
      status: string;
      owner: {
        id: number;
        clerkId: string;
        email: string;
      };
    },
  ): Promise<void> {
    const cacheKey = this.generateQueryKey("project-stats", { projectId });
    const ttl = this.calculateTTL("project-stats");

    await UnifiedCacheManager.cacheData(
      "database-query",
      { queryType: "project-stats", projectId },
      stats,
      {
        key: cacheKey,
        ttl,
        tags: [`project-${projectId}`, "project-stats", "database-cache"],
      },
    );

    logger.debug("Project stats cached", {
      projectId,
      blueprintCount: stats.blueprintCount,
      status: stats.status,
      ttl,
    });
  }

  /**
   * Get cached project statistics
   */
  static async getCachedProjectStats(projectId: string): Promise<{
    blueprintCount: number;
    lastUpdated: string;
    status: string;
    owner: {
      id: number;
      clerkId: string;
      email: string;
    };
  } | null> {
    return await UnifiedCacheManager.getData("database-query", {
      queryType: "project-stats",
      projectId,
    });
  }

  /**
   * Invalidate cache by user
   */
  static async invalidateUserCache(userId: number): Promise<void> {
    await UnifiedCacheManager.invalidateByTag(`user-${userId}`);

    logger.info("User cache invalidated", {
      userId,
    });
  }

  /**
   * Invalidate cache by project
   */
  static async invalidateProjectCache(projectId: string): Promise<void> {
    await UnifiedCacheManager.invalidateByTag(`project-${projectId}`);

    logger.info("Project cache invalidated", {
      projectId,
    });
  }

  /**
   * Invalidate cache by blueprint
   */
  static async invalidateBlueprintCache(blueprintId: string): Promise<void> {
    await UnifiedCacheManager.invalidateByTag(`blueprint-${blueprintId}`);

    logger.info("Blueprint cache invalidated", {
      blueprintId,
    });
  }

  /**
   * Invalidate all database query cache
   */
  static async invalidateAllDatabaseCache(): Promise<void> {
    await UnifiedCacheManager.invalidateByTag("database-cache");

    logger.info("All database cache invalidated");
  }

  /**
   * Get comprehensive cache statistics
   */
  static getCacheStats(): QueryCacheStats {
    // Update hit rate
    this.queryStats.hitRate =
      this.queryStats.totalQueries > 0
        ? this.queryStats.cacheHits / this.queryStats.totalQueries
        : 0;

    return { ...this.queryStats };
  }

  /**
   * Update average query time
   */
  private static updateQueryTime(queryTime: number): void {
    if (this.queryStats.avgQueryTime === 0) {
      this.queryStats.avgQueryTime = queryTime;
    } else {
      // Exponential moving average with alpha = 0.1
      this.queryStats.avgQueryTime =
        0.9 * this.queryStats.avgQueryTime + 0.1 * queryTime;
    }
  }

  /**
   * Update average cache time
   */
  private static updateCacheTime(cacheTime: number): void {
    if (this.queryStats.avgCacheTime === 0) {
      this.queryStats.avgCacheTime = cacheTime;
    } else {
      // Exponential moving average with alpha = 0.1
      this.queryStats.avgCacheTime =
        0.9 * this.queryStats.avgCacheTime + 0.1 * cacheTime;
    }
  }

  /**
   * Reset cache statistics
   */
  static resetStats(): void {
    this.queryStats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgQueryTime: 0,
      avgCacheTime: 0,
      costSavings: 0,
    };

    logger.info("Database query cache statistics reset");
  }

  /**
   * Estimate cost savings from caching
   */
  static calculateCostSavings(): {
    databaseSavings: number;
    performanceImprovement: number;
    estimatedMonthlySavings: number;
  } {
    const avgDatabaseQueryTime = 45; // ms based on typical database performance
    const avgCacheTime = this.queryStats.avgCacheTime || 2; // ms
    const timeSavingsPerQuery = avgDatabaseQueryTime - avgCacheTime;
    const totalSavedTime = this.queryStats.cacheHits * timeSavingsPerQuery;

    // Cost calculation based on database compute time (approximate)
    const databaseCostPerMs = 0.000001; // $0.001 per second
    const databaseSavings = totalSavedTime * databaseCostPerMs;

    // Performance improvement
    const performanceImprovement =
      this.queryStats.hitRate * timeSavingsPerQuery;

    // Estimate monthly savings based on current hit rate
    const queriesPerHour = this.queryStats.totalQueries / 24; // Assuming 24h period
    const monthlyQueries = queriesPerHour * 24 * 30;
    const estimatedMonthlyCacheHits = monthlyQueries * this.queryStats.hitRate;
    const estimatedMonthlySavings =
      estimatedMonthlyCacheHits * timeSavingsPerQuery * databaseCostPerMs;

    return {
      databaseSavings,
      performanceImprovement,
      estimatedMonthlySavings,
    };
  }

  /**
   * Warm up cache with common data patterns
   */
  static async performWarmup(): Promise<void> {
    try {
      logger.info("Starting database query cache warmup");

      // Warm up user statistics for active users
      // This would be implemented based on actual user activity patterns
      const warmupPatterns = [
        { queryType: "user-stats", patterns: ["admin", "active"] },
        { queryType: "project-stats", patterns: ["recent", "active"] },
        {
          queryType: "blueprint-complete",
          patterns: ["ecommerce", "marketplace"],
        },
      ];

      for (const pattern of warmupPatterns) {
        await UnifiedCacheManager.cacheData(
          "database-warmup",
          { queryType: pattern.queryType, pattern: pattern.patterns },
          {
            warmedAt: new Date().toISOString(),
            queryType: pattern.queryType,
            patterns: pattern.patterns,
          },
          {
            ttl: 1800,
            tags: ["database-warmup", pattern.queryType, "pre-warmed"],
          },
        );
      }

      logger.info("Database query cache warmup completed", {
        patternsWarmed: warmupPatterns.length,
      });
    } catch (error) {
      logger.error("Database query cache warmup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default DatabaseQueryCache;
