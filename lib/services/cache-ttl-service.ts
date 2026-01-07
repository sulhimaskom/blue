/**
 * Atomic service for cache TTL (Time To Live) calculation and optimization
 * Extracted from UnifiedCacheManager to follow blueprint.md Service Layer principles
 */
import { redisManager } from "../redis";
import { logger } from "../logger";

export interface TTLOptions {
  defaultTTL?: number;
  minTTL?: number;
  maxTTL?: number;
  hitRateFactor?: number;
}

export interface TTLStrategy {
  baseTTL: number;
  boostFactor?: number;
  maxBoost?: number;
  // eslint-disable-next-line no-unused-vars
  conditions?: (params: any) => boolean;
}

/**
 * Atomic service responsible only for TTL calculation and optimization
 * Follows blueprint.md Service Layer principle: Single responsibility, no business logic in UI
 */
export class CacheTTLService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly MIN_TTL = 300; // 5 minutes
  private static readonly MAX_TTL = 86400; // 24 hours

  // TTL strategies for different cache patterns
  private static readonly TTL_STRATEGIES: Record<string, TTLStrategy> = {
    "ai-response": {
      baseTTL: 1800, // 30 minutes
      boostFactor: 2.0, // Double for high hit rates
      maxBoost: 7200, // Maximum 2 hours
    },
    "user-blueprint": {
      baseTTL: 3600, // 1 hour
      boostFactor: 1.5,
      maxBoost: 10800, // Maximum 3 hours
    },
    "project-stats": {
      baseTTL: 600, // 10 minutes
      boostFactor: 2.5,
      maxBoost: 1800, // Maximum 30 minutes
    },
    "metrics-summary": {
      baseTTL: 60, // 1 minute
      boostFactor: 1.2,
      maxBoost: 300, // Maximum 5 minutes
    },
    "health-check": {
      baseTTL: 30, // 30 seconds
      boostFactor: 1.1,
      maxBoost: 120, // Maximum 2 minutes
    },
  };

  /**
   * Calculate optimal TTL based on various factors
   */
  static calculateTTL(
    prefix: string,
    params: any = {},
    options: TTLOptions = {},
  ): number {
    const {
      defaultTTL = this.DEFAULT_TTL,
      minTTL = this.MIN_TTL,
      maxTTL = this.MAX_TTL,
      hitRateFactor = 1.0,
    } = options;

    // Get base TTL for prefix
    const strategy = this.TTL_STRATEGIES[prefix];
    let baseTTL = strategy?.baseTTL || defaultTTL;

    // Apply intelligent scaling factors
    const scalingFactors = this.calculateScalingFactors(prefix, params);
    baseTTL = baseTTL * scalingFactors;

    // Apply hit rate boost if available
    if (hitRateFactor > 1.0) {
      baseTTL = baseTTL * hitRateFactor;
    }

    // Apply strategy-specific boost
    if (strategy?.conditions?.(params) && strategy?.boostFactor) {
      const boost = Math.min(
        strategy.boostFactor,
        strategy.maxBoost || baseTTL,
      );
      baseTTL = Math.min(
        baseTTL * boost,
        baseTTL + (strategy.maxBoost || baseTTL),
      );
    }

    // Clamp to min/max boundaries (options override class defaults)
    // If both min and max are provided, ensure min <= max
    const hasCustomMin = options.minTTL !== undefined;
    const hasCustomMax = options.maxTTL !== undefined;

    let finalMin = hasCustomMin ? minTTL : this.MIN_TTL;
    let finalMax = hasCustomMax ? maxTTL : this.MAX_TTL;

    // If custom bounds conflict, prioritize the more restrictive bound
    if (hasCustomMin && hasCustomMax && finalMin > finalMax) {
      // If provided min > max, swap to ensure min <= max
      [finalMin, finalMax] = [finalMax, finalMin];
    } else if (hasCustomMax && !hasCustomMin && finalMax < finalMin) {
      // If custom max is less than default min, adjust min down
      finalMin = Math.min(finalMax, this.MIN_TTL);
    } else if (hasCustomMin && !hasCustomMax && finalMin > finalMax) {
      // If custom min is greater than default max, adjust max up
      finalMax = Math.max(finalMin, this.MAX_TTL);
    }

    return Math.max(finalMin, Math.min(finalMax, Math.floor(baseTTL)));
  }

  /**
   * Calculate dynamic TTL based on current system performance and cache hit rates
   */
  static async calculateDynamicTTL(prefix: string): Promise<number> {
    const strategy = this.TTL_STRATEGIES[prefix];
    const baseTTL = strategy?.baseTTL || this.DEFAULT_TTL;

    try {
      // Get current cache performance metrics
      const hitRate = await this.getCurrentHitRate();
      const memoryUsage = await this.getCurrentMemoryUsage();

      let dynamicTTL = baseTTL;

      // Hit rate scaling: higher hit rates = longer TTLs
      if (hitRate > 0.8) {
        dynamicTTL *= strategy?.boostFactor || 1.5;
      } else if (hitRate < 0.3) {
        dynamicTTL *= 0.7; // Reduce TTL for low hit rates
      }

      // Memory scaling: high memory usage = shorter TTLs
      if (memoryUsage > 0.9) {
        dynamicTTL *= 0.5; // Aggressive TTL reduction
      } else if (memoryUsage > 0.7) {
        dynamicTTL *= 0.8;
      }

      logger.info(`Dynamic TTL calculation for ${prefix}`, {
        baseTTL,
        hitRate,
        memoryUsage,
        calculatedTTL: Math.floor(dynamicTTL),
      });

      return Math.max(
        this.MIN_TTL,
        Math.min(this.MAX_TTL, Math.floor(dynamicTTL)),
      );
    } catch (error) {
      logger.error(`Failed to calculate dynamic TTL for ${prefix}`, { error });
      return baseTTL; // Fallback to base TTL
    }
  }

  /**
   * Calculate scaling factors based on parameters
   */
  private static calculateScalingFactors(prefix: string, params: any): number {
    let scalingFactor = 1.0;

    // AI-specific scaling
    if (prefix === "ai-response") {
      const model = params.model?.toLowerCase() || "";

      // Longer TTLs for more expensive models
      if (model.includes("gpt-4")) {
        scalingFactor *= 1.5;
      } else if (model.includes("claude")) {
        scalingFactor *= 1.3;
      }

      // Longer TTLs for longer completions (less likely to change)
      if (params.maxTokens > 2000) {
        scalingFactor *= 1.2;
      }
    }

    // User-specific scaling
    if (prefix === "user-blueprint") {
      // Premium users get longer TTLs
      if (params.subscriptionTier === "enterprise") {
        scalingFactor *= 2.0;
      } else if (params.subscriptionTier === "pro") {
        scalingFactor *= 1.5;
      }
    }

    // Metrics scaling
    if (prefix === "metrics-summary") {
      // Different TTL for different metrics time ranges
      const timeRange = params.timeRange || "1h";
      const timeRangeMultipliers: Record<string, number> = {
        "1h": 1.0,
        "24h": 1.5,
        "7d": 2.0,
        "30d": 3.0,
      };

      scalingFactor *= timeRangeMultipliers[timeRange] || 1.0;
    }

    return scalingFactor;
  }

  /**
   * Get current cache hit rate for dynamic TTL calculation
   */
  private static async getCurrentHitRate(): Promise<number> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return 0.5; // Default hit rate

      // Get cache statistics
      const hitRateString = await redis.get("cache:hit_rate");
      return hitRateString ? parseFloat(hitRateString) : 0.5;
    } catch (error) {
      logger.error("Failed to get current hit rate", { error });
      return 0.5; // Default hit rate
    }
  }

  /**
   * Get current memory usage for dynamic TTL calculation
   */
  private static async getCurrentMemoryUsage(): Promise<number> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return 0.5; // Default memory usage

      const info = await redis.info("memory");
      const usedMemoryMatch = info.match(/used_memory:(\d+)/);
      const maxMemoryMatch = info.match(/maxmemory:(\d+)/);

      if (usedMemoryMatch && maxMemoryMatch) {
        const used = parseInt(usedMemoryMatch[1]);
        const max = parseInt(maxMemoryMatch[1]);
        return max > 0 ? used / max : 0.5;
      }

      return 0.5;
    } catch (error) {
      logger.error("Failed to get current memory usage", { error });
      return 0.5; // Default memory usage
    }
  }

  /**
   * Get TTL strategy for a specific cache prefix
   */
  static getTTLStrategy(prefix: string): TTLStrategy | null {
    return this.TTL_STRATEGIES[prefix] || null;
  }

  /**
   * Register a new TTL strategy
   */
  static registerTTLStrategy(prefix: string, strategy: TTLStrategy): void {
    this.TTL_STRATEGIES[prefix] = strategy;
    logger.info(`Registered TTL strategy for ${prefix}`, strategy);
  }

  /**
   * Get recommended TTL based on content characteristics
   */
  static getRecommendedTTL(contentType: string, contentSize: number): number {
    const baseMultipliers: Record<string, number> = {
      text: 1.0,
      json: 1.2,
      html: 0.8,
      image: 2.0,
      video: 3.0,
      application: 1.0,
    };

    const sizeMultiplier = Math.min(3.0, 1.0 + contentSize / (1024 * 1024)); // Scale with size up to 3x
    const typeMultiplier = baseMultipliers[contentType] || 1.0;

    return Math.floor(this.DEFAULT_TTL * typeMultiplier * sizeMultiplier);
  }
}
