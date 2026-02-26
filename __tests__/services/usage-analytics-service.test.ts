/**
 * Usage Analytics Service Tests
 *
 * @domain ai-agent-engineer
 * @date 2026-02-26
 * @author AI Agent Engineer
 *
 * Tests for the UsageAnalyticsService which provides analytics aggregation
 * and statistics calculation for AI usage patterns.
 */

import { UsageAnalyticsService } from "../../lib/services/usage-analytics-service";
import { UnifiedCacheManager } from "../../lib/services/cache-orchestrator";
import { PatternDetectionService } from "../../lib/services/pattern-detection-service";

// Mock dependencies
jest.mock("../../lib/services/cache-orchestrator");
jest.mock("../../lib/services/pattern-detection-service");
jest.mock("../../lib/logger");

describe("UsageAnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUsageAnalytics", () => {
    test("should return comprehensive usage analytics with cache stats", async () => {
      // Mock cache stats
      const mockCacheStats = {
        aiCacheStats: {
          aiCacheHitRate: 0.75,
          iflowCacheHits: 100,
          tavilyCacheHits: 50,
          estimatedCostSavings: 25.5,
        },
      };
      (UnifiedCacheManager.getCacheStats as jest.Mock).mockResolvedValue(
        mockCacheStats
      );

      const analytics = await UsageAnalyticsService.getUsageAnalytics();

      expect(analytics).toHaveProperty("totalRequests");
      expect(analytics).toHaveProperty("patternDistribution");
      expect(analytics).toHaveProperty("cacheHitRates");
      expect(analytics).toHaveProperty("costSavings");
      expect(analytics).toHaveProperty("lastAnalyzed");
      expect(analytics.totalRequests).toBe(150); // 100 + 50
      expect(analytics.cacheHitRates.iflow).toBe(0.75);
      expect(analytics.costSavings).toBe(25.5);
    });

    test("should calculate pattern distribution based on iflow hits", async () => {
      const mockCacheStats = {
        aiCacheStats: {
          aiCacheHitRate: 0.5,
          iflowCacheHits: 100,
          tavilyCacheHits: 0,
          estimatedCostSavings: 10,
        },
      };
      (UnifiedCacheManager.getCacheStats as jest.Mock).mockResolvedValue(
        mockCacheStats
      );

      const analytics = await UsageAnalyticsService.getUsageAnalytics();

      expect(analytics.patternDistribution).toHaveProperty("marketplace");
      expect(analytics.patternDistribution.marketplace).toBe(15); // 100 * 0.15
      expect(analytics.patternDistribution.fintech).toBe(15); // 100 * 0.15
      expect(analytics.patternDistribution.healthcare).toBe(12); // 100 * 0.12
    });

    test("should handle cache stats failure gracefully", async () => {
      (UnifiedCacheManager.getCacheStats as jest.Mock).mockRejectedValue(
        new Error("Redis connection failed")
      );

      const analytics = await UsageAnalyticsService.getUsageAnalytics();

      expect(analytics.totalRequests).toBe(0);
      expect(analytics.patternDistribution.marketplace).toBe(0);
      expect(analytics.cacheHitRates.overall).toBe(0);
      expect(analytics.costSavings).toBe(0);
    });

    test("should handle zero hits gracefully", async () => {
      const mockCacheStats = {
        aiCacheStats: {
          aiCacheHitRate: 0,
          iflowCacheHits: 0,
          tavilyCacheHits: 0,
          estimatedCostSavings: 0,
        },
      };
      (UnifiedCacheManager.getCacheStats as jest.Mock).mockResolvedValue(
        mockCacheStats
      );

      const analytics = await UsageAnalyticsService.getUsageAnalytics();

      expect(analytics.totalRequests).toBe(0);
      expect(analytics.cacheHitRates.tavily).toBe(0);
    });
  });

  describe("getWarmingRecommendations", () => {
    test("should recommend pre-warming when cache hit rate is low", () => {
      const analytics = {
        totalRequests: 100,
        patternDistribution: {
          marketplace: 50,
          ecommerce: 30,
          social: 20,
          dashboard: 10,
          "api-service": 5,
          "mobile-app": 3,
          fintech: 2,
          healthcare: 1,
          edtech: 1,
          realestate: 1,
          logistics: 1,
          saas: 1,
        },
        cacheHitRates: {
          iflow: 0.4,
          tavily: 0.4,
          overall: 0.4,
        },
        costSavings: 5,
        lastAnalyzed: Date.now(),
      };

      const recommendations =
        UsageAnalyticsService.getWarmingRecommendations(analytics);

      expect(recommendations).toContain(
        "Low overall cache hit rate - consider aggressive pre-warming"
      );
      expect(recommendations).toContain(
        "Low cost savings detected - implement pattern-based warming"
      );
    });

    test("should recommend TTL increase for high-frequency patterns", () => {
      const analytics = {
        totalRequests: 1000,
        patternDistribution: {
          marketplace: 100,
          ecommerce: 30,
          social: 20,
          dashboard: 10,
          "api-service": 5,
          "mobile-app": 3,
          fintech: 2,
          healthcare: 1,
          edtech: 1,
          realestate: 1,
          logistics: 1,
          saas: 1,
        },
        cacheHitRates: {
          iflow: 0.7,
          tavily: 0.7,
          overall: 0.7,
        },
        costSavings: 50,
        lastAnalyzed: Date.now(),
      };

      const recommendations =
        UsageAnalyticsService.getWarmingRecommendations(analytics);

      expect(recommendations).toContain(
        "High frequency of marketplace patterns - increase TTL for this pattern type"
      );
    });

    test("should return optimal strategy message when performance is good", () => {
      const analytics = {
        totalRequests: 100,
        patternDistribution: {
          marketplace: 10,
          ecommerce: 5,
          social: 3,
          dashboard: 2,
          "api-service": 1,
          "mobile-app": 1,
          fintech: 1,
          healthcare: 1,
          edtech: 1,
          realestate: 1,
          logistics: 1,
          saas: 1,
        },
        cacheHitRates: {
          iflow: 0.8,
          tavily: 0.8,
          overall: 0.8,
        },
        costSavings: 20,
        lastAnalyzed: Date.now(),
      };

      const recommendations =
        UsageAnalyticsService.getWarmingRecommendations(analytics);

      expect(recommendations).toContain(
        "AI caching performance is optimal - continue current strategy"
      );
    });

    test("should handle empty analytics gracefully", () => {
      const analytics = {
        totalRequests: 0,
        patternDistribution: {
          marketplace: 0,
          ecommerce: 0,
          social: 0,
          dashboard: 0,
          "api-service": 0,
          "mobile-app": 0,
          fintech: 0,
          healthcare: 0,
          edtech: 0,
          realestate: 0,
          logistics: 0,
          saas: 0,
        },
        cacheHitRates: {
          iflow: 0,
          tavily: 0,
          overall: 0,
        },
        costSavings: 0,
        lastAnalyzed: Date.now(),
      };

      const recommendations =
        UsageAnalyticsService.getWarmingRecommendations(analytics);

      expect(recommendations).toContain(
        "Low overall cache hit rate - consider aggressive pre-warming"
      );
      expect(recommendations).toContain(
        "Low cost savings detected - implement pattern-based warming"
      );
    });
  });

  describe("analyzeRecentPatterns", () => {
    test("should detect patterns in recent requests", () => {
      const recentRequests = [
        "marketplace for handmade crafts",
        "ecommerce platform for clothing",
        "marketplace for vintage items",
      ];

      // Mock pattern detection
      (
        PatternDetectionService.detectPattern as jest.Mock
      ).mockImplementation((request: string) => {
        if (request.includes("marketplace")) {
          return { pattern: "marketplace", confidence: 0.9 };
        }
        if (request.includes("ecommerce")) {
          return { pattern: "ecommerce", confidence: 0.8 };
        }
        return { pattern: null, confidence: 0 };
      });

      const patterns =
        UsageAnalyticsService.analyzeRecentPatterns(recentRequests);

      expect(patterns).toContain("marketplace");
      expect(patterns).toContain("ecommerce");
    });

    test("should filter out low confidence patterns", () => {
      const recentRequests = ["ambiguous request", "unclear query"];

      // Mock low confidence detection
      (
        PatternDetectionService.detectPattern as jest.Mock
      ).mockReturnValue({ pattern: null, confidence: 0.3 });

      const patterns =
        UsageAnalyticsService.analyzeRecentPatterns(recentRequests);

      expect(patterns).toEqual([]);
    });

    test("should sort patterns by frequency", () => {
      const recentRequests = [
        "marketplace for crafts",
        "marketplace for toys",
        "marketplace for books",
        "ecommerce store",
      ];

      // Mock pattern detection
      (
        PatternDetectionService.detectPattern as jest.Mock
      ).mockImplementation((request: string) => {
        if (request.includes("marketplace")) {
          return { pattern: "marketplace", confidence: 0.9 };
        }
        return { pattern: "ecommerce", confidence: 0.8 };
      });

      const patterns =
        UsageAnalyticsService.analyzeRecentPatterns(recentRequests);

      expect(patterns[0]).toBe("marketplace"); // 3 occurrences
      expect(patterns[1]).toBe("ecommerce"); // 1 occurrence
    });

    test("should handle empty requests array", () => {
      const patterns = UsageAnalyticsService.analyzeRecentPatterns([]);

      expect(patterns).toEqual([]);
    });

    test("should handle all pattern types", () => {
      const recentRequests = [
        "marketplace platform",
        "ecommerce store",
        "social network",
        "analytics dashboard",
        "api service",
        "mobile app",
        "fintech solution",
        "healthcare platform",
        "education platform",
        "real estate",
        "logistics system",
        "saas product",
      ];

      // Mock pattern detection for each type
      (
        PatternDetectionService.detectPattern as jest.Mock
      ).mockImplementation((request: string) => {
        const patternMap: Record<string, string> = {
          marketplace: "marketplace",
          ecommerce: "ecommerce",
          social: "social",
          dashboard: "dashboard",
          "api service": "api-service",
          "mobile app": "mobile-app",
          fintech: "fintech",
          healthcare: "healthcare",
          education: "edtech",
          "real estate": "realestate",
          logistics: "logistics",
          "saas product": "saas",
        };

        for (const [key, pattern] of Object.entries(patternMap)) {
          if (request.includes(key)) {
            return { pattern, confidence: 0.9 };
          }
        }
        return { pattern: null, confidence: 0 };
      });

      const patterns =
        UsageAnalyticsService.analyzeRecentPatterns(recentRequests);

      expect(patterns).toContain("marketplace");
      expect(patterns).toContain("ecommerce");
      expect(patterns).toContain("social");
      expect(patterns).toContain("dashboard");
      expect(patterns).toContain("api-service");
      expect(patterns).toContain("mobile-app");
      expect(patterns).toContain("fintech");
      expect(patterns).toContain("healthcare");
      expect(patterns).toContain("edtech");
      expect(patterns).toContain("realestate");
      expect(patterns).toContain("logistics");
      expect(patterns).toContain("saas");
    });
  });
});
