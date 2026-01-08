/**
 * Atomic service for cache invalidation strategies and rules
 * Extracted from UnifiedCacheManager to follow blueprint.md Service Layer principles
 */
import { redisManager } from "../redis";
import { logger } from "../logger";

export interface CacheInvalidationRule {
  event: string;
  patterns: string[];
  ttl?: number;
  cascade?: string[];
  priority?: number;
}

export interface InvalidationResult {
  invalidatedKeys: number;
  cascadedKeys: number;
  duration: number;
  errors: string[];
}

/**
 * Atomic service responsible only for cache invalidation logic
 * Follows blueprint.md Service Layer principle: Single responsibility, no business logic in UI
 */
export class CacheInvalidationService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static INVALIDATION_RULES: CacheInvalidationRule[] = [
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
      ttl: 30, // Very short TTL for circuit breaker events
    },
    {
      event: "cache:warming:completed",
      patterns: ["cache-warm-stats"],
    },
  ];

  /**
   * Invalidate cache by exact key match
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        logger.warn("Redis unavailable for cache invalidation", { key });
        return;
      }

      await redis.del(key);
      logger.info("Cache key invalidated", { key });
    } catch (error) {
      logger.error("Failed to invalidate cache key", { key, error });
      throw error;
    }
  }

  /**
   * Invalidate cache by tag pattern
   */
  static async invalidateByTag(tag: string): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      invalidatedKeys: 0,
      cascadedKeys: 0,
      duration: 0,
      errors: [],
    };

    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        result.errors.push("Redis unavailable for tag invalidation");
        return result;
      }

      // Find all keys with the specified tag
      const pattern = `${this.CACHE_PREFIX}*:tags:*${tag}*`;
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        logger.info("No keys found for tag invalidation", { tag });
        return result;
      }

      // Delete all matching keys
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis.del(key)));
      }
      result.invalidatedKeys = keys.length;

      // Handle cascade invalidation
      const rule = this.INVALIDATION_RULES.find((r) =>
        r.patterns.some((p) => p.includes(tag)),
      );

      if (rule?.cascade) {
        for (const cascadeTag of rule.cascade) {
          const cascadeResult = await this.invalidateByTag(cascadeTag);
          result.cascadedKeys += cascadeResult.invalidatedKeys;
          result.errors.push(...cascadeResult.errors);
        }
      }

      result.duration = Date.now() - startTime;
      logger.info("Cache tag invalidation completed", { tag, result });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      logger.error("Failed to invalidate cache by tag", { tag, error });
      return result;
    }
  }

  /**
   * Invalidate cache by event (using predefined rules)
   */
  static async invalidateByEvent(
    event: string,
    _params?: any,
  ): Promise<InvalidationResult> {
    // Mark parameter as used to avoid ESLint warning
    void _params;
    const startTime = Date.now();
    const result: InvalidationResult = {
      invalidatedKeys: 0,
      cascadedKeys: 0,
      duration: 0,
      errors: [],
    };

    try {
      const rule = this.INVALIDATION_RULES.find((r) => r.event === event);
      if (!rule) {
        result.errors.push(`No invalidation rule found for event: ${event}`);
        return result;
      }

      // Invalidate all patterns for this event
      for (const pattern of rule.patterns) {
        const patternResult = await this.invalidateByTag(pattern);
        result.invalidatedKeys += patternResult.invalidatedKeys;
        result.cascadedKeys += patternResult.cascadedKeys;
        result.errors.push(...patternResult.errors);
      }

      result.duration = Date.now() - startTime;
      logger.info("Cache event invalidation completed", { event, result });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      logger.error("Failed to invalidate cache by event", { event, error });
      return result;
    }
  }

  /**
   * Get invalidation rules for debugging
   */
  static getInvalidationRules(): CacheInvalidationRule[] {
    return [...this.INVALIDATION_RULES];
  }

  /**
   * Check if invalidation rule exists for event
   */
  static hasInvalidationRule(event: string): boolean {
    return this.INVALIDATION_RULES.some((rule) => rule.event === event);
  }

  /**
   * Add a new invalidation rule (for testing purposes)
   */
  static addInvalidationRule(rule: CacheInvalidationRule): void {
    this.INVALIDATION_RULES.push(rule);
  }

  /**
   * Remove invalidation rules by event (for testing purposes)
   */
  static removeInvalidationRules(event: string): void {
    const index = this.INVALIDATION_RULES.findIndex(
      (rule) => rule.event === event,
    );
    if (index >= 0) {
      this.INVALIDATION_RULES.splice(index, 1);
    }
  }
}
