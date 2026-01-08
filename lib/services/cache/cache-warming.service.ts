/* eslint-disable no-unused-vars */
import { logger } from "../../logger";
import { Timing } from "@/lib/utils/time-measurement";

export interface CacheWarmingStrategy {
  pattern: string;
  query: string;
  ttl: number;
  priority: number;
}

/**
 * Service for proactive cache warming strategies and optimization
 * Handles intelligent cache warming based on usage patterns and system performance
 */
export class CacheWarmingService {
  // Enhanced warming strategies with AI-specific patterns
  private static readonly WARMING_STRATEGIES: CacheWarmingStrategy[] = [
    {
      pattern: "health-check",
      query: "/api/health",
      ttl: 60,
      priority: 1,
    },
    {
      pattern: "metrics-summary",
      query: "/api/metrics?summary=true",
      ttl: 30,
      priority: 2,
    },
    {
      pattern: "circuit-breaker-status",
      query: "/api/circuit-breakers/metrics",
      ttl: 45,
      priority: 2,
    },
    {
      pattern: "user-blueprint-list",
      query: "/api/blueprints",
      ttl: 300,
      priority: 3,
    },
    // AI-specific warming strategies
    {
      pattern: "iflow-blueprint-generation",
      query: "ai:iflow:blueprint:marketplace",
      ttl: 1800,
      priority: 4,
    },
    {
      pattern: "tavily-market-research",
      query: "research:tavily:market-analysis",
      ttl: 7200,
      priority: 4,
    },
    {
      pattern: "blueprint-skeleton-ecommerce",
      query: "blueprint:skeleton:ecommerce",
      ttl: 14400,
      priority: 5,
    },
    {
      pattern: "blueprint-skeleton-marketplace",
      query: "blueprint:skeleton:marketplace",
      ttl: 14400,
      priority: 5,
    },
    {
      pattern: "blueprint-skeleton-social",
      query: "blueprint:skeleton:social",
      ttl: 14400,
      priority: 5,
    },
    {
      pattern: "blueprint-skeleton-dashboard",
      query: "blueprint:skeleton:dashboard",
      ttl: 14400,
      priority: 5,
    },
    {
      pattern: "tech-stack-recommendations",
      query: "blueprint:tech-stack:default",
      ttl: 3600,
      priority: 6,
    },
    {
      pattern: "feature-templates",
      query: "blueprint:features:common",
      ttl: 7200,
      priority: 6,
    },
  ];

  /**
   * Enhanced intelligent cache warming with performance optimization
   */
  static async performIntelligentWarming(
    // eslint-disable-next-line no-unused-vars
    cacheDataFunction: (
      _prefix: string,
      _inputData: any,
      _responseData: any,
      _options: any,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      logger.info("Starting enhanced intelligent cache warming");

      const sortedStrategies = [...this.WARMING_STRATEGIES].sort(
        (a, b) => a.priority - b.priority,
      );

      const highPriorityStrategies: CacheWarmingStrategy[] = [];
      const aiStrategies: CacheWarmingStrategy[] = [];
      const lowPriorityStrategies: CacheWarmingStrategy[] = [];

      for (const strategy of sortedStrategies) {
        if (strategy.priority <= 3) {
          highPriorityStrategies.push(strategy);
        } else if (strategy.priority > 3 && strategy.priority <= 6) {
          aiStrategies.push(strategy);
        } else {
          lowPriorityStrategies.push(strategy);
        }
      }

      // Phase 1: Critical infrastructure (parallel execution)
      const phase1Promises = highPriorityStrategies.map((strategy) =>
        this.warmCacheStrategy(strategy, cacheDataFunction).catch((error) => {
          logger.debug("Critical strategy warming failed", {
            pattern: strategy.pattern,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }),
      );

      await Promise.allSettled(phase1Promises);

      // Phase 2: AI-specific strategies (staggered execution to avoid overwhelming APIs)
      let index = 0;
      for (const strategy of aiStrategies) {
        await this.warmCacheStrategy(strategy, cacheDataFunction).catch(
          (error) => {
            logger.debug("AI strategy warming failed", {
              pattern: strategy.pattern,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          },
        );

        // Stagger AI strategy warming by 200ms to avoid rate limiting
        if (index < aiStrategies.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        index++;
      }

      // Phase 3: Low priority strategies (sequential with longer delays)
      for (const strategy of lowPriorityStrategies) {
        await this.warmCacheStrategy(strategy, cacheDataFunction).catch(
          (error) => {
            logger.debug("Low priority strategy warming failed", {
              pattern: strategy.pattern,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          },
        );

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      logger.info("Enhanced intelligent cache warming completed", {
        totalStrategies: sortedStrategies.length,
        highPriorityCount: highPriorityStrategies.length,
        aiStrategiesCount: aiStrategies.length,
        lowPriorityCount: lowPriorityStrategies.length,
      });
    } catch (error) {
      logger.error("Enhanced intelligent cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Perform adaptive cache warming based on real-time usage patterns
   */
  static async performAdaptiveWarming(
    // eslint-disable-next-line no-unused-vars
    cacheDataFunction: (
      _prefix: string,
      _inputData: any,
      _responseData: any,
      _options: any,
    ) => Promise<void>,
    getCacheStatsFunction: () => Promise<{ hitRate: number }>,
  ): Promise<void> {
    try {
      logger.info("Starting adaptive cache warming based on usage patterns");

      // Get current cache statistics to identify patterns
      const cacheStats = await getCacheStatsFunction();
      const hitRate = cacheStats.hitRate;

      // Warm more aggressively if hit rate is low
      const warmingIntensity =
        hitRate < 0.5 ? "aggressive" : hitRate < 0.7 ? "moderate" : "light";

      // Select strategies based on current performance
      let strategiesToWarm = [...this.WARMING_STRATEGIES];

      switch (warmingIntensity) {
        case "aggressive":
          // Warm all strategies
          break;
        case "moderate":
          // Focus on AI and high-impact strategies
          strategiesToWarm = strategiesToWarm.filter((s) => s.priority <= 6);
          break;
        case "light":
          // Only critical strategies
          strategiesToWarm = strategiesToWarm.filter((s) => s.priority <= 3);
          break;
      }

      // Warm selected strategies with adaptive timing
      const baseDelay =
        warmingIntensity === "aggressive"
          ? 50
          : warmingIntensity === "moderate"
            ? 150
            : 300;

      const warmingPromises = strategiesToWarm.map(async (strategy, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * baseDelay));
        return this.warmCacheStrategy(strategy, cacheDataFunction);
      });

      const results = await Promise.allSettled(warmingPromises);
      let successful = 0;
      let failed = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          successful++;
        } else {
          failed++;
        }
      }

      logger.info("Adaptive cache warming completed", {
        warmingIntensity,
        totalStrategies: strategiesToWarm.length,
        successful,
        failed,
        currentHitRate: hitRate,
      });
    } catch (error) {
      logger.error("Adaptive cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Warm a specific cache strategy
   */
  private static async warmCacheStrategy(
    strategy: CacheWarmingStrategy,
    // eslint-disable-next-line no-unused-vars
    cacheDataFunction: (
      _prefix: string,
      _inputData: any,
      _responseData: any,
      _options: any,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      const warmData = {
        pattern: strategy.pattern,
        warmAt: new Date().toISOString(),
        data: this.generateWarmData(strategy.pattern),
      };

      await cacheDataFunction(
        "cache-warmup",
        { pattern: strategy.pattern },
        warmData,
        {
          ttl: strategy.ttl,
          tags: ["cache-warmup", strategy.pattern],
        },
      );

      logger.debug("Cache strategy warmed", {
        pattern: strategy.pattern,
        ttl: strategy.ttl,
      });
    } catch (error) {
      logger.debug("Cache strategy warming failed", {
        pattern: strategy.pattern,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Pattern-based cache warming for blueprint types
   */
  static async warmupPatternCache(
    patterns: string[],
    // eslint-disable-next-line no-unused-vars
    cacheDataFunction: (
      _prefix: string,
      _inputData: any,
      _responseData: any,
      _options: any,
    ) => Promise<void>,
  ): Promise<void> {
    try {
      logger.info("Starting pattern-based cache warmup", {
        patterns,
        count: patterns.length,
      });

      const warmupPromises = patterns.map(async (pattern) => {
        const skeletonData = {
          pattern,
          timestamp: Timing.now(),
        };

        await cacheDataFunction(
          "blueprint-skeleton",
          { pattern },
          skeletonData,
          {
            ttl: 14400,
            tags: ["blueprint-skeleton", pattern, "pre-warmed"],
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
   * Generate warm data for different patterns with AI-specific data
   */
  private static generateWarmData(pattern: string): any {
    const warmDataMap: Record<string, any> = {
      "health-check": {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      "metrics-summary": {
        cpu: "0%",
        memory: "45%",
        responseTime: "120ms",
        requestRate: "15/s",
      },
      "circuit-breaker-status": {
        "ai-iflow": { state: "CLOSED", successRate: 100 },
        "research-tavily": { state: "CLOSED", successRate: 100 },
        "github-api": { state: "CLOSED", successRate: 100 },
      },
      "user-blueprint-list": {
        projects: [],
        total: 0,
        cached: true,
      },
      // AI-specific warm data
      "iflow-blueprint-generation": {
        blueprintContent: {
          title: "Sample Marketplace Blueprint",
          description: "Pre-warmed marketplace blueprint template",
          techStack: ["Next.js", "TypeScript", "PostgreSQL", "Redis"],
          features: [
            "User authentication",
            "Product listings",
            "Payment processing",
          ],
          deployment: "Vercel + Neon PostgreSQL",
        },
        aiModel: "iflow-gpt-4",
        generatedAt: new Date().toISOString(),
        confidence: 0.95,
      },
      "tavily-market-research": {
        marketAnalysis: {
          marketSize: "$2.5B annual market",
          trends: ["AI integration", "Mobile-first", "Social commerce"],
          competitors: ["Etsy", "Shopify", "Amazon Handmade"],
          opportunities: [
            "Niche markets",
            "AI-powered recommendations",
            "Sustainable products",
          ],
        },
        researchTimestamp: new Date().toISOString(),
        sources: ["Industry reports", "Market analysis", "Competitor analysis"],
      },
      "blueprint-skeleton-ecommerce": {
        structure: {
          sections: [
            "Product Catalog",
            "Shopping Cart",
            "Checkout",
            "User Management",
            "Admin Dashboard",
          ],
          databaseSchema: [
            "products",
            "users",
            "orders",
            "categories",
            "reviews",
          ],
          apiEndpoints: ["products", "cart", "checkout", "auth", "admin"],
          frontendComponents: [
            "ProductList",
            "ProductDetail",
            "Cart",
            "CheckoutForm",
          ],
        },
        estimatedLines: 15000,
        complexity: "medium",
      },
      "blueprint-skeleton-marketplace": {
        structure: {
          sections: [
            "User Profiles",
            "Product Listings",
            "Messaging",
            "Reviews",
            "Payments",
          ],
          databaseSchema: [
            "users",
            "products",
            "conversations",
            "reviews",
            "transactions",
          ],
          apiEndpoints: [
            "users",
            "products",
            "messages",
            "reviews",
            "payments",
          ],
          frontendComponents: [
            "UserProfile",
            "ProductCard",
            "MessageThread",
            "ReviewForm",
          ],
        },
        estimatedLines: 20000,
        complexity: "high",
      },
      "blueprint-skeleton-social": {
        structure: {
          sections: [
            "Feed",
            "User Profiles",
            "Posts",
            "Comments",
            "Notifications",
          ],
          databaseSchema: ["users", "posts", "comments", "likes", "follows"],
          apiEndpoints: ["posts", "users", "comments", "notifications"],
          frontendComponents: [
            "FeedList",
            "PostCard",
            "UserProfileCard",
            "CommentThread",
          ],
        },
        estimatedLines: 18000,
        complexity: "high",
      },
      "blueprint-skeleton-dashboard": {
        structure: {
          sections: [
            "Analytics",
            "User Management",
            "Settings",
            "Reports",
            "Real-time Monitoring",
          ],
          databaseSchema: ["analytics", "users", "settings", "reports"],
          apiEndpoints: ["analytics", "users", "settings", "reports"],
          frontendComponents: [
            "DashboardGrid",
            "ChartWidget",
            "DataTable",
            "SettingsForm",
          ],
        },
        estimatedLines: 12000,
        complexity: "medium",
      },
      "tech-stack-recommendations": {
        recommendations: {
          frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          backend: ["Node.js", "Express", "PostgreSQL", "Redis"],
          deployment: ["Vercel", "Neon", "Redis Cloud"],
          monitoring: [
            "Structured logging",
            "Health checks",
            "Performance metrics",
          ],
        },
        reasoning:
          "Optimized for performance, scalability, and developer experience",
        alternatives: {
          frontend: ["Vue.js", "Nuxt.js"],
          backend: ["Python", "FastAPI"],
          database: ["MongoDB", "Supabase"],
        },
      },
      "feature-templates": {
        common: [
          {
            name: "User Authentication",
            description: "Complete auth system with social login",
            estimatedHours: 40,
            files: 15,
          },
          {
            name: "Payment Integration",
            description: "Stripe payment processing with subscription support",
            estimatedHours: 60,
            files: 20,
          },
          {
            name: "Admin Dashboard",
            description: "Complete admin interface with CRUD operations",
            estimatedHours: 80,
            files: 25,
          },
        ],
      },
    };

    return (
      warmDataMap[pattern] || { pattern, warmedAt: Timing.now(), data: null }
    );
  }

  /**
   * Get all warming strategies
   */
  static getWarmingStrategies(): CacheWarmingStrategy[] {
    return [...this.WARMING_STRATEGIES];
  }

  /**
   * Add new warming strategy
   */
  static addWarmingStrategy(strategy: CacheWarmingStrategy): void {
    this.WARMING_STRATEGIES.push(strategy);
    logger.info("Cache warming strategy added", { pattern: strategy.pattern });
  }

  /**
   * Remove warming strategy by pattern
   */
  static removeWarmingStrategy(pattern: string): boolean {
    const index = this.WARMING_STRATEGIES.findIndex(
      (s) => s.pattern === pattern,
    );
    if (index >= 0) {
      this.WARMING_STRATEGIES.splice(index, 1);
      logger.info("Cache warming strategy removed", { pattern });
      return true;
    }
    return false;
  }
}
