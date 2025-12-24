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

  /**
   * Intelligent cache invalidation for blueprint updates
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

      // Invalidate by tags in parallel for faster cleanup
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
   * Pattern-based cache warming for common blueprint types
   */
  static async warmupPatternCache(patterns: string[]): Promise<void> {
    try {
      logger.info("Starting pattern-based cache warmup", {
        patterns,
        count: patterns.length,
      });

      const warmupPromises = patterns.map(async (pattern) => {
        // Pre-cache common blueprint skeletons for this pattern
        const skeletonData = {
          pattern,
          timestamp: Date.now(),
          commonFeatures: this.getCommonFeaturesForPattern(pattern),
          recommendedTechStack: this.getRecommendedTechStackForPattern(pattern),
        };

        await this.cacheAIResponse(
          "blueprint-skeleton",
          { pattern },
          skeletonData,
          {
            ttl: 14400, // 4 hours for skeletons
            tags: ["blueprint-skeleton", pattern, "pre-warmed"],
          },
        );

        // Pre-cache research templates for common patterns
        const researchTemplate = this.getResearchTemplateForPattern(pattern);
        await this.cacheAIResponse(
          "research-template",
          { pattern },
          researchTemplate,
          {
            ttl: 7200, // 2 hours for research templates
            tags: ["research-template", pattern, "pre-warmed"],
          },
        );
      });

      await Promise.allSettled(warmupPromises);

      logger.info("Pattern-based cache warmup completed", {
        patterns,
        count: patterns.length,
      });
    } catch (error) {
      logger.error("Pattern-based cache warmup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        patterns,
      });
    }
  }

  /**
   * Get common features for a blueprint pattern
   */
  private static getCommonFeaturesForPattern(pattern: string): string[] {
    const patternFeatures = {
      marketplace: [
        "User authentication and profiles",
        "Product/service listings with search and filtering",
        "Ratings and review system",
        "Secure payment processing",
        "Order management and tracking",
        "Vendor/seller dashboards",
        "Communication and messaging",
        "Mobile-responsive design",
      ],
      ecommerce: [
        "Product catalog with categories",
        "Shopping cart and checkout",
        "Payment gateway integration",
        "Order management system",
        "Inventory tracking",
        "Customer account management",
        "Product recommendations",
        "Shipping and tax calculation",
      ],
      social: [
        "User profiles and social feeds",
        "Follow/friend system",
        "Content posting and sharing",
        "Likes and comments",
        "Real-time notifications",
        "Privacy controls",
        "Direct messaging",
        "Media upload and processing",
      ],
      dashboard: [
        "Data visualization widgets",
        "Real-time metrics display",
        "Customizable dashboards",
        "Data export functionality",
        "User role management",
        "Report generation",
        "API data integration",
        "Interactive charts",
      ],
      "api-service": [
        "RESTful API endpoints",
        "API authentication and rate limiting",
        "Comprehensive documentation",
        "API key management",
        "Usage analytics",
        "Webhook integration",
        "SDK and client libraries",
        "API monitoring and alerting",
      ],
      "web-app": [
        "User authentication",
        "Responsive design",
        "Database integration",
        "Form handling and validation",
        "File upload capability",
        "Search functionality",
        "Admin interface",
        "Performance optimization",
      ],
    };

    return (
      patternFeatures[pattern as keyof typeof patternFeatures] ||
      patternFeatures["web-app"]
    );
  }

  /**
   * Get recommended tech stack for a blueprint pattern
   */
  private static getRecommendedTechStackForPattern(pattern: string): any {
    const patternStacks = {
      marketplace: {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16",
        auth: "Clerk",
        deployment: "Vercel",
      },
      ecommerce: {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16",
        auth: "Clerk",
        deployment: "Vercel",
      },
      social: {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16 + Redis",
        auth: "Clerk",
        deployment: "Vercel",
      },
      dashboard: {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16",
        auth: "Clerk",
        deployment: "Vercel",
      },
      "api-service": {
        runtime: "Node.js 20+",
        framework: "Express.js",
        database: "PostgreSQL 16",
        auth: "JWT with refresh tokens",
        deployment: "AWS ECS",
      },
      "web-app": {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16",
        auth: "Clerk",
        deployment: "Vercel",
      },
    };

    return (
      patternStacks[pattern as keyof typeof patternStacks] ||
      patternStacks["web-app"]
    );
  }

  /**
   * Get research template for a blueprint pattern
   */
  private static getResearchTemplateForPattern(pattern: string): any {
    const researchTemplates = {
      marketplace: {
        queryTemplate: "Market analysis for {idea} marketplace platform",
        focusAreas: [
          "Market size and growth potential",
          "Competitor analysis and gaps",
          "Target demographics and user behavior",
          "Monetization strategies in market",
          "Technology trends and innovations",
        ],
      },
      ecommerce: {
        queryTemplate: "E-commerce market research for {idea}",
        focusAreas: [
          "E-commerce trends and statistics",
          "Competitor landscape and pricing",
          "Consumer shopping behavior",
          "Payment and logistics solutions",
          "Market opportunities and niches",
        ],
      },
      social: {
        queryTemplate: "Social media platform analysis for {idea}",
        focusAreas: [
          "Social media usage patterns",
          "Community engagement strategies",
          "Privacy and regulatory considerations",
          "Monetization in social platforms",
          "Emerging social trends",
        ],
      },
      dashboard: {
        queryTemplate: "Analytics and dashboard market for {idea}",
        focusAreas: [
          "Data visualization trends",
          "Business intelligence market",
          "Integration requirements",
          "User interface innovations",
          "Competitive analysis",
        ],
      },
      "api-service": {
        queryTemplate: "API-as-a-Service market analysis for {idea}",
        focusAreas: [
          "API market growth and trends",
          "Developer experience standards",
          "Integration patterns",
          "Monetization models for APIs",
          "Technology stack preferences",
        ],
      },
      "web-app": {
        queryTemplate: "Web application market research for {idea}",
        focusAreas: [
          "Web application trends",
          "User experience expectations",
          "Technology landscape",
          "Market validation",
          "Growth strategies",
        ],
      },
    };

    return (
      researchTemplates[pattern as keyof typeof researchTemplates] ||
      researchTemplates["web-app"]
    );
  }

  /**
   * Get cache hit rate statistics (mock implementation)
   */
  static async getCacheHitRate(): Promise<number> {
    try {
      // In a real implementation, this would track hit/miss metrics
      // For now, return a mock value based on cache performance expectations
      return 0.65; // 65% hit rate
    } catch (error) {
      logger.error("Failed to get cache hit rate", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return 0;
    }
  }
}
