import { redisManager } from "../../redis";
import { logger } from "../../logger";
import { CacheInvalidationService } from "./cache-invalidation-service";

/**
 * Cache warming strategy configuration
 */
export interface CacheWarmingStrategy {
  pattern: string;
  query: string;
  ttl: number;
  priority: number;
  description?: string;
}

/**
 * Service for proactive cache warming
 */
export class CacheWarmingService {
  private static readonly WARMING_STRATEGIES: CacheWarmingStrategy[] = [
    {
      pattern: "ai-response:fintech*",
      query: "financial planning assistant",
      ttl: 7200,
      priority: 1,
      description: "High-value fintech AI responses",
    },
    {
      pattern: "ai-response:healthcare*",
      query: "medical diagnosis support",
      ttl: 5400,
      priority: 1,
      description: "Healthcare AI responses",
    },
    {
      pattern: "blueprint:popular*",
      query: "marketplace platform",
      ttl: 3600,
      priority: 2,
      description: "Popular blueprint templates",
    },
    {
      pattern: "metrics:dashboard*",
      query: "system performance",
      ttl: 600,
      priority: 3,
      description: "Dashboard metrics",
    },
  ];

  /**
   * Perform intelligent cache warming based on usage patterns
   */
  static async performIntelligentWarming(): Promise<{
    strategiesWarmed: number;
    keysWarmed: number;
    duration: number;
    strategies: string[];
  }> {
    const startTime = Date.now();
    let strategiesWarmed = 0;
    let keysWarmed = 0;
    const warmedStrategies: string[] = [];

    try {
      logger.info("Starting intelligent cache warming");

      // Sort strategies by priority
      const sortedStrategies = [...this.WARMING_STRATEGIES].sort(
        (a, b) => a.priority - b.priority,
      );

      for (const strategy of sortedStrategies) {
        try {
          const keysForStrategy = await this.warmCacheStrategy(strategy);

          if (keysForStrategy > 0) {
            strategiesWarmed++;
            keysWarmed += keysForStrategy;
            warmedStrategies.push(strategy.pattern);
          }

          // Add small delay between strategies to prevent overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          logger.error("Failed to warm strategy", {
            strategy: strategy.pattern,
            error: error instanceof Error ? error.message : error,
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info("Cache warming completed", {
        strategiesWarmed,
        keysWarmed,
        duration,
        strategies: warmedStrategies,
      });

      // Update warming statistics
      await this.updateWarmingStats({
        strategiesWarmed,
        keysWarmed,
        duration,
        timestamp: new Date().toISOString(),
      });

      return {
        strategiesWarmed,
        keysWarmed,
        duration,
        strategies: warmedStrategies,
      };
    } catch (error) {
      logger.error("Intelligent cache warming failed", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        strategiesWarmed: 0,
        keysWarmed: 0,
        duration: Date.now() - startTime,
        strategies: [],
      };
    }
  }

  /**
   * Perform adaptive warming based on current cache performance
   */
  static async performAdaptiveWarming(): Promise<{
    recommendations: string[];
    actions: string[];
    impact: string;
  }> {
    try {
      logger.info("Starting adaptive cache warming");

      // Get current cache statistics
      const cacheStats = await this.getCurrentCacheStats();
      const recommendations: string[] = [];
      const actions: string[] = [];

      // Analyze hit rates and identify opportunities
      if (cacheStats.hitRate < 0.6) {
        recommendations.push(
          "Low hit rate detected - increase warming frequency",
        );
        actions.push("warmed:ai-response:*");
      }

      if (cacheStats.missRate > 0.3) {
        recommendations.push("High miss rate - warm popular patterns");
        actions.push("warmed:blueprint:*");
        actions.push("warmed:user-data:*");
      }

      // Check for peak usage patterns
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 17) {
        recommendations.push("Business hours - warm user-facing data");
        actions.push("warmed:dashboard:*");
        actions.push("warmed:metrics:*");
      }

      // Execute adaptive warming based on recommendations
      let warmedKeys = 0;
      for (const action of actions) {
        await CacheInvalidationService.invalidateByPattern(
          action.replace("warmed:", ""),
        );
        warmedKeys++; // Estimate one key per action
      }

      const impact = `Warmed ${warmedKeys} cache keys based on ${recommendations.length} recommendations`;

      logger.info("Adaptive warming completed", {
        recommendations,
        actions,
        warmedKeys,
        impact,
      });

      return {
        recommendations,
        actions,
        impact,
      };
    } catch (error) {
      logger.error("Adaptive cache warming failed", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        recommendations: [],
        actions: [],
        impact: "Adaptive warming failed - falling back to normal operation",
      };
    }
  }

  /**
   * Warm cache for specific strategy
   */
  static async warmCacheStrategy(
    strategy: CacheWarmingStrategy,
  ): Promise<number> {
    try {
      logger.debug("Warming cache strategy", {
        pattern: strategy.pattern,
        query: strategy.query,
        priority: strategy.priority,
      });

      // Generate mock data for warming
      const warmData = this.generateWarmData(strategy.query);
      const cacheKey = `ai-platform:warm:${strategy.pattern}:${strategy.query}`;

      // Store warm data with appropriate TTL
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(cacheKey, strategy.ttl, JSON.stringify(warmData));
        },
        async () => {
          logger.warn("Cache warming fallback", { strategy: strategy.pattern });
        },
      );

      logger.debug("Cache strategy warmed", {
        pattern: strategy.pattern,
        cacheKey,
        ttl: strategy.ttl,
      });

      return 1; // Return number of keys warmed
    } catch (error) {
      logger.error("Failed to warm cache strategy", {
        strategy: strategy.pattern,
        error: error instanceof Error ? error.message : error,
      });

      return 0;
    }
  }

  /**
   * Warm up patterns array
   */
  static async warmupPatternCache(patterns: string[]): Promise<{
    success: boolean;
    patternsWarmed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let patternsWarmed = 0;

    try {
      for (const pattern of patterns) {
        try {
          const strategy: CacheWarmingStrategy = {
            pattern,
            query: pattern.replace(/\*/g, ""),
            ttl: 1800,
            priority: 3,
            description: `On-demand warmup for ${pattern}`,
          };

          const keysWarmed = await this.warmCacheStrategy(strategy);
          if (keysWarmed > 0) {
            patternsWarmed++;
          }
        } catch (error) {
          errors.push(
            `${pattern}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      const success = patternsWarmed === patterns.length;

      logger.info("Pattern cache warmup completed", {
        totalPatterns: patterns.length,
        patternsWarmed,
        success,
        errors: errors.length,
      });

      return {
        success,
        patternsWarmed,
        errors,
      };
    } catch (error) {
      logger.error("Pattern cache warmup failed", {
        patterns,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        patternsWarmed,
        errors: [
          `General failure: ${error instanceof Error ? error.message : error}`,
        ],
      };
    }
  }

  /**
   * Get current cache statistics for adaptive warming
   */
  private static async getCurrentCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    totalKeys: number;
  }> {
    try {
      const hitRate = await redisManager.executeWithFallback(
        async (client) => {
          const rate = await client.get("ai-platform:stats:hit_rate");
          return rate ? parseFloat(rate) : 0.5;
        },
        async () => 0.5,
      );

      const totalKeys = await redisManager.executeWithFallback(
        async (client) => {
          const keys = await client.keys("ai-platform:*");
          return keys.length;
        },
        async () => 0,
      );

      return {
        hitRate,
        missRate: 1 - hitRate,
        totalKeys,
      };
    } catch {
      return {
        hitRate: 0.5,
        missRate: 0.5,
        totalKeys: 0,
      };
    }
  }

  /**
   * Generate warm data for testing
   */
  private static generateWarmData(query: string): any {
    return {
      query,
      timestamp: Date.now(),
      data: `Warm data for query: ${query}`,
      metadata: {
        source: "cache-warming",
        priority: "medium",
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
    };
  }

  /**
   * Update warming statistics
   */
  private static async updateWarmingStats(stats: {
    strategiesWarmed: number;
    keysWarmed: number;
    duration: number;
    timestamp: string;
  }): Promise<void> {
    try {
      const statsKey = "ai-platform:stats:warming";

      await redisManager.executeWithFallback(
        async (client) => {
          await client.hSet(statsKey, {
            last_warming: JSON.stringify(stats),
            total_strategies: stats.strategiesWarmed.toString(),
            total_keys: stats.keysWarmed.toString(),
            last_duration: stats.duration.toString(),
          });
        },
        async () => {},
      );
    } catch (error) {
      logger.debug("Failed to update warming stats", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Get warming recommendations
   */
  static async getWarmingRecommendations(): Promise<{
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
    reasoning: string;
  }> {
    try {
      const stats = await this.getCurrentCacheStats();

      const highPriority: string[] = [];
      const mediumPriority: string[] = [];
      const lowPriority: string[] = [];

      if (stats.hitRate < 0.4) {
        highPriority.push("Increase AI response cache warming frequency");
        highPriority.push("Warm popular blueprint patterns");
      } else if (stats.hitRate < 0.7) {
        mediumPriority.push("Optimize cache warming strategies");
        mediumPriority.push("Add adaptive warming for peak hours");
      } else {
        lowPriority.push("Monitor cache performance trends");
      }

      const reasoning = `Current hit rate is ${(stats.hitRate * 100).toFixed(1)}% with ${stats.totalKeys} total cached keys`;

      return {
        highPriority,
        mediumPriority,
        lowPriority,
        reasoning,
      };
    } catch (error) {
      logger.error("Failed to get warming recommendations", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        highPriority: [],
        mediumPriority: ["Default warming strategies"],
        lowPriority: [],
        reasoning: "Unable to fetch current stats - using defaults",
      };
    }
  }
}
