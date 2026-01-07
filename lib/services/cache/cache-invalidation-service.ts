import { redisManager } from "../../redis";
import { logger } from "../../logger";

/**
 * Service for cache invalidation operations
 */
export class CacheInvalidationService {
  private static readonly CACHE_PREFIX = "ai-platform:";

  /**
   * Invalidate specific cache key
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      const fullKey = key.startsWith(this.CACHE_PREFIX)
        ? key
        : `${this.CACHE_PREFIX}${key}`;

      await redisManager.executeWithFallback(
        async (client) => {
          await client.del(fullKey);
        },
        async () => {
          logger.warn("Cache invalidation fallback invoked", { key: fullKey });
        },
      );

      logger.debug("Cache key invalidated", { key: fullKey });
    } catch (error) {
      logger.error("Failed to invalidate cache key", {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Invalidate all cache entries with specific tag
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `${this.CACHE_PREFIX}tags:${tag}`;

      // Get all keys associated with this tag
      const taggedKeys = await redisManager.executeWithFallback(
        async (client) => await client.sMembers(tagKey),
        async () => [] as string[],
      );

      if (taggedKeys.length === 0) {
        logger.debug("No cache entries found for tag", { tag });
        return;
      }

      // Delete all tagged keys
      for (const taggedKey of taggedKeys) {
        await redisManager.executeWithFallback(
          async (client) => {
            await client.del(taggedKey);
          },
          async () => {
            logger.warn("Tag-based cache invalidation fallback", {
              tag,
              key: taggedKey,
            });
          },
        );
      }

      // Remove the tag set itself
      await redisManager.executeWithFallback(
        async (client) => {
          await client.del(tagKey);
        },
        async () => {},
      );

      logger.info("Cache invalidated by tag", {
        tag,
        keysCount: taggedKeys.length,
        keys: taggedKeys.slice(0, 10), // Log first 10 keys
      });
    } catch (error) {
      logger.error("Failed to invalidate cache by tag", {
        tag,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Invalidate cache entries based on event type
   */
  static async invalidateByEvent(
    event: string,
    cascade: string[] = [],
  ): Promise<void> {
    try {
      const invalidationRules = this.getInvalidationRules();
      const rule = invalidationRules[event];

      if (!rule) {
        logger.debug("No invalidation rule for event", { event });
        return;
      }

      // Invalidate primary patterns
      for (const pattern of rule.patterns) {
        await this.invalidateByPattern(pattern);
      }

      // Cascade invalidations
      for (const cascadeEvent of cascade) {
        const cascadeRule = invalidationRules[cascadeEvent];
        if (cascadeRule) {
          for (const pattern of cascadeRule.patterns) {
            await this.invalidateByPattern(pattern);
          }
        }
      }

      logger.info("Cache invalidated by event", {
        event,
        patterns: rule.patterns,
        cascade,
      });
    } catch (error) {
      logger.error("Failed to invalidate cache by event", {
        event,
        cascade,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  static async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const searchPattern = pattern.startsWith(this.CACHE_PREFIX)
        ? pattern
        : `${this.CACHE_PREFIX}${pattern}*`;

      const keys = await redisManager.executeWithFallback(
        async (client) => await client.keys(searchPattern),
        async () => [] as string[],
      );

      if (keys.length === 0) {
        logger.debug("No cache keys found for pattern", {
          pattern: searchPattern,
        });
        return;
      }

      // Delete keys in batches to avoid blocking Redis
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        for (const key of batch) {
          await redisManager.executeWithFallback(
            async (client) => {
              await client.del(key);
            },
            async () => {
              logger.warn("Pattern-based cache invalidation fallback", {
                pattern,
                key,
              });
            },
          );
        }
      }

      logger.info("Cache invalidated by pattern", {
        pattern: searchPattern,
        keysCount: keys.length,
      });
    } catch (error) {
      logger.error("Failed to invalidate cache by pattern", {
        pattern,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Invalidate blueprint-related cache
   */
  static async invalidateBlueprintCache(blueprintId: string): Promise<void> {
    try {
      const patterns = [
        `blueprint:${blueprintId}*`,
        `blueprint-user:*${blueprintId}*`,
        `ai-response:*${blueprintId}*`,
      ];

      for (const pattern of patterns) {
        await this.invalidateByPattern(pattern);
      }

      logger.info("Blueprint cache invalidated", { blueprintId });
    } catch (error) {
      logger.error("Failed to invalidate blueprint cache", {
        blueprintId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Perform contextual invalidation based on data changes
   */
  static async performContextualInvalidation(context: {
    type: string;
    id: string;
    userId?: string;
    relatedData?: Record<string, any>;
  }): Promise<void> {
    try {
      const { type, id, userId, relatedData } = context;

      // Base invalidations
      await this.invalidateByPattern(`${type}:${id}*`);

      // User-specific invalidations
      if (userId) {
        await this.invalidateByPattern(`${type}-user:${userId}*`);
      }

      // Contextual invalidations based on related data
      if (relatedData) {
        for (const [key, value] of Object.entries(relatedData)) {
          if (typeof value === "string") {
            await this.invalidateByPattern(`${type}-${key}:${value}*`);
          }
        }
      }

      logger.debug("Contextual cache invalidation completed", context);
    } catch (error) {
      logger.error("Failed to perform contextual invalidation", {
        context,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Get invalidation rules for different events
   */
  private static getInvalidationRules(): Record<
    string,
    { patterns: string[]; cascade?: string[] }
  > {
    return {
      "blueprint:created": {
        patterns: ["blueprint-list*", "user-blueprints*"],
        cascade: ["user:updated"],
      },
      "blueprint:updated": {
        patterns: ["blueprint*", "ai-response*"],
        cascade: ["user:updated"],
      },
      "blueprint:deleted": {
        patterns: ["blueprint*", "blueprint-list*"],
        cascade: ["user:updated"],
      },
      "user:updated": {
        patterns: ["user-data*", "blueprint-user*"],
      },
      "credits:updated": {
        patterns: ["user-credits*", "blueprint-list*"],
      },
      "theme:updated": {
        patterns: ["theme*", "user-theme*"],
      },
    };
  }

  /**
   * Get invalidation statistics
   */
  static async getInvalidationStats(): Promise<{
    totalInvalidations: number;
    invalidationsByType: Record<string, number>;
    lastInvalidation: string | null;
  }> {
    try {
      const statsKey = `${this.CACHE_PREFIX}stats:invalidations`;
      const stats = await redisManager.executeWithFallback(
        async (client) => {
          const result = await client.hGetAll(statsKey);
          return {
            total: result.total || "0",
            byType: result.byType || "{}",
            last: result.last || null,
          };
        },
        async () => ({ total: "0", byType: "{}", last: null }),
      );

      const totalInvalidations = parseInt(stats.total || "0");
      const invalidationsByType = JSON.parse(stats.byType || "{}");
      const lastInvalidation = stats.last || null;

      return {
        totalInvalidations,
        invalidationsByType,
        lastInvalidation,
      };
    } catch (error) {
      logger.error("Failed to get invalidation stats", {
        error: error instanceof Error ? error.message : error,
      });

      return {
        totalInvalidations: 0,
        invalidationsByType: {},
        lastInvalidation: null,
      };
    }
  }
}
