import { redisManager } from "../../redis";
import { logger } from "../../logger";

/**
 * Interface for cache statistics
 */
export interface CacheStatistics {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  patternCounts: Record<string, number>;
  topPatterns: Array<{ pattern: string; count: number }>;
  lastUpdated: string;
}

/**
 * Service for cache statistics and monitoring
 */
export class CacheStatisticsService {
  private static readonly CACHE_PREFIX = "ai-platform:";

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats(): Promise<CacheStatistics> {
    try {
      const startTime = Date.now();

      // Get basic stats
      const [totalKeys, hitRate] = await Promise.all([
        this.getTotalKeyCount(),
        this.getHitRate(),
      ]);

      // Get pattern counts
      const patternCounts = await this.getPatternCounts();

      // Get top patterns
      const topPatterns = this.getTopPatterns(patternCounts, 10);

      // Get memory usage
      const memoryUsage = await this.getMemoryUsage();

      const stats: CacheStatistics = {
        totalKeys,
        hitRate,
        missRate: 1 - hitRate,
        memoryUsage,
        patternCounts,
        topPatterns,
        lastUpdated: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.debug("Cache statistics retrieved", {
        totalKeys,
        hitRate: (hitRate * 100).toFixed(1) + "%",
        memoryUsage: (memoryUsage / 1024 / 1024).toFixed(2) + "MB",
        duration,
      });

      return stats;
    } catch (error) {
      logger.error("Failed to get cache statistics", {
        error: error instanceof Error ? error.message : error,
      });

      return this.getDefaultStats();
    }
  }

  /**
   * Get count for specific pattern
   */
  static async getPatternCount(pattern: string): Promise<number> {
    try {
      const searchPattern = pattern.startsWith(this.CACHE_PREFIX)
        ? pattern
        : `${this.CACHE_PREFIX}${pattern}*`;

      const keys = await redisManager.executeWithFallback(
        async (client) => await client.keys(searchPattern),
        async () => [] as string[],
      );

      return keys.length;
    } catch (error) {
      logger.error("Failed to get pattern count", {
        pattern,
        error: error instanceof Error ? error.message : error,
      });

      return 0;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(): Promise<{
    avgResponseTime: number;
    totalOperations: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  }> {
    try {
      const metrics = await redisManager.executeWithFallback(
        async (client) => {
          const [avgTime, totalOps, successOps] = await Promise.all([
            client.get("ai-platform:metrics:avg_response_time"),
            client.get("ai-platform:metrics:total_operations"),
            client.get("ai-platform:metrics:successful_operations"),
          ]);

          const total = parseInt(totalOps || "0");
          const successful = parseInt(successOps || "0");

          return {
            avgResponseTime: parseFloat(avgTime || "0"),
            totalOperations: total,
            successRate: total > 0 ? successful / total : 1,
            errorRate: total > 0 ? (total - successful) / total : 0,
            throughput: total, // Simplified throughput calculation
          };
        },
        async () => ({
          avgResponseTime: 0,
          totalOperations: 0,
          successRate: 1,
          errorRate: 0,
          throughput: 0,
        }),
      );

      return metrics;
    } catch (error) {
      logger.error("Failed to get performance metrics", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        avgResponseTime: 0,
        totalOperations: 0,
        successRate: 1,
        errorRate: 0,
        throughput: 0,
      };
    }
  }

  /**
   * Get cache health status
   */
  static async getCacheHealthStatus(): Promise<{
    status: "healthy" | "warning" | "critical";
    issues: string[];
    recommendations: string[];
    score: number;
  }> {
    try {
      const stats = await this.getCacheStats();
      const issues: string[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check hit rate
      if (stats.hitRate < 0.5) {
        issues.push("Low cache hit rate");
        recommendations.push("Increase cache warming frequency");
        score -= 20;
      } else if (stats.hitRate < 0.7) {
        issues.push("Moderate cache hit rate");
        recommendations.push("Optimize cache TTL values");
        score -= 10;
      }

      // Check memory usage
      if (stats.memoryUsage > 100 * 1024 * 1024) {
        // > 100MB
        issues.push("High memory usage");
        recommendations.push("Review cache TTL and eviction policies");
        score -= 15;
      }

      // Check total keys
      if (stats.totalKeys > 10000) {
        issues.push("High key count");
        recommendations.push("Consider cache key cleanup");
        score -= 10;
      }

      // Determine overall status
      let status: "healthy" | "warning" | "critical" = "healthy";
      if (score < 70) {
        status = "critical";
      } else if (score < 85) {
        status = "warning";
      }

      const healthStatus = {
        status,
        issues,
        recommendations,
        score,
      };

      logger.debug("Cache health status calculated", healthStatus);

      return healthStatus;
    } catch (error) {
      logger.error("Failed to get cache health status", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        status: "critical",
        issues: ["Unable to assess cache health"],
        recommendations: ["Check Redis connectivity"],
        score: 0,
      };
    }
  }

  /**
   * Get total number of keys in cache
   */
  private static async getTotalKeyCount(): Promise<number> {
    try {
      const keys = await redisManager.executeWithFallback(
        async (client) => await client.keys(`${this.CACHE_PREFIX}*`),
        async () => [] as string[],
      );
      return keys.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get current hit rate
   */
  private static async getHitRate(): Promise<number> {
    try {
      const hitRate = await redisManager.executeWithFallback(
        async (client) => {
          const rate = await client.get(`${this.CACHE_PREFIX}stats:hit_rate`);
          return rate ? parseFloat(rate) : 0.5;
        },
        async () => 0.5,
      );
      return hitRate;
    } catch {
      return 0.5;
    }
  }

  /**
   * Get counts by pattern
   */
  private static async getPatternCounts(): Promise<Record<string, number>> {
    try {
      const patterns = [
        "ai-response",
        "blueprint",
        "user-data",
        "metrics",
        "response",
        "health",
        "cache-",
        "warm:",
        "tags:",
      ];

      const counts: Record<string, number> = {};

      for (const pattern of patterns) {
        counts[pattern] = await this.getPatternCount(pattern);
      }

      return counts;
    } catch (error) {
      logger.error("Failed to get pattern counts", {
        error: error instanceof Error ? error.message : error,
      });

      return {};
    }
  }

  /**
   * Get top patterns by count
   */
  private static getTopPatterns(
    patternCounts: Record<string, number>,
    limit: number,
  ): Array<{ pattern: string; count: number }> {
    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Get memory usage estimate
   */
  private static async getMemoryUsage(): Promise<number> {
    try {
      const info = await redisManager.executeWithFallback(
        async (client) => await client.info("memory"),
        async () => "",
      );

      // Parse Redis memory info
      const lines = info.split("\r\n");
      for (const line of lines) {
        if (line.startsWith("used_memory:")) {
          const memory = parseInt(line.split(":")[1]);
          return memory || 0;
        }
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get default statistics when Redis is unavailable
   */
  private static getDefaultStats(): CacheStatistics {
    return {
      totalKeys: 0,
      hitRate: 0.5,
      missRate: 0.5,
      memoryUsage: 0,
      patternCounts: {},
      topPatterns: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update cache statistics
   */
  static async updateStats(operation: {
    type: "hit" | "miss" | "set" | "delete";
    pattern?: string;
    responseTime?: number;
  }): Promise<void> {
    try {
      const statsKey = `${this.CACHE_PREFIX}stats`;

      await redisManager.executeWithFallback(
        async (client) => {
          // Update hit/miss counters
          if (operation.type === "hit") {
            await client.hIncrBy(statsKey, "hits", 1);
          } else if (operation.type === "miss") {
            await client.hIncrBy(statsKey, "misses", 1);
          }

          // Update hit rate
          const hits = await client.hGet(statsKey, "hits");
          const misses = await client.hGet(statsKey, "misses");
          const hitRate =
            parseInt(hits || "0") /
            (parseInt(hits || "0") + parseInt(misses || "0"));

          await client.set(`${statsKey}:hit_rate`, hitRate.toString());

          // Update pattern counters
          if (operation.pattern) {
            await client.hIncrBy(`${statsKey}:patterns`, operation.pattern, 1);
          }

          // Update response time metrics
          if (operation.responseTime) {
            const currentAvg = await client.get(
              `${statsKey}:avg_response_time`,
            );
            const newAvg = this.calculateNewAverage(
              currentAvg ? parseFloat(currentAvg) : 0,
              operation.responseTime,
            );
            await client.set(
              `${statsKey}:avg_response_time`,
              newAvg.toString(),
            );
          }
        },
        async () => {},
      );
    } catch (error) {
      logger.debug("Failed to update cache stats", {
        operation,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Calculate new running average
   */
  private static calculateNewAverage(
    currentAvg: number,
    newValue: number,
  ): number {
    const alpha = 0.1; // Smoothing factor
    return currentAvg * (1 - alpha) + newValue * alpha;
  }
}
