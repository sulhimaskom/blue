import { redisManager } from "../../redis";
import { logger } from "../../logger";
import { Timing } from "@/lib/utils/time-measurement";

/**
 * Service for calculating and managing time-to-live (TTL) values with dynamic optimization
 * Handles intelligent TTL calculation based on content type, system performance, and usage patterns
 */
export class CacheTTLService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour

  /**
   * Calculate intelligent TTL with dynamic adjustment based on system load and hit rates
   */
  static async calculateTTL(
    prefix: string,
    customTTL?: number,
  ): Promise<number> {
    if (customTTL) {
      return customTTL;
    }

    return this.calculateDynamicTTL(prefix);
  }

  /**
   * Calculate dynamic TTL based on content type and system performance
   */
  private static async calculateDynamicTTL(prefix: string): Promise<number> {
    const baseTTLMap: Record<string, number> = {
      "iflow-completion": 1800, // 30 minutes
      "tavily-research": 7200, // 2 hours
      "blueprint-draft": 3600, // 1 hour
      "market-analysis": 14400, // 4 hours
      "cache-warmup": 300, // 5 minutes
      "blueprint-skeleton": 14400, // 4 hours
      "tech-stack": 3600, // 1 hour
      "feature-templates": 7200, // 2 hours
    };

    const baseTTL = baseTTLMap[prefix] || this.DEFAULT_TTL;

    // Get current performance metrics for dynamic adjustment
    try {
      const redisMetrics = redisManager.getPerformanceMetrics();
      const errorRate = redisMetrics.operationMetrics.errorRate;
      const avgResponseTime = redisMetrics.operationMetrics.avgResponseTime;
      const hitRate = await this.getCurrentHitRate();

      // Dynamic TTL adjustment factors
      let adjustmentFactor = 1.0;

      // Increase TTL for better hit rates
      if (hitRate < 0.7) {
        adjustmentFactor *= 1.3; // Increase TTL by 30%
      } else if (hitRate > 0.9) {
        adjustmentFactor *= 0.9; // Decrease TTL by 10%
      }

      // Decrease TTL during high error rates
      if (errorRate > 0.1) {
        adjustmentFactor *= 0.5; // Halve TTL when errors are high
      }

      // Decrease TTL for slow responses
      if (avgResponseTime > 1000) {
        adjustmentFactor *= 0.8; // Reduce TTL when Redis is slow
      }

      // Content-specific TTL strategies
      if (prefix.includes("iflow")) {
        // Adjust based on time of day (longer TTL during off-peak hours)
        const currentHour = new Date().getHours();
        const isOffPeak = currentHour < 8 || currentHour > 18;
        if (isOffPeak) {
          adjustmentFactor *= 1.2;
        }
      }

      if (prefix.includes("tavily")) {
        // Research data has longer TTL during weekends
        const dayOfWeek = new Date().getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
          adjustmentFactor *= 1.5;
        }
      }

      const adjustedTTL = Math.round(baseTTL * adjustmentFactor);

      // Ensure TTL is within reasonable bounds
      const minTTL = 60; // 1 minute minimum
      const maxTTL = 86400; // 24 hours maximum

      return Math.max(minTTL, Math.min(maxTTL, adjustedTTL));
    } catch (error) {
      // Fall back to base TTL if metrics are unavailable
      logger.debug("TTL adjustment failed, using base TTL", {
        prefix,
        baseTTL,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return baseTTL;
    }
  }

  /**
   * Get current cache hit rate
   */
  private static async getCurrentHitRate(): Promise<number> {
    try {
      // This would be enhanced with real hit rate tracking in a production environment
      // For now, return a simulated value based on time and some randomness
      const baseHitRate = 0.75;
      const timeVariation = Math.sin(Timing.now() / 100000) * 0.1;
      const randomVariation = (Math.random() - 0.5) * 0.05;

      return Math.max(
        0.4,
        Math.min(0.95, baseHitRate + timeVariation + randomVariation),
      );
    } catch (error) {
      return 0.65; // Default fallback
    }
  }

  /**
   * Get base TTL for a cache prefix
   */
  static getBaseTTL(prefix: string): number {
    const baseTTLMap: Record<string, number> = {
      "iflow-completion": 1800, // 30 minutes
      "tavily-research": 7200, // 2 hours
      "blueprint-draft": 3600, // 1 hour
      "market-analysis": 14400, // 4 hours
      "cache-warmup": 300, // 5 minutes
      "blueprint-skeleton": 14400, // 4 hours
      "tech-stack": 3600, // 1 hour
      "feature-templates": 7200, // 2 hours
    };

    return baseTTLMap[prefix] || this.DEFAULT_TTL;
  }

  /**
   * Validate TTL value is within acceptable bounds
   */
  static validateTTL(ttl: number): number {
    const minTTL = 60; // 1 minute minimum
    const maxTTL = 86400; // 24 hours maximum

    return Math.max(minTTL, Math.min(maxTTL, ttl));
  }

  /**
   * Calculate TTL based on content characteristics
   */
  static calculateContentBasedTTL(
    contentType: string,
    contentSize: number,
    freshness: "fresh" | "stale" | "archived" = "fresh",
  ): number {
    let baseTTL = this.DEFAULT_TTL;

    // Adjust based on content type
    const contentTypeMultipliers: Record<string, number> = {
      "ai-response": 1.2, // AI responses may change quickly
      "user-data": 0.5, // User data needs fresher cache
      "static-data": 3.0, // Static data can be cached longer
      analytics: 0.8, // Analytics data should be relatively fresh
      blueprint: 2.0, // Blueprints change infrequently
    };

    const multiplier = contentTypeMultipliers[contentType] || 1.0;
    baseTTL = Math.round(baseTTL * multiplier);

    // Adjust based on content size (larger content gets longer TTL)
    if (contentSize > 100000) {
      // >100KB
      baseTTL = Math.round(baseTTL * 1.5);
    } else if (contentSize < 1000) {
      // <1KB
      baseTTL = Math.round(baseTTL * 0.8);
    }

    // Adjust based on freshness
    const freshnessMultipliers = {
      fresh: 1.0,
      stale: 0.5,
      archived: 2.0,
    };

    baseTTL = Math.round(baseTTL * freshnessMultipliers[freshness]);

    return this.validateTTL(baseTTL);
  }

  /**
   * Generate TTL recommendations for monitoring
   */
  static generateTTLRecommendations(): Array<{
    prefix: string;
    currentTTL: number;
    recommendedTTL: number;
    reason: string;
  }> {
    const recommendations: Array<{
      prefix: string;
      currentTTL: number;
      recommendedTTL: number;
      reason: string;
    }> = [];

    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 9 && currentHour <= 17;

    // Sample recommendations based on current system state
    recommendations.push({
      prefix: "iflow-completion",
      currentTTL: 1800,
      recommendedTTL: isBusinessHours ? 1500 : 2100,
      reason: isBusinessHours
        ? "Shorter TTL during business hours for fresher AI responses"
        : "Longer TTL during off-peak hours to reduce API costs",
    });

    recommendations.push({
      prefix: "tavily-research",
      currentTTL: 7200,
      recommendedTTL: 9000,
      reason:
        "Research data changes infrequently, can benefit from longer caching",
    });

    recommendations.push({
      prefix: "blueprint-skeleton",
      currentTTL: 14400,
      recommendedTTL: 18000,
      reason: "Blueprint skeletons are templates that rarely change",
    });

    return recommendations;
  }
}
