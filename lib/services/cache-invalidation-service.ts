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
  private static readonly INVALIDATION_RULES: CacheInvalidationRule[] = [
    {
      event: "blueprint:created",
      patterns: ["user-blueprint-stats", "blueprint-complete"],
      cascade: ["user-stats"],
      priority: 1,
    },
    {
      event: "blueprint:updated",
      patterns: ["blueprint-complete", "blueprint-skeleton"],
      cascade: ["user-blueprint-stats"],
      priority: 1,
    },
    {
      event: "project:created",
      patterns: ["user-blueprint-stats", "user-stats"],
      priority: 2,
    },
    {
      event: "user:credits_updated",
      patterns: ["user-stats"],
      priority: 3,
    },
    {
      event: "circuit-breaker:tripped",
      patterns: ["health-check", "metrics-summary"],
      ttl: 30, // Very short TTL for circuit breaker events
      priority: 1, // High priority
    },
    {
      event: "cache:warming:completed",
      patterns: ["cache-warm-stats"],
      priority: 4,
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

      // Batch delete keys
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        for (const key of batch) {
          await redis.del(key);
        }
        result.invalidatedKeys += batch.length;
      }

      logger.info("Cache invalidated by tag", {
        tag,
        invalidatedKeys: result.invalidatedKeys,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      logger.error("Failed to invalidate cache by tag", { tag, error });
      return result;
    } finally {
      result.duration = Date.now() - startTime;
    }
  }

  /**
   * Invalidate cache based on event rules
   */
  static async invalidateByEvent(
    event: string,
    params: any = {},
  ): Promise<InvalidationResult> {
    const startTime = Date.now();
    const result: InvalidationResult = {
      invalidatedKeys: 0,
      cascadedKeys: 0,
      duration: 0,
      errors: [],
    };

    try {
      const rules = this.INVALIDATION_RULES.filter(
        (rule) => rule.event === event,
      );

      if (rules.length === 0) {
        logger.info("No invalidation rules found for event", { event });
        return result;
      }

      // Sort by priority (lower number = higher priority)
      rules.sort((a, b) => (a.priority || 999) - (b.priority || 999));

      for (const rule of rules) {
        const ruleResult = await this.executeInvalidationRule(rule, params);
        result.invalidatedKeys += ruleResult.invalidatedKeys;
        result.cascadedKeys += ruleResult.cascadedKeys;
        result.errors.push(...ruleResult.errors);
      }

      logger.info("Cache invalidated by event", {
        event,
        rulesProcessed: rules.length,
        totalInvalidated: result.invalidatedKeys,
        totalCascaded: result.cascadedKeys,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      logger.error("Failed to invalidate cache by event", { event, error });
      return result;
    } finally {
      result.duration = Date.now() - startTime;
    }
  }

  /**
   * Execute a single invalidation rule
   */
  private static async executeInvalidationRule(
    rule: CacheInvalidationRule,
    params: any,
  ): Promise<InvalidationResult> {
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
        result.errors.push("Redis unavailable for rule execution");
        return result;
      }

      // Invalidate primary patterns
      for (const pattern of rule.patterns) {
        const keys = await this.getPatternKeys(pattern, params);

        if (keys.length > 0) {
          for (const key of keys) {
            await redis.del(key);
          }
          result.invalidatedKeys += keys.length;
        }
      }

      // Handle cascaded invalidations
      if (rule.cascade) {
        for (const cascadePattern of rule.cascade) {
          const cascadeKeys = await this.getPatternKeys(cascadePattern, params);

          if (cascadeKeys.length > 0) {
            for (const key of cascadeKeys) {
              await redis.del(key);
            }
            result.cascadedKeys += cascadeKeys.length;
          }
        }
      }

      // Apply rule-specific TTL if specified
      if (rule.ttl) {
        await this.applyTTLToPatterns(rule.patterns, rule.ttl, params);
      }

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      logger.error("Failed to execute invalidation rule", { rule, error });
      return result;
    } finally {
      result.duration = Date.now() - startTime;
    }
  }

  /**
   * Get keys matching a pattern
   */
  private static async getPatternKeys(
    pattern: string,
    params: any = {},
  ): Promise<string[]> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return [];

      // Substitute parameters in pattern
      let resolvedPattern = pattern;
      for (const [key, value] of Object.entries(params)) {
        resolvedPattern = resolvedPattern.replace(`:${key}`, String(value));
      }

      const fullPattern = `${this.CACHE_PREFIX}*${resolvedPattern}*`;
      const keys = await redis.keys(fullPattern);

      return keys;
    } catch (error) {
      logger.error("Failed to get pattern keys", { pattern, params, error });
      return [];
    }
  }

  /**
   * Apply TTL to patterns (for temporary invalidations)
   */
  private static async applyTTLToPatterns(
    patterns: string[],
    ttl: number,
    params: any = {},
  ): Promise<void> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return;

      for (const pattern of patterns) {
        const keys = await this.getPatternKeys(pattern, params);

        for (const key of keys) {
          await redis.expire(key, ttl);
        }
      }

      logger.info("Applied TTL to patterns", { patterns, ttl, params });
    } catch (error) {
      logger.error("Failed to apply TTL to patterns", {
        patterns,
        ttl,
        params,
        error,
      });
    }
  }

  /**
   * Invalidate cache by multiple patterns (wildcard support)
   */
  static async invalidateByPatterns(
    patterns: string[],
  ): Promise<InvalidationResult> {
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
        result.errors.push("Redis unavailable for pattern invalidation");
        return result;
      }

      const allKeys: string[] = [];

      // Collect all keys matching patterns
      for (const pattern of patterns) {
        const fullPattern = `${this.CACHE_PREFIX}*${pattern}*`;
        const keys = await redis.keys(fullPattern);
        allKeys.push(...keys);
      }

      // Remove duplicates and delete all keys
      const uniqueKeys = [...new Set(allKeys)];
      if (uniqueKeys.length > 0) {
        for (const key of uniqueKeys) {
          await redis.del(key);
        }
        result.invalidatedKeys = uniqueKeys.length;
      }

      logger.info("Cache invalidated by patterns", {
        patterns,
        invalidatedKeys: result.invalidatedKeys,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      logger.error("Failed to invalidate cache by patterns", {
        patterns,
        error,
      });
      return result;
    } finally {
      result.duration = Date.now() - startTime;
    }
  }

  /**
   * Clear all cache entries (emergency use only)
   */
  static async clearAllCache(): Promise<InvalidationResult> {
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
        result.errors.push("Redis unavailable for cache clear");
        return result;
      }

      // Get all keys with our prefix
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key);
        }
        result.invalidatedKeys = keys.length;
      }

      logger.warn("All cache cleared", {
        invalidatedKeys: result.invalidatedKeys,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      logger.error("Failed to clear all cache", { error });
      return result;
    } finally {
      result.duration = Date.now() - startTime;
    }
  }

  /**
   * Get all invalidation rules
   */
  static getInvalidationRules(): CacheInvalidationRule[] {
    return [...this.INVALIDATION_RULES];
  }

  /**
   * Add a new invalidation rule
   */
  static addInvalidationRule(rule: CacheInvalidationRule): void {
    this.INVALIDATION_RULES.push(rule);
    logger.info("Added invalidation rule", rule);
  }

  /**
   * Remove invalidation rules by event
   */
  static removeInvalidationRules(event: string): void {
    const initialLength = this.INVALIDATION_RULES.length;
    const filtered = this.INVALIDATION_RULES.filter(
      (rule) => rule.event !== event,
    );
    this.INVALIDATION_RULES.length = 0;
    this.INVALIDATION_RULES.push(...filtered);

    const removed = initialLength - this.INVALIDATION_RULES.length;
    if (removed > 0) {
      logger.info(`Removed ${removed} invalidation rules for event`, { event });
    }
  }
}
