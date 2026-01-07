/**
 * Atomic service for generic data caching operations
 * Extracted from UnifiedCacheManager to follow blueprint.md Service Layer principles
 */
import { redisManager } from "../redis";
import { logger } from "../logger";
import { CacheKeyService } from "./cache-key-service";
import { CacheTTLService } from "./cache-ttl-service";

export interface CacheDataOptions {
  ttl?: number;
  tags?: string[];
  priority?: number;
}

export interface CacheEntry<T> {
  data: T;
  metadata: {
    createdAt: string;
    expiresAt?: string;
    tags: string[];
    priority: number;
    size: number;
  };
}

/**
 * Atomic service responsible only for generic data caching
 * Follows blueprint.md Service Layer principle: Single responsibility, no business logic in UI
 */
export class CacheDataService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour

  /**
   * Cache data with automatic key generation and TTL calculation
   */
  static async cacheData<T>(
    prefix: string,
    data: T,
    params: any = {},
    options: CacheDataOptions = {},
  ): Promise<string> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        logger.warn("Redis unavailable for data caching", { prefix });
        return "";
      }

      // Generate cache key
      const key = CacheKeyService.generateKey(prefix, params);

      // Calculate TTL
      const ttl = options.ttl || CacheTTLService.calculateTTL(prefix, params);

      // Prepare cache entry
      const cacheEntry: CacheEntry<T> = {
        data,
        metadata: {
          createdAt: new Date().toISOString(),
          expiresAt:
            ttl > 0
              ? new Date(Date.now() + ttl * 1000).toISOString()
              : undefined,
          tags: options.tags || [],
          priority: options.priority || 1,
          size: JSON.stringify(data).length,
        },
      };

      // Store in Redis
      const serialized = JSON.stringify(cacheEntry);
      await redis.setEx(key, ttl, serialized);

      // Store tag mappings for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeTagMappings(key, options.tags);
      }

      logger.info("Data cached successfully", {
        key,
        prefix,
        ttl,
        size: cacheEntry.metadata.size,
        tags: options.tags,
      });

      return key;
    } catch (error) {
      logger.error("Failed to cache data", { prefix, params, error });
      throw error;
    }
  }

  /**
   * Get cached data with automatic validation
   */
  static async getData<T>(
    prefix: string,
    params: any = {},
    // eslint-disable-next-line no-unused-vars
    validator?: (data: T) => boolean,
  ): Promise<T | null> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        logger.warn("Redis unavailable for data retrieval", { prefix });
        return null;
      }

      // Generate cache key
      const key = CacheKeyService.generateKey(prefix, params);

      // Retrieve from Redis
      const cached = await redis.get(key);
      if (!cached) {
        logger.debug("Cache miss", { key, prefix });
        return null;
      }

      // Parse cache entry
      const cacheEntry: CacheEntry<T> = JSON.parse(cached);

      // Validate expiration
      if (cacheEntry.metadata.expiresAt) {
        const expiresAt = new Date(cacheEntry.metadata.expiresAt);
        if (expiresAt <= new Date()) {
          logger.debug("Cache entry expired", { key, prefix });
          await redis.del(key);
          return null;
        }
      }

      // Validate data integrity
      if (validator && !validator(cacheEntry.data)) {
        logger.debug("Cache entry failed validation", { key, prefix });
        await redis.del(key);
        return null;
      }

      logger.info("Cache hit", { key, prefix, size: cacheEntry.metadata.size });
      return cacheEntry.data;
    } catch (error) {
      logger.error("Failed to get cached data", { prefix, params, error });
      return null;
    }
  }

  /**
   * Store tag mappings for cache invalidation
   */
  private static async storeTagMappings(
    key: string,
    tags: string[],
  ): Promise<void> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await redis.sAdd(tagKey, key);
        await redis.expire(tagKey, 86400); // tags expire in 24 hours
      }
    } catch (error) {
      logger.error("Failed to store tag mappings", { key, tags, error });
    }
  }

  /**
   * Check if data exists in cache
   */
  static async hasData(prefix: string, params: any = {}): Promise<boolean> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return false;

      const key = CacheKeyService.generateKey(prefix, params);
      const exists = await redis.exists(key);

      return exists > 0;
    } catch (error) {
      logger.error("Failed to check cache existence", {
        prefix,
        params,
        error,
      });
      return false;
    }
  }

  /**
   * Get multiple cached entries in parallel
   */
  static async getMultipleData<T>(
    entries: Array<{ prefix: string; params: any }>,
    // eslint-disable-next-line no-unused-vars
    validator?: (data: T) => boolean,
  ): Promise<Array<T | null>> {
    try {
      const promises = entries.map((entry) =>
        this.getData<T>(entry.prefix, entry.params, validator),
      );

      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      logger.error("Failed to get multiple cached entries", { entries, error });
      return Array(entries.length).fill(null);
    }
  }

  /**
   * Cache multiple entries in parallel
   */
  static async cacheMultipleData<T>(
    entries: Array<{
      prefix: string;
      data: T;
      params: any;
      options?: CacheDataOptions;
    }>,
  ): Promise<string[]> {
    try {
      const promises = entries.map((entry) =>
        this.cacheData(entry.prefix, entry.data, entry.params, entry.options),
      );

      const results = await Promise.all(promises);
      return results.filter((key) => key !== ""); // Filter out failed entries
    } catch (error) {
      logger.error("Failed to cache multiple entries", { entries, error });
      return [];
    }
  }

  /**
   * Update cached data if it exists
   */
  static async updateData<T>(
    prefix: string,
    data: T,
    params: any = {},
    // eslint-disable-next-line no-unused-vars
    updater?: (existing: T) => T,
    options: CacheDataOptions = {},
  ): Promise<boolean> {
    try {
      const existing = await this.getData<T>(prefix, params);

      if (existing === null) {
        return false; // Nothing to update
      }

      const updatedData = updater ? updater(existing) : data;
      await this.cacheData(prefix, updatedData, params, options);

      logger.info("Cache data updated", { prefix, params });
      return true;
    } catch (error) {
      logger.error("Failed to update cached data", { prefix, params, error });
      return false;
    }
  }

  /**
   * Delete cached data
   */
  static async deleteData(prefix: string, params: any = {}): Promise<boolean> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) return false;

      const key = CacheKeyService.generateKey(prefix, params);
      const result = await redis.del(key);

      logger.info("Cache data deleted", { key, prefix, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error("Failed to delete cached data", { prefix, params, error });
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(prefix?: string): Promise<{
    totalKeys: number;
    totalSize: number;
    avgTTL: number;
    expirationDistribution: Record<string, number>;
  }> {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        return {
          totalKeys: 0,
          totalSize: 0,
          avgTTL: 0,
          expirationDistribution: {},
        };
      }

      const pattern = prefix
        ? `${CacheKeyService.generateKey(prefix, {})}*`
        : "ai-platform:*";
      const keys = await redis.keys(pattern);

      let totalSize = 0;
      let totalTTL = 0;
      let ttlCount = 0;
      const expirationDistribution: Record<string, number> = {};

      for (const key of keys.slice(0, 100)) {
        // Sample first 100 keys
        try {
          const ttl = await redis.ttl(key);
          const size = ((await redis.get(key)) || "").length;

          totalSize += size;
          ttlCount++;

          if (ttl > 0) {
            totalTTL += ttl;

            const ttlCategory = this.categorizeTTL(ttl);
            expirationDistribution[ttlCategory] =
              (expirationDistribution[ttlCategory] || 0) + 1;
          }
        } catch {
          // Skip problematic keys
        }
      }

      return {
        totalKeys: keys.length,
        totalSize,
        avgTTL: ttlCount > 0 ? Math.floor(totalTTL / ttlCount) : 0,
        expirationDistribution,
      };
    } catch (error) {
      logger.error("Failed to get cache stats", { prefix, error });
      return {
        totalKeys: 0,
        totalSize: 0,
        avgTTL: 0,
        expirationDistribution: {},
      };
    }
  }

  /**
   * Categorize TTL for statistics
   */
  private static categorizeTTL(ttl: number): string {
    if (ttl < 60) return "< 1 min";
    if (ttl < 300) return "1-5 min";
    if (ttl < 900) return "5-15 min";
    if (ttl < 1800) return "15-30 min";
    if (ttl < 3600) return "30-60 min";
    if (ttl < 7200) return "1-2 hours";
    if (ttl < 21600) return "2-6 hours";
    return "> 6 hours";
  }
}
