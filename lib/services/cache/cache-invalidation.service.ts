import { redisManager } from "../../redis";
import { logger } from "../../logger";
import { Timing } from "@/lib/utils/time-measurement";

export interface CacheInvalidationRule {
  event: string;
  patterns: string[];
  ttl?: number;
  cascade?: string[];
}

/**
 * Service for intelligent cache invalidation and cleanup operations
 * Handles event-based, tag-based, and contextual cache invalidation strategies
 */
export class CacheInvalidationService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly RESPONSE_PREFIX = "response:";

  // Invalidation rules from advanced-cache-optimizer
  private static readonly INVALIDATION_RULES: CacheInvalidationRule[] = [
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
      ttl: 30,
    },
  ];

  /**
   * Invalidate cache by key
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          await client.del(key);
        },
        async () => {
          logger.warn("Redis unavailable, skipping cache invalidation", {
            key,
          });
        },
      );
    } catch (error) {
      logger.error("Cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
      });
    }
  }

  /**
   * Invalidate cache by tag (unified for both data and response caches)
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          // Invalidate data cache tags
          const dataKeys = await client.sMembers(
            `${this.CACHE_PREFIX}tag:${tag}`,
          );
          if (dataKeys.length > 0) {
            for (const key of dataKeys as string[]) {
              await client.del(key);
            }
            await client.del(`${this.CACHE_PREFIX}tag:${tag}`);
          }

          // Invalidate response cache tags
          const responseKeys = await client.sMembers(
            `${this.RESPONSE_PREFIX}tag:${tag}`,
          );
          if (responseKeys.length > 0) {
            for (const key of responseKeys as string[]) {
              await client.del(key);
            }
            await client.del(`${this.RESPONSE_PREFIX}tag:${tag}`);
          }
        },
        async () => {
          logger.warn(
            "Redis unavailable, skipping tag-based cache invalidation",
            { tag },
          );
        },
      );

      logger.info("Cache invalidated by tag", { tag });
    } catch (error) {
      logger.error("Tag-based cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        tag,
      });
    }
  }

  /**
   * Intelligent cache invalidation based on events
   */
  static async invalidateByEvent(
    event: string,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      const rule = this.INVALIDATION_RULES.find((r) => r.event === event);

      if (!rule) {
        logger.debug("No invalidation rule found for event", { event });
        return;
      }

      logger.info("Starting intelligent cache invalidation", {
        event,
        patterns: rule.patterns,
        context,
      });

      // Invalidate primary patterns
      for (const pattern of rule.patterns) {
        await this.invalidateByTag(pattern);
      }

      // Cascade invalidation
      if (rule.cascade) {
        for (const cascadePattern of rule.cascade) {
          await this.invalidateByTag(cascadePattern);
        }
      }

      // Context-aware invalidation
      if (context) {
        await this.performContextualInvalidation(event, context);
      }

      logger.info("Cache invalidation completed", {
        event,
        patternsInvalidated: rule.patterns.length,
        cascadedInvalidations: rule.cascade?.length || 0,
      });
    } catch (error) {
      logger.error("Event-based cache invalidation failed", {
        event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Context-aware cache invalidation for specific resources
   */
  private static async performContextualInvalidation(
    event: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const invalidations: Promise<void>[] = [];

      if (context.userId) {
        invalidations.push(this.invalidateByTag(`user-${context.userId}`));
      }
      if (context.projectId) {
        invalidations.push(
          this.invalidateByTag(`project-${context.projectId}`),
        );
      }
      if (context.blueprintId) {
        invalidations.push(
          this.invalidateByTag(`blueprint-${context.blueprintId}`),
        );
      }

      await Promise.allSettled(invalidations);

      logger.debug("Contextual invalidation completed", {
        event,
        userId: context.userId,
        projectId: context.projectId,
        blueprintId: context.blueprintId,
      });
    } catch (error) {
      logger.debug("Contextual invalidation failed", {
        event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Blueprint-specific cache invalidation
   */
  static async invalidateBlueprintCache(
    projectId: string,
    blueprintType?: string,
  ): Promise<void> {
    try {
      const tags = [
        `project-${projectId}`,
        "blueprint-complete",
        "blueprint-skeleton",
      ];

      if (blueprintType) {
        tags.push(blueprintType);
      }

      await Promise.allSettled(tags.map((tag) => this.invalidateByTag(tag)));

      logger.info("Blueprint cache invalidated", {
        projectId,
        blueprintType,
        tagsInvalidated: tags.length,
      });
    } catch (error) {
      logger.error("Blueprint cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        projectId,
        blueprintType,
      });
    }
  }

  /**
   * Batch invalidation for multiple tags
   */
  static async invalidateMultipleTags(tags: string[]): Promise<void> {
    try {
      const invalidationPromises = tags.map((tag) => this.invalidateByTag(tag));
      await Promise.allSettled(invalidationPromises);

      logger.info("Batch cache invalidation completed", {
        tagsCount: tags.length,
        tags,
      });
    } catch (error) {
      logger.error("Batch cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        tags,
      });
    }
  }

  /**
   * Cleanup expired cache entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    let cleanedCount = 0;

    try {
      await redisManager.executeWithFallback(
        async (client) => {
          const keys = await client.keys(`${this.CACHE_PREFIX}*`);

          for (const key of keys as string[]) {
            if (key.includes(":tag:")) continue; // Skip tag keys

            try {
              const data = await client.get(key);
              if (data) {
                const parsed = JSON.parse(data);

                if (parsed.metadata?.createdAt && parsed.metadata?.ttl) {
                  const age =
                    Timing.now() -
                    new Date(parsed.metadata.createdAt).getTime();
                  if (age > parsed.metadata.ttl * 1000) {
                    await client.del(key);
                    cleanedCount++;
                  }
                }
              }
            } catch {
              // Invalid JSON entry, remove it
              await client.del(key);
              cleanedCount++;
            }
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping cleanup");
        },
      );

      if (cleanedCount > 0) {
        logger.info("Cache cleanup completed", {
          cleanedEntries: cleanedCount,
        });
      }

      return cleanedCount;
    } catch (error) {
      logger.error("Cache cleanup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return cleanedCount;
    }
  }

  /**
   * Add or update invalidation rule
   */
  static updateInvalidationRule(rule: CacheInvalidationRule): void {
    const existingIndex = this.INVALIDATION_RULES.findIndex(
      (r) => r.event === rule.event,
    );

    if (existingIndex >= 0) {
      this.INVALIDATION_RULES[existingIndex] = rule;
      logger.info("Cache invalidation rule updated", { event: rule.event });
    } else {
      this.INVALIDATION_RULES.push(rule);
      logger.info("Cache invalidation rule added", { event: rule.event });
    }
  }

  /**
   * Get all invalidation rules
   */
  static getInvalidationRules(): CacheInvalidationRule[] {
    return [...this.INVALIDATION_RULES];
  }

  /**
   * Pattern-based cache invalidation
   */
  static async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      await redisManager.executeWithFallback(
        async (client) => {
          const keys = await client.keys(`${this.CACHE_PREFIX}*${pattern}*`);
          const validKeys = keys.filter(
            (key: string) => !key.includes(":tag:"),
          );

          for (const key of validKeys as string[]) {
            await client.del(key);
            invalidatedCount++;
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping pattern invalidation", {
            pattern,
          });
        },
      );

      logger.info("Pattern-based cache invalidation completed", {
        pattern,
        invalidatedCount,
      });

      return invalidatedCount;
    } catch (error) {
      logger.error("Pattern-based cache invalidation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        pattern,
      });
      return invalidatedCount;
    }
  }
}
