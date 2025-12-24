import { redisManager } from "../redis";
import { logger } from "../logger";
import crypto from "crypto";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key (auto-generated if not provided)
  tags?: string[]; // Cache tags for invalidation
}

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly CACHE_PREFIX = "ai-platform:";

  /**
   * Generate cache key from input parameters
   */
  private static generateKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .substring(0, 16);
    return `${this.CACHE_PREFIX}${prefix}:${hash}`;
  }

  /**
   * Cache AI response with intelligent TTL based on content type
   */
  static async cacheAIResponse(
    prefix: string,
    inputData: any,
    responseData: any,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const key = options.key || this.generateKey(prefix, inputData);
      const ttl = this.calculateTTL(prefix, options.ttl);

      const cacheData = {
        data: responseData,
        metadata: {
          createdAt: new Date().toISOString(),
          prefix,
          tags: options.tags || [],
          ttl,
        },
      };

      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(key, ttl, JSON.stringify(cacheData));

          // Store tag mappings for selective invalidation
          if (options.tags && options.tags.length > 0) {
            const tagPromises = options.tags.map((tag) =>
              client.sAdd(`${this.CACHE_PREFIX}tag:${tag}`, key),
            );
            await Promise.all(tagPromises);
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping AI response cache", {
            key: options.key || this.generateKey(prefix, inputData),
          });
        },
      );

      logger.debug("AI response cached", {
        key,
        prefix,
        ttl,
        dataSize: JSON.stringify(responseData).length,
      });
    } catch (error) {
      // Cache failures should not break AI operations
      logger.error("Failed to cache AI response", {
        error: error instanceof Error ? error.message : "Unknown error",
        prefix,
        key: options.key,
      });
    }
  }

  /**
   * Get cached AI response
   */
  static async getAIResponse(
    prefix: string,
    inputData: any,
    options: CacheOptions = {},
  ): Promise<any | null> {
    try {
      const key = options.key || this.generateKey(prefix, inputData);

      const cached = await redisManager.executeWithFallback(
        async (client) => {
          const data = await client.get(key);
          return data ? JSON.parse(data) : null;
        },
        async () => null,
      );

      if (!cached) {
        return null;
      }

      // Validate cache integrity
      if (!this.validateCacheEntry(cached, prefix)) {
        await this.invalidateKey(key);
        return null;
      }

      logger.debug("AI response cache hit", {
        key,
        prefix,
        age: Date.now() - new Date(cached.metadata.createdAt).getTime(),
      });

      return cached.data;
    } catch (error) {
      logger.error("Failed to retrieve AI response from cache", {
        error: error instanceof Error ? error.message : "Unknown error",
        prefix,
      });
      return null;
    }
  }

  /**
   * Calculate intelligent TTL based on content type
   */
  private static calculateTTL(prefix: string, customTTL?: number): number {
    if (customTTL) {
      return customTTL;
    }

    // Different TTLs for different types of AI responses
    switch (prefix) {
      case "iflow-completion":
        return 1800; // 30 minutes - AI reasoning can be updated
      case "tavily-research":
        return 7200; // 2 hours - market research changes slower
      case "blueprint-draft":
        return 3600; // 1 hour - blueprint patterns evolve
      case "market-analysis":
        return 14400; // 4 hours - market data relatively stable
      default:
        return this.DEFAULT_TTL;
    }
  }

  /**
   * Validate cache entry integrity
   */
  private static validateCacheEntry(
    entry: any,
    expectedPrefix: string,
  ): boolean {
    if (!entry || !entry.data || !entry.metadata) {
      return false;
    }

    if (entry.metadata.prefix !== expectedPrefix) {
      return false;
    }

    // Check if cache is expired (double-check)
    const age = Date.now() - new Date(entry.metadata.createdAt).getTime();
    if (age > entry.metadata.ttl * 1000) {
      return false;
    }

    return true;
  }

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
      logger.error("Failed to invalidate cache key", {
        error: error instanceof Error ? error.message : "Unknown error",
        key,
      });
    }
  }

  /**
   * Invalidate cache by tag
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      await redisManager.executeWithFallback(
        async (client) => {
          const keys = await client.sMembers(`${this.CACHE_PREFIX}tag:${tag}`);
          if (keys.length > 0) {
            for (const key of keys) {
              await client.del(key as string);
            }
            await client.del(`${this.CACHE_PREFIX}tag:${tag}`);
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
      logger.error("Failed to invalidate cache by tag", {
        error: error instanceof Error ? error.message : "Unknown error",
        tag,
      });
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
  }> {
    try {
      const stats = await redisManager.executeWithFallback(
        async (client) => {
          const info = await client.info("memory");
          const keyspace = await client.info("keyspace");

          const memoryMatch = info.match(/used_memory:(\d+)/);
          const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

          // Estimate total keys from keyspace info
          const keysMatch = keyspace.match(/keys=(\d+)/);
          const totalKeys = keysMatch ? parseInt(keysMatch[1]) : 0;

          return { totalKeys, memoryUsage };
        },
        async () => ({ totalKeys: 0, memoryUsage: 0 }),
      );

      return {
        ...stats,
        hitRate: 0, // Would need tracking implementation
      };
    } catch (error) {
      logger.error("Failed to get cache statistics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { totalKeys: 0, hitRate: 0, memoryUsage: 0 };
    }
  }

  /**
   * Warm up cache with common patterns
   */
  static async warmupCache(): Promise<void> {
    try {
      logger.info("Starting cache warmup");

      // Common blueprint patterns could be pre-cached here
      // This is a placeholder for future enhancement

      logger.info("Cache warmup completed");
    } catch (error) {
      logger.error("Cache warmup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
