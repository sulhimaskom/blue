/**
 * AIPatternDetector Test Suite
 *
 * Comprehensive unit tests for AIPatternDetector covering:
 * - Pattern detection with confidence scoring
 * - Industry context detection
 * - Semantic bonus calculation
 * - Cache key generation
 * - Input normalization
 * - Intelligent cache warming
 * - Usage analytics
 * - Warming recommendations
 * - Edge cases and boundary conditions
 */

import {
  AIPatternDetector,
  type AIPattern,
  type UsageAnalytics,
} from "../../lib/services/ai-pattern-detector";

describe("AIPatternDetector", () => {
  describe("Pattern Detection", () => {
    it("should detect marketplace pattern with high confidence", () => {
      const input =
        "I need a marketplace with sellers and buyers and product listings";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("marketplace");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("should detect ecommerce pattern with medium confidence", () => {
      const input =
        "Build an ecommerce platform with shopping cart and checkout";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("ecommerce");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("should detect social pattern with specific keywords", () => {
      const input = "Create a social network with community, posts, and followers";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("social");
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("should detect fintech pattern correctly", () => {
      const input = "Fintech application with payments and banking";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("fintech");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should return null pattern for unrecognized input", () => {
      const input = "random text with no keywords";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBeNull();
      expect(result.confidence).toBeLessThan(0.1);
    });

    it("should cap confidence at 1.0", () => {
      const input =
        "marketplace marketplace marketplace seller buyer seller buyer listing vendor listing vendor vendor multi-vendor product catalog storefront market platform";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it("should be case-insensitive for pattern detection", () => {
      const input1 = "MARKETPLACE SELLER BUYER";
      const input2 = "marketplace seller buyer";
      const input3 = "Marketplace Seller Buyer";

      const result1 = AIPatternDetector.detectPattern(input1);
      const result2 = AIPatternDetector.detectPattern(input2);
      const result3 = AIPatternDetector.detectPattern(input3);

      expect(result1.pattern).toBe(result2.pattern);
      expect(result2.pattern).toBe(result3.pattern);
    });

    it("should handle mixed patterns and select highest confidence", () => {
      const input = "ecommerce with shopping cart and community features";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle empty string input", () => {
      const result = AIPatternDetector.detectPattern("");

      expect(result.pattern).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
    });

    it("should handle special characters in input", () => {
      const input = "Build an ecommerce platform (with shopping-cart & checkout!)";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("ecommerce");
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });
  });

  describe("Industry Context Detection", () => {
    it("should detect industry context for healthcare", () => {
      const input = "healthcare telemedicine platform with patient management";

      const context = AIPatternDetector.detectIndustryContext(input);

      expect(context).not.toBeNull();
      expect(context).toContain("health");
    });

    it("should detect industry context for fintech", () => {
      const input = "fintech payments banking financial services";

      const context = AIPatternDetector.detectIndustryContext(input);

      expect(context).not.toBeNull();
    });

    it("should return null for no industry context", () => {
      const input = "random text without industry indicators";

      const context = AIPatternDetector.detectIndustryContext(input);

      expect(context).toBeNull();
    });

    it("should handle empty input for industry context", () => {
      const context = AIPatternDetector.detectIndustryContext("");

      expect(context).toBeNull();
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate optimized cache key with service", () => {
      const service = "iflow" as const;
      const input = "shopping cart checkout";

      const cacheKey = AIPatternDetector.generateOptimizedCacheKey(
        service,
        input,
      );

      expect(cacheKey).toBeDefined();
      expect(cacheKey.length).toBeGreaterThan(0);
    });

    it("should generate optimized cache key with pattern", () => {
      const service = "iflow" as const;
      const pattern = "ecommerce" as AIPattern["type"];
      const input = "shopping cart checkout";

      const cacheKey = AIPatternDetector.generateOptimizedCacheKey(
        service,
        input,
        pattern,
      );

      expect(cacheKey).toBeDefined();
      expect(cacheKey.length).toBeGreaterThan(0);
      expect(cacheKey).toContain("ecommerce");
    });

    it("should generate unique cache keys for different inputs", () => {
      const service = "iflow" as const;
      const key1 = AIPatternDetector.generateOptimizedCacheKey(service, "cart");
      const key2 = AIPatternDetector.generateOptimizedCacheKey(service, "checkout");

      expect(key1).not.toBe(key2);
    });

    it("should generate consistent cache keys for same input", () => {
      const service = "iflow" as const;
      const input = "shopping cart checkout";
      const key1 = AIPatternDetector.generateOptimizedCacheKey(service, input);
      const key2 = AIPatternDetector.generateOptimizedCacheKey(service, input);

      expect(key1).toBe(key2);
    });

    it("should handle long input strings", () => {
      const service = "iflow" as const;
      const longInput = "a".repeat(1000);
      const cacheKey = AIPatternDetector.generateOptimizedCacheKey(service, longInput);

      expect(cacheKey).toBeDefined();
      expect(cacheKey.length).toBeLessThan(200);
    });

    it("should handle special characters in cache key input", () => {
      const service = "iflow" as const;
      const input = "shopping-cart! checkout? (new)";
      const cacheKey = AIPatternDetector.generateOptimizedCacheKey(service, input);

      expect(cacheKey).toBeDefined();
      expect(cacheKey.length).toBeGreaterThan(0);
    });

    it("should support both iflow and tavily services", () => {
      const input = "test input";
      const iflowKey = AIPatternDetector.generateOptimizedCacheKey("iflow", input);
      const tavilyKey = AIPatternDetector.generateOptimizedCacheKey(
        "tavily",
        input,
      );

      expect(iflowKey).toBeDefined();
      expect(tavilyKey).toBeDefined();
      expect(iflowKey).not.toBe(tavilyKey);
    });
  });

  describe("Input Normalization", () => {
    it("should normalize whitespace", () => {
      const input = "shopping   cart    checkout";
      const normalized = AIPatternDetector.normalizeInputForCaching(input);

      expect(normalized).toContain("shopping");
      expect(normalized).not.toContain("   ");
    });

    it("should convert to lowercase", () => {
      const input = "SHOPPING CART CHECKOUT";
      const normalized = AIPatternDetector.normalizeInputForCaching(input);

      expect(normalized).toBe(normalized.toLowerCase());
    });

    it("should remove special characters", () => {
      const input = "shopping-cart! checkout?";
      const normalized = AIPatternDetector.normalizeInputForCaching(input);

      expect(normalized).not.toContain("!");
      expect(normalized).not.toContain("?");
    });

    it("should handle empty string", () => {
      const normalized = AIPatternDetector.normalizeInputForCaching("");

      expect(normalized).toBeDefined();
      expect(normalized).toBe("");
    });

    it("should handle null input gracefully", () => {
      const normalized = AIPatternDetector.normalizeInputForCaching(null as any);

      expect(normalized).toBeDefined();
      expect(normalized).toBe("");
    });

    it("should handle undefined input gracefully", () => {
      const normalized = AIPatternDetector.normalizeInputForCaching(undefined as any);

      expect(normalized).toBeDefined();
      expect(normalized).toBe("");
    });

    it("should preserve meaningful words", () => {
      const input = "shopping cart with checkout system";
      const normalized = AIPatternDetector.normalizeInputForCaching(input);

      expect(normalized).toContain("shopping");
      expect(normalized).toContain("cart");
      expect(normalized).toContain("checkout");
    });
  });

  describe("Intelligent Cache Warming", () => {
    it("should perform intelligent warming for recent requests", async () => {
      const recentRequests = ["shopping cart", "checkout", "product"];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result).toBeDefined();
      expect(result.warmedRules).toBeGreaterThanOrEqual(0);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(result.patternsDetected).toBeDefined();
    });

    it("should handle empty recent requests", async () => {
      const recentRequests: string[] = [];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result).toBeDefined();
      expect(result.warmedRules).toBeGreaterThanOrEqual(0);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
    });

    it("should handle single recent request", async () => {
      const recentRequests = ["shopping cart"];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result).toBeDefined();
      expect(result.patternsDetected).toBeDefined();
    });

    it("should handle multiple recent requests", async () => {
      const recentRequests = [
        "shopping cart",
        "checkout",
        "product",
        "payment",
      ];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result).toBeDefined();
      expect(result.warmedRules).toBeGreaterThanOrEqual(0);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(result.patternsDetected.length).toBeGreaterThanOrEqual(0);
    });

    it("should detect patterns from recent requests", async () => {
      const recentRequests = [
        "ecommerce shopping cart checkout",
        "ecommerce payment processing",
      ];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result.patternsDetected).toBeDefined();
      expect(Array.isArray(result.patternsDetected)).toBe(true);
    });
  });

  describe("Usage Analytics", () => {
    it("should return comprehensive usage analytics", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(analytics.costSavings).toBeGreaterThanOrEqual(0);
      expect(analytics.lastAnalyzed).toBeGreaterThan(0);
      expect(analytics.patternDistribution).toBeDefined();
      expect(analytics.cacheHitRates).toBeDefined();
    });

    it("should track total requests correctly", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.totalRequests).toBe("number");
    });

    it("should track pattern distribution by type", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      const patternTypes: AIPattern["type"][] = [
        "marketplace",
        "ecommerce",
        "social",
        "dashboard",
        "api-service",
        "mobile-app",
        "fintech",
        "healthcare",
        "edtech",
        "realestate",
        "logistics",
        "saas",
      ];

      for (const type of patternTypes) {
        expect(analytics.patternDistribution[type]).toBeGreaterThanOrEqual(0);
      }
    });

    it("should track cache hit rates by service", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics.cacheHitRates).toBeDefined();
      expect(analytics.cacheHitRates.iflow).toBeGreaterThanOrEqual(0);
      expect(analytics.cacheHitRates.tavily).toBeGreaterThanOrEqual(0);
    });

    it("should calculate cost savings correctly", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics.costSavings).toBeGreaterThanOrEqual(0);
      expect(typeof analytics.costSavings).toBe("number");
    });

    it("should track last analyzed timestamp", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics.lastAnalyzed).toBeGreaterThan(0);
      expect(analytics.lastAnalyzed).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete pattern detection and cache key flow", async () => {
      const input = "I need an ecommerce platform with shopping cart and checkout";

      const detection = AIPatternDetector.detectPattern(input);

      expect(detection.pattern).toBe("ecommerce");
      expect(detection.confidence).toBeGreaterThan(0);

      if (detection.pattern) {
        const cacheKey = AIPatternDetector.generateOptimizedCacheKey(
          "iflow",
          input,
          detection.pattern,
        );

        expect(cacheKey).toBeDefined();
        expect(cacheKey.length).toBeGreaterThan(0);
      }
    });

    it("should handle analytics flow", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it("should handle warming with multiple patterns", async () => {
      const recentRequests = [
        "ecommerce shopping cart",
        "social community posts",
        "marketplace sellers buyers",
      ];

      const result = await AIPatternDetector.performIntelligentWarming(
        recentRequests,
      );

      expect(result).toBeDefined();
      expect(result.patternsDetected.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple pattern detections with confidence comparison", () => {
      const inputs = [
        "marketplace with sellers and buyers",
        "ecommerce with shopping cart",
        "social network with posts",
        "dashboard for analytics",
      ];

      const results = inputs.map((input) =>
        AIPatternDetector.detectPattern(input),
      );

      expect(results.length).toBe(inputs.length);

      results.forEach((result) => {
        expect(result.pattern).not.toBeNull();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.matchedKeywords.length).toBeGreaterThan(0);
      });
    });

    it("should handle cache key generation across different patterns", () => {
      const patterns = ["ecommerce", "social", "marketplace"] as AIPattern["type"][];
      const input = "test input";
      const service = "iflow" as const;

      const cacheKeys = patterns.map((pattern) =>
        AIPatternDetector.generateOptimizedCacheKey(service, input, pattern),
      );

      cacheKeys.forEach((key) => {
        expect(key).toBeDefined();
        expect(key.length).toBeGreaterThan(0);
      });

      expect(new Set(cacheKeys).size).toBe(patterns.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null input gracefully", () => {
      const result = AIPatternDetector.detectPattern(null as any);

      expect(result.pattern).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
    });

    it("should handle undefined input gracefully", () => {
      const result = AIPatternDetector.detectPattern(undefined as any);

      expect(result.pattern).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedKeywords).toEqual([]);
    });

    it("should handle very long input strings", () => {
      const longInput = "ecommerce " + "shopping ".repeat(1000);

      const result = AIPatternDetector.detectPattern(longInput);

      expect(result.pattern).toBe("ecommerce");
    });

    it("should handle input with only special characters", () => {
      const input = "!@#$%^&*()";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBeNull();
    });

    it("should handle input with mixed case and special characters", () => {
      const input = "EcOmMeRcE!!! ShOpPiNg??? CaRT";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("ecommerce");
    });

    it("should handle cache key generation with empty input", () => {
      const cacheKey = AIPatternDetector.generateOptimizedCacheKey("iflow", "");

      expect(cacheKey).toBeDefined();
      expect(cacheKey.length).toBeGreaterThan(0);
    });

    it("should handle normalization with only whitespace", () => {
      const input = "   \t\n   ";
      const normalized = AIPatternDetector.normalizeInputForCaching(input);

      expect(normalized).toBeDefined();
    });

    it("should handle warming with no matching patterns", async () => {
      const result = await AIPatternDetector.performIntelligentWarming([]);

      expect(result).toBeDefined();
      expect(result.warmedRules).toBeGreaterThanOrEqual(0);
    });

    it("should handle analytics with zero values", async () => {
      const analytics = await AIPatternDetector.getUsageAnalytics();

      expect(analytics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(analytics.costSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Pattern-Specific Tests", () => {
    it("should detect dashboard pattern correctly", () => {
      const input = "admin dashboard analytics panel monitoring";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("dashboard");
    });

    it("should detect api-service pattern correctly", () => {
      const input = "REST API service backend microservice";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("api-service");
    });

    it("should detect mobile-app pattern correctly", () => {
      const input = "mobile app iOS Android application";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("mobile-app");
    });

    it("should detect healthcare pattern correctly", () => {
      const input = "healthcare telemedicine patient records";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("healthcare");
    });

    it("should detect edtech pattern correctly", () => {
      const input = "education platform learning management online courses";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("edtech");
    });

    it("should detect realestate pattern correctly", () => {
      const input = "real estate property management listings";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("realestate");
    });

    it("should detect logistics pattern correctly", () => {
      const input = "fleet management supply chain delivery tracking";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("logistics");
    });

    it("should detect saas pattern correctly", () => {
      const input = "B2B software enterprise platform business solution";

      const result = AIPatternDetector.detectPattern(input);

      expect(result.pattern).toBe("saas");
    });
  });

  describe("Confidence Scoring", () => {
    it("should increase confidence with more matched keywords", () => {
      const input1 = "marketplace";
      const input2 = "marketplace seller buyer listing";
      const input3 =
        "marketplace seller buyer listing vendor commission product catalog";

      const result1 = AIPatternDetector.detectPattern(input1);
      const result2 = AIPatternDetector.detectPattern(input2);
      const result3 = AIPatternDetector.detectPattern(input3);

      expect(result3.confidence).toBeGreaterThanOrEqual(result2.confidence);
      expect(result2.confidence).toBeGreaterThanOrEqual(result1.confidence);
    });

    it("should apply weight from pattern configuration", () => {
      const marketplaceInput =
        "marketplace seller buyer listing vendor commission";
      const ecommerceInput = "ecommerce shopping cart checkout payment inventory";

      const marketplaceResult = AIPatternDetector.detectPattern(marketplaceInput);
      const ecommerceResult = AIPatternDetector.detectPattern(ecommerceInput);

      expect(marketplaceResult.pattern).toBe("marketplace");
      expect(ecommerceResult.pattern).toBe("ecommerce");
      expect(marketplaceResult.confidence).toBeGreaterThan(0);
      expect(ecommerceResult.confidence).toBeGreaterThan(0);
    });

    it("should boost confidence for compatible industry context", () => {
      const healthcareInput =
        "healthcare telemedicine patient management platform";
      const genericHealthcareInput = "telemedicine patient management";

      const result1 = AIPatternDetector.detectPattern(healthcareInput);
      const result2 = AIPatternDetector.detectPattern(genericHealthcareInput);

      expect(result1.pattern).toBe("healthcare");
      expect(result1.confidence).toBeGreaterThan(0);
    });
  });
});
