import { NextRequest, NextResponse } from "next/server";
import { redisManager } from "./redis";
import { logger } from "./logger";
import crypto from "crypto";

export interface ResponseCacheOptions {
  ttl: number; // Time to live in seconds
  varyBy?: string[]; // Request headers to vary cache by (e.g., ['authorization'])
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for larger responses
}

export interface CachedResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  metadata: {
    createdAt: string;
    etag: string;
    compressed: boolean;
    size: number;
    tags: string[];
  };
}

export class ResponseCache {
  private static readonly CACHE_PREFIX = "response:";
  private static readonly DEFAULT_TTL = 300; // 5 minutes default

  /**
   * Generate cache key from request URL and varying headers
   */
  private static generateKey(req: NextRequest, varyBy: string[] = []): string {
    const url = new URL(req.url);
    const keyComponents = [
      url.pathname,
      url.search,
      // Include varying headers for cache segmentation
      ...varyBy.map((header) => `${header}:${req.headers.get(header) || ""}`),
    ];

    const keyString = keyComponents.join("|");
    const hash = crypto
      .createHash("sha256")
      .update(keyString)
      .digest("hex")
      .substring(0, 16);

    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Generate ETag for response validation
   */
  private static generateETag(data: any): string {
    const content = JSON.stringify(data);
    return `"${crypto.createHash("md5").update(content).digest("hex")}"`;
  }

  /**
   * Check if response can be cached
   */
  private static isCacheable(response: NextResponse): boolean {
    const status = response.status;

    // Only cache successful responses
    if (status < 200 || status >= 300) {
      return false;
    }

    // Don't cache if explicitly forbidden
    const cacheControl = response.headers.get("cache-control");
    if (
      cacheControl?.includes("no-cache") ||
      cacheControl?.includes("no-store")
    ) {
      return false;
    }

    // Don't cache very large responses (>1MB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return false;
    }

    return true;
  }

  /**
   * Cache HTTP response with metadata
   */
  static async cacheResponse(
    req: NextRequest,
    response: NextResponse,
    options: ResponseCacheOptions,
  ): Promise<void> {
    try {
      if (!this.isCacheable(response)) {
        return;
      }

      const key = this.generateKey(req, options.varyBy);
      const responseData = await response.json();
      const etag = this.generateETag(responseData);

      const cachedResponse: CachedResponse = {
        data: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        metadata: {
          createdAt: new Date().toISOString(),
          etag,
          compressed: options.compress || false,
          size: JSON.stringify(responseData).length,
          tags: options.tags || [],
        },
      };

      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(key, options.ttl, JSON.stringify(cachedResponse));

          // Store tag mappings for selective invalidation
          if (options.tags && options.tags.length > 0) {
            const tagPromises = options.tags.map((tag) =>
              client.sAdd(`${this.CACHE_PREFIX}tag:${tag}`, key),
            );
            await Promise.all(tagPromises);
          }
        },
        async () => {
          logger.warn("Redis unavailable, skipping response cache", { key });
        },
      );

      logger.debug("Response cached", {
        key,
        url: req.url,
        status: response.status,
        size: cachedResponse.metadata.size,
        ttl: options.ttl,
        tags: options.tags,
      });
    } catch (error) {
      logger.error("Failed to cache response", {
        error: error instanceof Error ? error.message : "Unknown error",
        url: req.url,
      });
    }
  }

  /**
   * Get cached response or handle conditional requests
   */
  static async getCachedResponse(
    req: NextRequest,
    options: ResponseCacheOptions,
  ): Promise<NextResponse | null> {
    try {
      const key = this.generateKey(req, options.varyBy);
      const ifNoneMatch = req.headers.get("if-none-match");

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
      if (!this.validateCachedResponse(cached)) {
        await this.invalidateKey(key);
        return null;
      }

      // Handle conditional requests (ETag validation)
      if (ifNoneMatch && ifNoneMatch === cached.metadata.etag) {
        const response = new NextResponse(null, { status: 304 });
        response.headers.set("etag", cached.metadata.etag);
        response.headers.set("cache-control", `max-age=${options.ttl}`);
        response.headers.set("x-cache-status", "HIT");

        logger.debug("Conditional cache hit - 304 Not Modified", {
          key,
          url: req.url,
          etag: cached.metadata.etag,
        });

        return response;
      }

      // Return cached response
      const response = NextResponse.json(cached.data, {
        status: cached.status,
      });

      // Restore headers
      Object.entries(cached.headers).forEach(([key, value]) => {
        response.headers.set(key, value as string);
      });

      // Add cache metadata
      response.headers.set("etag", cached.metadata.etag);
      response.headers.set("cache-control", `max-age=${options.ttl}`);
      response.headers.set("x-cache-status", "HIT");
      response.headers.set(
        "x-cache-age",
        Math.floor(
          (Date.now() - new Date(cached.metadata.createdAt).getTime()) / 1000,
        ).toString(),
      );

      logger.debug("Cache hit", {
        key,
        url: req.url,
        status: cached.status,
        age: Math.floor(
          (Date.now() - new Date(cached.metadata.createdAt).getTime()) / 1000,
        ),
        size: cached.metadata.size,
      });

      return response;
    } catch (error) {
      logger.error("Failed to retrieve cached response", {
        error: error instanceof Error ? error.message : "Unknown error",
        url: req.url,
      });
      return null;
    }
  }

  /**
   * Validate cached response integrity
   */
  private static validateCachedResponse(cached: any): boolean {
    if (!cached || !cached.data || !cached.metadata) {
      return false;
    }

    // Check if cache entry has required fields
    const requiredFields = ["createdAt", "etag", "compressed", "size", "tags"];
    for (const field of requiredFields) {
      if (!(field in cached.metadata)) {
        return false;
      }
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

      logger.info("Response cache invalidated by tag", { tag });
    } catch (error) {
      logger.error("Failed to invalidate cache by tag", {
        error: error instanceof Error ? error.message : "Unknown error",
        tag,
      });
    }
  }

  /**
   * Middleware wrapper for automatic response caching
   */
  static async withCache(
    req: NextRequest,
    handler: () => Promise<NextResponse>,
    options: ResponseCacheOptions,
  ): Promise<NextResponse> {
    // Try to get cached response first
    const cachedResponse = await this.getCachedResponse(req, options);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Generate fresh response
    const freshResponse = await handler();

    // Cache the fresh response for future requests
    await this.cacheResponse(req, freshResponse, options);

    // Add cache miss header
    freshResponse.headers.set("x-cache-status", "MISS");

    return freshResponse;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
    tags: Record<string, number>;
  }> {
    try {
      const stats = await redisManager.executeWithFallback(
        async (client) => {
          // Get total response cache keys
          const responseKeys = await client.keys(`${this.CACHE_PREFIX}*`);
          const nonTagKeys = responseKeys.filter(
            (key) => !key.includes(":tag:"),
          );

          // Get memory info
          const info = await client.info("memory");
          const memoryMatch = info.match(/used_memory:(\d+)/);
          const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

          // Count keys per tag
          const tagKeys = responseKeys.filter((key) => key.includes(":tag:"));
          const tags: Record<string, number> = {};

          for (const tagKey of tagKeys) {
            const tagName = tagKey.split(":tag:")[1];
            const memberCount = await client.sCard(tagKey);
            tags[tagName] = memberCount;
          }

          return {
            totalKeys: nonTagKeys.length,
            memoryUsage,
            tags,
          };
        },
        async () => ({ totalKeys: 0, memoryUsage: 0, tags: {} }),
      );

      return {
        ...stats,
        hitRate: 0, // Would need tracking implementation
      };
    } catch (error) {
      logger.error("Failed to get response cache statistics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { totalKeys: 0, hitRate: 0, memoryUsage: 0, tags: {} };
    }
  }
}
