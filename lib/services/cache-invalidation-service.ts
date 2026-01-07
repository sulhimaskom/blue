import { redisManager } from "../redis";
import { logger } from "../logger";

interface CacheInvalidationRule {
  event: string;
  patterns: string[];
  ttl?: number;
  cascade?: string[];
}

export class CacheInvalidationService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly RESPONSE_PREFIX = "response:";

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

  static async invalidateByTag(tag: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          const dataKeys = await client.sMembers(
            `${this.CACHE_PREFIX}tag:${tag}`,
          );
          if (dataKeys.length > 0) {
            for (const key of dataKeys as string[]) {
              await client.del(key);
            }
            await client.del(`${this.CACHE_PREFIX}tag:${tag}`);
          }

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

      for (const pattern of rule.patterns) {
        await this.invalidateByTag(pattern);
      }

      if (rule.cascade) {
        for (const cascadePattern of rule.cascade) {
          await this.invalidateByTag(cascadePattern);
        }
      }

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
}
