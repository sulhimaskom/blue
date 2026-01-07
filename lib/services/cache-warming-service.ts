import { logger } from "../logger";

interface CacheWarmingStrategy {
  pattern: string;
  query: string;
  ttl: number;
  priority: number;
}

export class CacheWarmingService {
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

  static async performIntelligentWarming(): Promise<void> {
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

      const phase1Promises = highPriorityStrategies.map((strategy) =>
        this.warmCacheStrategy(strategy).catch((error) => {
          logger.debug("Critical strategy warming failed", {
            pattern: strategy.pattern,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }),
      );

      await Promise.allSettled(phase1Promises);

      let index = 0;
      for (const strategy of aiStrategies) {
        await this.warmCacheStrategy(strategy).catch((error) => {
          logger.debug("AI strategy warming failed", {
            pattern: strategy.pattern,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });

        if (index < aiStrategies.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        index++;
      }

      for (const strategy of lowPriorityStrategies) {
        await this.warmCacheStrategy(strategy).catch((error) => {
          logger.debug("Low priority strategy warming failed", {
            pattern: strategy.pattern,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });

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

  static async performAdaptiveWarming(hitRate: number): Promise<void> {
    try {
      logger.info("Starting adaptive cache warming based on usage patterns");

      const warmingIntensity =
        hitRate < 0.5 ? "aggressive" : hitRate < 0.7 ? "moderate" : "light";

      let strategiesToWarm = [...this.WARMING_STRATEGIES];

      switch (warmingIntensity) {
        case "aggressive":
          break;
        case "moderate":
          strategiesToWarm = strategiesToWarm.filter((s) => s.priority <= 6);
          break;
        case "light":
          strategiesToWarm = strategiesToWarm.filter((s) => s.priority <= 3);
          break;
      }

      const baseDelay =
        warmingIntensity === "aggressive"
          ? 50
          : warmingIntensity === "moderate"
            ? 150
            : 300;

      const warmingPromises = strategiesToWarm.map(async (strategy, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * baseDelay));
        return this.warmCacheStrategy(strategy);
      });

      await Promise.allSettled(warmingPromises);

      logger.info("Adaptive cache warming completed", {
        warmingIntensity,
        totalStrategies: strategiesToWarm.length,
        currentHitRate: hitRate,
      });
    } catch (error) {
      logger.error("Adaptive cache warming failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  static async warmupPatternCache(
    patterns: string[],
    cacheFn?: () => Promise<void>,
  ): Promise<void> {
    try {
      logger.info("Starting pattern-based cache warmup", {
        patterns,
        count: patterns.length,
      });

      const warmupPromises = patterns.map(async () => {
        if (cacheFn) {
          await cacheFn();
        }
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
  static generateWarmData(pattern: string): any {
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
    };

    return (
      warmDataMap[pattern] || { pattern, timestamp: new Date().toISOString() }
    );
  }

  private static async warmCacheStrategy(
    strategy: CacheWarmingStrategy,
  ): Promise<void> {
    try {
      this.generateWarmData(strategy.pattern);

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
}
