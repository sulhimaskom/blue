import { redisManager } from "../../redis";
import { logger } from "../../logger";

/**
 * Service for calculating cache TTL (Time To Live) values
 */
export class CacheTTLService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly MIN_TTL = 60; // 1 minute
  private static readonly MAX_TTL = 86400; // 24 hours

  /**
   * Calculate TTL based on multiple factors
   */
  static calculateTTL(
    prefix: string,
    data?: any,
    options: {
      customTTL?: number;
      isExpensive?: boolean;
      isUserSpecific?: boolean;
    } = {},
  ): number {
    const { customTTL, isExpensive = false, isUserSpecific = false } = options;

    // Use custom TTL if provided
    if (customTTL) {
      return this.applyBounds(customTTL);
    }

    // Base TTL by prefix type
    let ttl = this.getBaseTTL(prefix);

    // Adjust for data characteristics
    if (data) {
      ttl = this.adjustTTLByData(ttl, data);
    }

    // Adjust for cost and specificity
    if (isExpensive) {
      ttl = Math.floor(ttl * 1.5); // 50% longer for expensive data
    }

    if (isUserSpecific) {
      ttl = Math.floor(ttl * 0.7); // 30% shorter for user-specific data
    }

    return this.applyBounds(ttl);
  }

  /**
   * Calculate dynamic TTL based on current hit rate
   */
  static async calculateDynamicTTL(prefix: string): Promise<number> {
    try {
      const hitRate = await this.getCurrentHitRate();
      const baseTTL = this.getBaseTTL(prefix);

      // Increase TTL for high hit rates, decrease for low hit rates
      let multiplier = 1.0;

      if (hitRate > 0.8) {
        multiplier = 1.5; // 50% longer for high hit rates
      } else if (hitRate < 0.3) {
        multiplier = 0.7; // 30% shorter for low hit rates
      }

      const dynamicTTL = Math.floor(baseTTL * multiplier);

      logger.debug("Dynamic TTL calculated", {
        prefix,
        hitRate,
        baseTTL,
        dynamicTTL,
        multiplier,
      });

      return this.applyBounds(dynamicTTL);
    } catch (error) {
      logger.error("Failed to calculate dynamic TTL", {
        error: error instanceof Error ? error.message : error,
        prefix,
      });
      return this.getBaseTTL(prefix);
    }
  }

  /**
   * Get current cache hit rate
   */
  static async getCurrentHitRate(): Promise<number> {
    try {
      const stats = await redisManager.executeWithFallback(
        async (client) => await client.get("cache:stats:hit_rate"),
        async () => Promise.resolve(null),
      );
      return stats ? parseFloat(stats) : 0.5; // Default to 50%
    } catch {
      return 0.5; // Default fallback
    }
  }

  /**
   * Get base TTL by cache prefix
   */
  private static getBaseTTL(prefix: string): number {
    const ttlMap: Record<string, number> = {
      "ai-response": 7200, // 2 hours
      "api-response": 1800, // 30 minutes
      blueprint: 3600, // 1 hour
      "user-data": 1800, // 30 minutes
      metrics: 600, // 10 minutes
      response: 300, // 5 minutes
      health: 60, // 1 minute
    };

    return ttlMap[prefix] || this.DEFAULT_TTL;
  }

  /**
   * Adjust TTL based on data characteristics
   */
  private static adjustTTLByData(ttl: number, data: any): number {
    try {
      const dataSize = JSON.stringify(data).length;

      // Larger data gets longer TTL to reduce processing costs
      if (dataSize > 100000) {
        // > 100KB
        ttl = Math.floor(ttl * 1.3);
      } else if (dataSize < 1000) {
        // < 1KB
        ttl = Math.floor(ttl * 0.8);
      }

      // Data with timestamps gets shorter TTL (more likely to change)
      const dataString = JSON.stringify(data).toLowerCase();
      if (dataString.includes("timestamp") || dataString.includes("date")) {
        ttl = Math.floor(ttl * 0.7);
      }

      return ttl;
    } catch {
      return ttl;
    }
  }

  /**
   * Apply min/max bounds to TTL
   */
  private static applyBounds(ttl: number): number {
    return Math.max(this.MIN_TTL, Math.min(this.MAX_TTL, ttl));
  }

  /**
   * Get TTL optimization recommendations
   */
  static async getTTLOptimizations(prefix: string): Promise<{
    currentTTL: number;
    recommendedTTL: number;
    hitRate: number;
    reason: string;
  }> {
    const hitRate = await this.getCurrentHitRate();
    const currentTTL = this.getBaseTTL(prefix);
    let recommendedTTL = currentTTL;
    let reason = "Current TTL is optimal";

    if (hitRate > 0.8) {
      recommendedTTL = Math.floor(currentTTL * 1.5);
      reason = "High hit rate suggests data can be cached longer";
    } else if (hitRate < 0.3) {
      recommendedTTL = Math.floor(currentTTL * 0.7);
      reason = "Low hit rate suggests data becomes stale quickly";
    }

    return {
      currentTTL,
      recommendedTTL: this.applyBounds(recommendedTTL),
      hitRate,
      reason,
    };
  }
}
