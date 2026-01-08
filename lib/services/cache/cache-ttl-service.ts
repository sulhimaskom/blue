import { redisManager } from "../../redis";
import { logger } from "../../logger";

/**
 * Service responsible for TTL (Time To Live) calculation and management
 * Extracted from UnifiedCacheManager for better modularity and testability
 */
export class CacheTTLService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly AI_RESPONSE_TTL = 1800; // 30 minutes
  private static readonly RESEARCH_DATA_TTL = 7200; // 2 hours
  private static readonly BLUEPRINT_TTL = 3600; // 1 hour
  private static readonly METRICS_TTL = 300; // 5 minutes
  private static readonly HEALTH_TTL = 60; // 1 minute

  /**
   * Calculate TTL based on cache prefix and context
   */
  static calculateTTL(
    prefix: string,
    options?: { customTTL?: number; size?: number },
  ): number {
    // Use custom TTL if provided
    if (options?.customTTL) {
      return Math.max(options.customTTL, 60); // Minimum 1 minute
    }

    // TTL based on cache prefix
    switch (prefix) {
      case "ai-response":
        return this.AI_RESPONSE_TTL;
      case "research":
        return this.RESEARCH_DATA_TTL;
      case "blueprint":
        return this.BLUEPRINT_TTL;
      case "metrics":
        return this.METRICS_TTL;
      case "health":
        return this.HEALTH_TTL;
      case "response":
        // Dynamic TTL for HTTP responses based on content size
        return this.calculateResponseTTL(options?.size || 0);
      default:
        return this.DEFAULT_TTL;
    }
  }

  /**
   * Calculate dynamic TTL based on cache hit rate and usage patterns
   */
  static async calculateDynamicTTL(prefix: string): Promise<number> {
    try {
      const hitRate = await this.getCurrentHitRate();
      const patternCount = await this.getPatternCount(prefix);

      // Base TTL
      let ttl = this.calculateTTL(prefix);

      // Adjust based on hit rate (higher hit rate = longer TTL)
      if (hitRate > 0.8) {
        ttl *= 1.5; // 50% longer
      } else if (hitRate < 0.3) {
        ttl *= 0.5; // 50% shorter
      }

      // Adjust based on pattern count (more patterns = shorter TTL for variety)
      if (patternCount > 100) {
        ttl *= 0.8; // 20% shorter
      }

      // Ensure TTL stays within reasonable bounds
      return Math.max(Math.min(Math.floor(ttl), 86400), 60); // 1 minute to 24 hours
    } catch (error) {
      logger.warn("Failed to calculate dynamic TTL, using default", {
        prefix,
        error,
      });
      return this.calculateTTL(prefix);
    }
  }

  /**
   * Calculate TTL for HTTP responses based on content
   */
  private static calculateResponseTTL(contentSize: number): number {
    if (contentSize > 100000) {
      // 100KB+
      return 1800; // 30 minutes
    } else if (contentSize > 10000) {
      // 10KB+
      return 900; // 15 minutes
    } else {
      return 300; // 5 minutes
    }
  }

  /**
   * Get current cache hit rate for TTL optimization
   */
  private static async getCurrentHitRate(): Promise<number> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return 0.5; // Default assumption

      // Get cache statistics
      const hits = await redis
        .get("cache-stats:hits")
        .then((val: string | null) => parseInt(val || "0"));
      const misses = await redis
        .get("cache-stats:misses")
        .then((val: string | null) => parseInt(val || "0"));

      const total = hits + misses;
      return total > 0 ? hits / total : 0.5;
    } catch (error) {
      logger.warn("Failed to get cache hit rate", { error });
      return 0.5; // Default assumption
    }
  }

  /**
   * Get pattern count for specific prefix
   */
  private static async getPatternCount(prefix: string): Promise<number> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return 0;

      const pattern = `ai-platform:${prefix}:*`;
      const keys = await redis.keys(pattern);
      return keys.length;
    } catch (error) {
      logger.warn("Failed to get pattern count", { prefix, error });
      return 0;
    }
  }

  /**
   * Get TTL recommendations based on usage patterns
   */
  static getTTLRecommendations(): Record<
    string,
    { min: number; max: number; recommended: number }
  > {
    return {
      "ai-response": { min: 900, max: 3600, recommended: this.AI_RESPONSE_TTL },
      research: { min: 1800, max: 14400, recommended: this.RESEARCH_DATA_TTL },
      blueprint: { min: 600, max: 7200, recommended: this.BLUEPRINT_TTL },
      metrics: { min: 60, max: 600, recommended: this.METRICS_TTL },
      health: { min: 30, max: 300, recommended: this.HEALTH_TTL },
      response: { min: 60, max: 1800, recommended: 300 },
    };
  }

  /**
   * Validate TTL value
   */
  static validateTTL(ttl: number): boolean {
    return ttl > 0 && ttl <= 86400; // Between 1 second and 24 hours
  }

  /**
   * Get cache expiration time for monitoring
   */
  static async getCacheExpirations(): Promise<Record<string, number>> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return {};

      const patterns = [
        "ai-response",
        "research",
        "blueprint",
        "metrics",
        "health",
      ];
      const expirations: Record<string, number> = {};

      for (const pattern of patterns) {
        const keyPattern = `ai-platform:${pattern}:*`;
        const keys = await redis.keys(keyPattern);

        if (keys.length > 0) {
          const ttl = await redis.ttl(keys[0]);
          expirations[pattern] = ttl > 0 ? ttl : 0;
        }
      }

      return expirations;
    } catch (error) {
      logger.warn("Failed to get cache expirations", { error });
      return {};
    }
  }
}
