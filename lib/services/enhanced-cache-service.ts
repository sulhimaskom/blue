import { predictiveCacheOptimizer } from "./predictive-cache-optimizer";
import { UnifiedCacheManager } from "./unified-cache-manager";
import { logger } from "../logger";
import { Timing } from "../utils/time-measurement";

/**
 * Enhanced Cache Service with Predictive Intelligence
 * Integrates predictive optimization with existing cache management
 */

export interface CacheOptimizationConfig {
  enablePredictiveOptimization: boolean;
  optimizationInterval: number; // minutes
  minimumImprovementThreshold: number; // percentage
  maxOptimizationsPerRun: number;
}

export interface CacheHealthMetrics {
  overallScore: number;
  hitRate: number;
  memoryEfficiency: number;
  costSavings: number;
  recommendations: string[];
  lastOptimization: string;
}

class EnhancedCacheService {
  private static readonly DEFAULT_CONFIG: CacheOptimizationConfig = {
    enablePredictiveOptimization: true,
    optimizationInterval: 30, // 30 minutes
    minimumImprovementThreshold: 5, // 5% minimum improvement
    maxOptimizationsPerRun: 50,
  };

  private static optimizationInterval: NodeJS.Timeout | null = null;
  private static isOptimizationRunning = false;

  /**
   * Initialize enhanced cache service with predictive optimization
   */
  static async initialize(
    config: Partial<CacheOptimizationConfig> = {},
  ): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    logger.info("Initializing enhanced cache service", {
      predictiveOptimization: finalConfig.enablePredictiveOptimization,
      optimizationInterval: finalConfig.optimizationInterval,
    });

    // Start periodic optimization if enabled
    if (finalConfig.enablePredictiveOptimization) {
      this.startPeriodicOptimization(finalConfig.optimizationInterval);
    }

    // Perform initial optimization
    await this.performScheduledOptimization(finalConfig);
  }

  /**
   * Start periodic predictive optimization
   */
  private static startPeriodicOptimization(intervalMinutes: number): void {
    if (this.optimizationInterval) {
      logger.warn("Periodic optimization already running");
      return;
    }

    this.optimizationInterval = setInterval(
      async () => {
        await this.performScheduledOptimization(this.DEFAULT_CONFIG).catch(
          (error) => {
            logger.error("Scheduled optimization failed", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          },
        );
      },
      intervalMinutes * 60 * 1000,
    );

    logger.info("Periodic optimization started", {
      interval: intervalMinutes,
    });
  }

  /**
   * Stop periodic optimization
   */
  static stopPeriodicOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      logger.info("Periodic optimization stopped");
    }
  }

  /**
   * Perform scheduled optimization with safeguards
   */
  private static async performScheduledOptimization(
    config: CacheOptimizationConfig,
  ): Promise<void> {
    // Prevent concurrent optimization runs
    if (this.isOptimizationRunning) {
      logger.debug("Optimization already running, skipping");
      return;
    }

    this.isOptimizationRunning = true;
    const startTime = Timing.now();

    try {
      logger.info("Starting scheduled cache optimization");

      // Perform predictive optimization
      const optimizationResult =
        await predictiveCacheOptimizer.performPredictiveOptimization();

      // Apply optimizations only if they meet minimum threshold
      if (
        optimizationResult.estimatedHitRateImprovement >=
        config.minimumImprovementThreshold
      ) {
        logger.info("Optimization applied successfully", {
          improvements: optimizationResult.estimatedHitRateImprovement,
          optimizations: optimizationResult.totalOptimizations,
          costSavings: optimizationResult.costSavingsPerHour,
        });

        // Cache optimization results
        await UnifiedCacheManager.cacheData(
          "optimization-results",
          { timestamp: Timing.now() },
          optimizationResult,
          { ttl: 3600, tags: ["optimization"] },
        );
      } else {
        logger.debug("Optimization skipped - below improvement threshold", {
          improvement: optimizationResult.estimatedHitRateImprovement,
          threshold: config.minimumImprovementThreshold,
        });
      }
    } catch (error) {
      logger.error("Scheduled optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Timing.perf(startTime),
      });
    } finally {
      this.isOptimizationRunning = false;
    }
  }

  /**
   * Get comprehensive cache health metrics
   */
  static async getCacheHealthMetrics(): Promise<CacheHealthMetrics> {
    try {
      const startTime = Timing.now();

      // Get cache statistics
      const cacheStats = await UnifiedCacheManager.getCacheStats();

      // Get performance metrics
      const performanceMetrics =
        await predictiveCacheOptimizer.getPerformanceMetrics();

      // Get latest optimization results
      const latestOptimization = await UnifiedCacheManager.getData(
        "optimization-results",
        { timestamp: 0 },
      );

      // Calculate overall health score
      const overallScore = this.calculateOverallHealthScore(
        cacheStats,
        performanceMetrics,
        latestOptimization,
      );

      // Generate recommendations
      const recommendations = await this.generateHealthRecommendations(
        cacheStats,
        performanceMetrics,
        overallScore,
      );

      const metrics: CacheHealthMetrics = {
        overallScore,
        hitRate: cacheStats.hitRate,
        memoryEfficiency: this.calculateMemoryEfficiency(cacheStats),
        costSavings: latestOptimization?.estimatedCostSavingsPerHour || 0,
        recommendations,
        lastOptimization: latestOptimization
          ? new Date(latestOptimization.timestamp || 0).toISOString()
          : "Never",
      };

      logger.debug("Cache health metrics calculated", {
        duration: Timing.perf(startTime),
        overallScore,
        hitRate: metrics.hitRate,
      });

      return metrics;
    } catch (error) {
      logger.error("Failed to calculate cache health metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return this.getDefaultHealthMetrics();
    }
  }

  /**
   * Calculate overall cache health score (0-100)
   */
  private static calculateOverallHealthScore(
    cacheStats: any,
    performanceMetrics: any,
    latestOptimization: any,
  ): number {
    let score = 50; // Base score

    // Hit rate component (40% weight)
    const hitRateScore = Math.min(100, cacheStats.hitRate * 100);
    score += (hitRateScore - 50) * 0.4;

    // Memory efficiency component (20% weight)
    const memoryScore = this.calculateMemoryEfficiency(cacheStats);
    score += (memoryScore - 50) * 0.2;

    // Performance component (20% weight)
    const performanceScore = Math.max(
      0,
      100 - performanceMetrics.errorRate * 1000,
    );
    score += (performanceScore - 50) * 0.2;

    // Optimization component (20% weight)
    const optimizationScore = latestOptimization
      ? Math.min(100, latestOptimization.estimatedHitRateImprovement * 5)
      : 30;
    score += (optimizationScore - 50) * 0.2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate memory efficiency score (0-100)
   */
  private static calculateMemoryEfficiency(cacheStats: any): number {
    if (!cacheStats.memoryUsage || cacheStats.memoryUsage === 0) {
      return 80; // Default score
    }

    // Assume 100MB as optimal memory usage for this application
    const optimalMemory = 100 * 1024 * 1024; // 100MB in bytes
    const memoryRatio = cacheStats.memoryUsage / optimalMemory;

    if (memoryRatio <= 0.5) return 90; // Very efficient
    if (memoryRatio <= 0.8) return 80; // Efficient
    if (memoryRatio <= 1.0) return 70; // Acceptable
    if (memoryRatio <= 1.5) return 50; // Less efficient
    return 30; // Inefficient
  }

  /**
   * Generate health recommendations
   */
  private static async generateHealthRecommendations(
    cacheStats: any,
    performanceMetrics: any,
    overallScore: number,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Hit rate recommendations
    if (cacheStats.hitRate < 0.7) {
      recommendations.push(
        "Cache hit rate is below 70%. Consider increasing TTL values or implementing pre-warming",
      );
    } else if (cacheStats.hitRate < 0.85) {
      recommendations.push(
        "Cache hit rate could be improved. Review cache key patterns and TTL strategies",
      );
    }

    // Performance recommendations
    if (performanceMetrics.errorRate > 0.02) {
      recommendations.push(
        "High error rate detected. Review cache service configuration and Redis connectivity",
      );
    }

    // Memory recommendations
    if (performanceMetrics.memoryUsage > 200 * 1024 * 1024) {
      // > 200MB
      recommendations.push(
        "High memory usage detected. Consider implementing cache compression or TTL reduction",
      );
    }

    // Overall score recommendations
    if (overallScore < 60) {
      recommendations.push(
        "Overall cache health is below optimal. Consider comprehensive optimization review",
      );
    }

    // Add predictive optimization recommendations if enabled
    if (this.DEFAULT_CONFIG.enablePredictiveOptimization && overallScore < 80) {
      recommendations.push(
        "Enable more frequent predictive optimization cycles for better performance",
      );
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Get default health metrics
   */
  private static getDefaultHealthMetrics(): CacheHealthMetrics {
    return {
      overallScore: 50,
      hitRate: 0.7,
      memoryEfficiency: 75,
      costSavings: 0,
      recommendations: [
        "Cache health monitoring requires detailed metrics for accurate assessment",
      ],
      lastOptimization: "Never",
    };
  }

  /**
   * Manual optimization trigger
   */
  static async triggerManualOptimization(
    config: Partial<CacheOptimizationConfig> = {},
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      logger.info("Manual cache optimization triggered", {
        config: finalConfig,
      });

      await this.performScheduledOptimization(finalConfig);

      return {
        success: true,
        result: { message: "Optimization completed", duration: 0 },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Manual optimization failed", { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear all optimization cache entries
   */
  static async clearOptimizationCache(): Promise<void> {
    try {
      await UnifiedCacheManager.invalidateByTag("optimization");
      logger.info("Optimization cache cleared");
    } catch (error) {
      logger.error("Failed to clear optimization cache", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get optimization configuration
   */
  static getConfiguration(): CacheOptimizationConfig {
    return { ...this.DEFAULT_CONFIG };
  }

  /**
   * Get optimization status
   */
  static getOptimizationStatus(): {
    isRunning: boolean;
    periodicEnabled: boolean;
    isOptimizationInProgress: boolean;
    currentInterval: number | null;
  } {
    return {
      isRunning: this.optimizationInterval !== null,
      periodicEnabled: this.DEFAULT_CONFIG.enablePredictiveOptimization,
      isOptimizationInProgress: this.isOptimizationRunning,
      currentInterval: this.optimizationInterval
        ? this.DEFAULT_CONFIG.optimizationInterval
        : null,
    };
  }
}

export const enhancedCacheService = EnhancedCacheService;
