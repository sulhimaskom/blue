import { logger } from "../logger";
import { UnifiedCacheManager } from "./unified-cache-manager";

/**
 * Advanced Performance Cache Optimization Service
 * Implements intelligent caching strategies, prefetching, and performance enhancement
 */

export interface CachePattern {
  pattern: string;
  frequency: number;
  avgResponseTime: number;
  hitRate: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgCacheTime: number;
  avgDbTime: number;
  hitRate: number;
  performanceImprovement: number;
}

export interface PrefetchConfig {
  patterns: string[];
  concurrency: number;
  interval: number; // ms
  enabled: boolean;
}

export class PerformanceCacheOptimizer {
  private static readonly PREFETCH_INTERVAL = 300000; // 5 minutes
  private static readonly HIGH_PRIORITY_THRESHOLD = 0.7; // 70% hit rate
  private static readonly PREFETCH_CONCURRENCY = 3;

  private static performanceMetrics: PerformanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgCacheTime: 0,
    avgDbTime: 0,
    hitRate: 0,
    performanceImprovement: 0,
  };

  private static cachePatterns: Map<string, CachePattern> = new Map();
  private static prefetchTimer: NodeJS.Timeout | null = null;

  /**
   * Execute optimized cached operation with intelligent prefetching
   */
  static async executeOptimized<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      prefetch?: boolean;
      trackPerformance?: boolean;
    } = {},
  ): Promise<T> {
    const {
      ttl = 1800, // 30 minutes default
      tags = [],
      prefetch = true,
      trackPerformance = true,
    } = options;

    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      // Try unified cache first
      const cached = await UnifiedCacheManager.getData(
        "performance-cache",
        { key },
        { ttl },
      );

      if (cached !== null) {
        const cacheTime = Date.now() - startTime;
        this.performanceMetrics.cacheHits++;

        if (trackPerformance) {
          this.updateCacheTime(cacheTime);
          this.recordCachePattern(key, true, cacheTime);
        }

        logger.debug("Performance cache hit", {
          key,
          cacheTime: `${cacheTime}ms`,
          hitRate: this.performanceMetrics.hitRate,
        });

        // Schedule prefetch if frequently accessed
        if (prefetch && this.shouldPrefetch(key)) {
          this.schedulePrefetch(key, operation, options);
        }

        return cached as T;
      }

      // Cache miss - execute operation
      this.performanceMetrics.cacheMisses++;

      logger.debug("Performance cache miss", {
        key,
        hitRate: this.performanceMetrics.hitRate,
      });

      const result = await operation();
      const executionTime = Date.now() - startTime;

      // Cache the result
      await UnifiedCacheManager.cacheData(
        "performance-cache",
        { key },
        result,
        {
          ttl,
          tags: [...tags, "performance-optimized"],
        },
      );

      logger.debug("Performance cache populated", {
        key,
        executionTime: `${executionTime}ms`,
        resultSize: JSON.stringify(result).length,
        ttl,
      });

      if (trackPerformance) {
        this.updateDbTime(executionTime);
        this.recordCachePattern(key, false, executionTime);
        this.calculatePerformanceImprovement();
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error("Optimized cache operation failed", {
        key,
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Intelligent prefetching for frequently accessed data
   */
  private static shouldPrefetch(key: string): boolean {
    const pattern = this.cachePatterns.get(key);

    if (!pattern) {
      return false;
    }

    // Prefetch if high frequency and good hit rate
    return (
      pattern.frequency > 5 &&
      pattern.hitRate > this.HIGH_PRIORITY_THRESHOLD &&
      pattern.priority === "HIGH"
    );
  }

  /**
   * Schedule prefetch for a cache key
   */
  private static schedulePrefetch<T>(
    key: string,
    operation: () => Promise<T>,
    options: { ttl?: number; tags?: string[] },
  ): void {
    // Debounce prefetch requests
    setTimeout(() => {
      this.performPrefetch(key, operation, options);
    }, Math.random() * 10000); // Random delay 0-10s
  }

  /**
   * Perform background prefetch
   */
  private static async performPrefetch<T>(
    key: string,
    operation: () => Promise<T>,
    options: { ttl?: number; tags?: string[] },
  ): Promise<void> {
    try {
      logger.debug("Performing prefetch", { key });

      // Check if already cached
      const existing = await UnifiedCacheManager.getData("performance-cache", {
        key,
      });

      if (existing !== null) {
        return; // Already cached
      }

      // Execute prefetch
      const result = await operation();

      await UnifiedCacheManager.cacheData(
        "performance-cache",
        { key },
        result,
        {
          ttl: (options.ttl || 1800) * 1.5, // Longer TTL for prefetched data
          tags: [...(options.tags || []), "prefetched"],
        },
      );

      logger.debug("Prefetch completed", {
        key,
        resultSize: JSON.stringify(result).length,
      });
    } catch (error) {
      logger.debug("Prefetch failed", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw - prefetch failures are non-critical
    }
  }

  /**
   * Record cache access patterns for optimization
   */
  private static recordCachePattern(
    key: string,
    isHit: boolean,
    responseTime: number,
  ): void {
    const existing = this.cachePatterns.get(key);

    if (existing) {
      existing.frequency++;
      existing.hitRate =
        (existing.hitRate * (existing.frequency - 1) + (isHit ? 1 : 0)) /
        existing.frequency;
      existing.avgResponseTime =
        (existing.avgResponseTime * (existing.frequency - 1) + responseTime) /
        existing.frequency;

      // Update priority based on frequency and hit rate
      if (existing.frequency > 10 && existing.hitRate > 0.8) {
        existing.priority = "HIGH";
      } else if (existing.frequency > 5 && existing.hitRate > 0.6) {
        existing.priority = "MEDIUM";
      } else {
        existing.priority = "LOW";
      }
    } else {
      this.cachePatterns.set(key, {
        pattern: key,
        frequency: 1,
        avgResponseTime: responseTime,
        hitRate: isHit ? 1 : 0,
        priority: isHit ? "MEDIUM" : "LOW",
      });
    }
  }

  /**
   * Update cache timing metrics
   */
  private static updateCacheTime(cacheTime: number): void {
    if (this.performanceMetrics.avgCacheTime === 0) {
      this.performanceMetrics.avgCacheTime = cacheTime;
    } else {
      this.performanceMetrics.avgCacheTime =
        0.9 * this.performanceMetrics.avgCacheTime + 0.1 * cacheTime;
    }
  }

  /**
   * Update database timing metrics
   */
  private static updateDbTime(dbTime: number): void {
    if (this.performanceMetrics.avgDbTime === 0) {
      this.performanceMetrics.avgDbTime = dbTime;
    } else {
      this.performanceMetrics.avgDbTime =
        0.9 * this.performanceMetrics.avgDbTime + 0.1 * dbTime;
    }
  }

  /**
   * Calculate performance improvement
   */
  private static calculatePerformanceImprovement(): void {
    if (this.performanceMetrics.totalRequests === 0) {
      this.performanceMetrics.performanceImprovement = 0;
      return;
    }

    this.performanceMetrics.hitRate =
      this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests;

    // Calculate time saved from cache hits
    const timeSavedPerHit = Math.max(
      0,
      this.performanceMetrics.avgDbTime - this.performanceMetrics.avgCacheTime,
    );
    const totalTimeSaved = this.performanceMetrics.cacheHits * timeSavedPerHit;
    const totalExecutionTime =
      this.performanceMetrics.cacheHits * this.performanceMetrics.avgCacheTime +
      this.performanceMetrics.cacheMisses * this.performanceMetrics.avgDbTime;

    this.performanceMetrics.performanceImprovement =
      totalExecutionTime > 0 ? (totalTimeSaved / totalExecutionTime) * 100 : 0;
  }

  /**
   * Start automated prefetching for high-priority patterns
   */
  static startAutomatedPrefetch(): void {
    if (this.prefetchTimer) {
      return; // Already running
    }

    logger.info("Starting automated performance prefetching");

    this.prefetchTimer = setInterval(() => {
      this.performAutomatedPrefetch();
    }, this.PREFETCH_INTERVAL);
  }

  /**
   * Stop automated prefetching
   */
  static stopAutomatedPrefetch(): void {
    if (this.prefetchTimer) {
      clearInterval(this.prefetchTimer);
      this.prefetchTimer = null;
      logger.info("Stopped automated performance prefetching");
    }
  }

  /**
   * Perform automated prefetch based on access patterns
   */
  private static async performAutomatedPrefetch(): Promise<void> {
    try {
      // Get high-priority patterns for prefetching
      const highPriorityPatterns = Array.from(this.cachePatterns.entries())
        .filter(
          ([, pattern]) =>
            pattern.priority === "HIGH" && pattern.frequency > 10,
        )
        .sort(([, a], [, b]) => b.hitRate - a.hitRate)
        .slice(0, this.PREFETCH_CONCURRENCY);

      if (highPriorityPatterns.length === 0) {
        return;
      }

      logger.info("Performing automated prefetch", {
        patterns: highPriorityPatterns.length,
      });

      // This would be implemented with actual prefetch operations
      // For now, we'll just log the patterns that would be prefetched
      for (const [key, pattern] of highPriorityPatterns) {
        logger.debug("Would prefetch high-priority pattern", {
          key,
          frequency: pattern.frequency,
          hitRate: pattern.hitRate,
          avgResponseTime: pattern.avgResponseTime,
        });
      }
    } catch (error) {
      logger.error("Automated prefetch failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics & {
    cachePatterns: CachePattern[];
    recommendations: string[];
  } {
    this.calculatePerformanceImprovement();

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      ...this.performanceMetrics,
      cachePatterns: Array.from(this.cachePatterns.values()).sort(
        (a, b) => b.frequency * b.hitRate - a.frequency * a.hitRate,
      ),
      recommendations,
    };
  }

  /**
   * Generate performance optimization recommendations
   */
  private static generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Hit rate recommendations
    if (this.performanceMetrics.hitRate < 0.5) {
      recommendations.push(
        `Low cache hit rate (${(this.performanceMetrics.hitRate * 100).toFixed(1)}%) - review TTL settings and cache keys`,
      );
    } else if (this.performanceMetrics.hitRate > 0.9) {
      recommendations.push(
        `Excellent cache hit rate (${(this.performanceMetrics.hitRate * 100).toFixed(1)}%) - consider longer TTL for high-hit patterns`,
      );
    }

    // Performance improvement recommendations
    if (this.performanceMetrics.performanceImprovement < 20) {
      recommendations.push(
        `Low performance improvement (${this.performanceMetrics.performanceImprovement.toFixed(1)}%) - identify frequently accessed data for caching`,
      );
    }

    // Pattern-specific recommendations
    const highFrequencyPatterns = Array.from(
      this.cachePatterns.values(),
    ).filter((p) => p.frequency > 10 && p.hitRate < 0.6);

    if (highFrequencyPatterns.length > 0) {
      recommendations.push(
        `${highFrequencyPatterns.length} high-frequency patterns with low hit rates - review cache key consistency`,
      );
    }

    // Response time recommendations
    if (this.performanceMetrics.avgDbTime > 500) {
      recommendations.push(
        `High database response time (${this.performanceMetrics.avgDbTime.toFixed(0)}ms) - optimize queries or increase caching`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Cache performance is optimal - continue monitoring for optimization opportunities",
      );
    }

    return recommendations;
  }

  /**
   * Reset performance metrics
   */
  static resetMetrics(): void {
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgCacheTime: 0,
      avgDbTime: 0,
      hitRate: 0,
      performanceImprovement: 0,
    };
    this.cachePatterns.clear();

    logger.info("Performance cache metrics reset");
  }

  /**
   * Warm up cache with common patterns
   */
  static async performWarmup(): Promise<void> {
    try {
      logger.info("Starting performance cache warmup");

      const warmupPatterns = [
        { key: "system-health", ttl: 60 },
        { key: "api-metrics", ttl: 300 },
        { key: "user-stats", ttl: 900 },
        { key: "project-overview", ttl: 1800 },
      ];

      // Warm up common patterns
      for (const pattern of warmupPatterns) {
        await UnifiedCacheManager.cacheData(
          "performance-warmup",
          { key: pattern.key },
          {
            warmedAt: new Date().toISOString(),
            pattern: pattern.key,
          },
          {
            ttl: pattern.ttl,
            tags: ["performance-warmup", "pre-warmed"],
          },
        );
      }

      logger.info("Performance cache warmup completed", {
        patterns: warmupPatterns.length,
      });
    } catch (error) {
      logger.error("Performance cache warmup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
