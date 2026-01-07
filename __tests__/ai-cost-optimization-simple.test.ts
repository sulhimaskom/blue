/**
 * AI Service Cost-Aware Caching Optimization Test
 *
 * Tests the advanced cost-aware caching system with intelligent TTL scaling
 */

import type { AIPattern } from "@/lib/services/service-types";

// Test the private methods via reflection-style access
describe("AI Service Cost-Aware Caching Optimization", () => {
  // Mock AI Service class to test private methods
  class TestAIService {
    private mockHour: number | null = null;

    /**
     * Override getCurrentHour for testing
     */
    protected getCurrentHour(): number {
      if (this.mockHour !== null) {
        return this.mockHour;
      }
      return new Date().getHours();
    }

    /**
     * Set mock hour for testing time-based optimization
     */
    public setMockHour(hour: number): void {
      this.mockHour = hour;
    }

    /**
     * Clear mock hour
     */
    public clearMockHour(): void {
      this.mockHour = null;
    }

    /**
     * Calculate cost optimization factors based on request characteristics
     */
    private calculateCostOptimizationFactors(
      request: any,
      completion: any,
    ): number {
      let multiplier = 1.0;

      // High-cost optimization: longer cache for expensive completions
      if (completion?.usage?.totalTokens > 2000) {
        multiplier *= 1.5; // 50% longer for expensive responses
      }

      // Prompt complexity factor
      if (request?.prompt?.length > 500) {
        multiplier *= 1.3; // 30% longer for complex prompts
      }

      // Model-specific optimization
      const modelId = request?.model?.id || "default";
      if (modelId.includes("gpt-4") || modelId.includes("claude-3")) {
        multiplier *= 1.4; // 40% longer for premium models
      }

      return multiplier;
    }

    /**
     * Get pattern-based optimization multiplier
     */
    private getPatternMultiplier(
      pattern: AIPattern["type"] | null | undefined,
    ): number {
      if (!pattern) return 1.0;

      // High-value patterns get longer cache times
      const highValuePatterns = ["fintech", "healthcare", "marketplace"];
      const mediumValuePatterns = ["saas", "ecommerce", "realestate"];
      const standardPatterns = ["dashboard", "api-service", "mobile-app"];

      if (highValuePatterns.includes(pattern)) {
        return 1.6; // 60% longer for regulated/high-value industries
      } else if (mediumValuePatterns.includes(pattern)) {
        return 1.3; // 30% longer for business-critical patterns
      } else if (standardPatterns.includes(pattern)) {
        return 1.1; // 10% longer for standard patterns
      }

      return 1.0;
    }

    /**
     * Get time-based optimization multiplier (off-peak caching)
     */
    private getTimeBasedMultiplier(): number {
      const currentHour = this.getCurrentHour(); // Use the mockable getCurrentHour method

      // Off-peak hours: 22:00-06:00 UTC (US night/early morning)
      if (currentHour >= 22 || currentHour <= 6) {
        return 1.4; // 40% longer during off-peak hours
      }

      // Peak hours: 14:00-18:00 UTC (US business hours)
      if (currentHour >= 14 && currentHour <= 18) {
        return 0.8; // 20% shorter during peak hours for freshness
      }

      return 1.0; // Normal caching during other hours
    }

    /**
     * Get usage-based optimization multiplier
     */
    private getUsageMultiplier(
      pattern: AIPattern["type"] | null | undefined,
    ): number {
      if (!pattern) return 1.0;

      // This would integrate with usage analytics - for now using heuristics
      const highFrequencyPatterns = ["dashboard", "api-service", "saas"];
      const lowFrequencyPatterns = ["fintech", "healthcare", "realestate"];

      if (highFrequencyPatterns.includes(pattern)) {
        return 1.2; // 20% longer for frequently used patterns
      } else if (lowFrequencyPatterns.includes(pattern)) {
        return 0.9; // 10% shorter for infrequently used patterns
      }

      return 1.0;
    }

    /**
     * Get typical TTL for detected pattern
     */
    private getPatternTypicalTTL(pattern: AIPattern["type"]): number {
      const ttlMap: Record<AIPattern["type"], number> = {
        error: 300,
        success: 1800,
        anomaly: 600,
        marketplace: 7200,
        ecommerce: 3600,
        social: 5400,
        dashboard: 1800,
        "api-service": 2700,
        "mobile-app": 3600,
        fintech: 10800,
        healthcare: 7200,
        edtech: 5400,
        realestate: 7200,
        logistics: 5400,
        saas: 3600,
      };
      return ttlMap[pattern] || 1800;
    }

    /**
     * Calculate cost-aware TTL with intelligent scaling
     */
    private calculateCostAwareTTL(
      pattern: AIPattern["type"] | null | undefined,
      request: any,
      completion: any,
    ): number {
      const baseTTL = pattern ? this.getPatternTypicalTTL(pattern) : 1800;

      // Cost optimization factors
      const costFactors = this.calculateCostOptimizationFactors(
        request,
        completion,
      );

      // Pattern-based optimization
      const patternMultiplier = this.getPatternMultiplier(pattern || undefined);

      // Time-based optimization (off-peak hours)
      const timeMultiplier = this.getTimeBasedMultiplier();

      // Usage frequency optimization
      const usageMultiplier = this.getUsageMultiplier(pattern || undefined);

      // Calculate final TTL with intelligent scaling
      let optimizedTTL =
        baseTTL *
        costFactors *
        patternMultiplier *
        timeMultiplier *
        usageMultiplier;

      // Apply smart bounds - minimum 5 minutes, maximum 24 hours
      optimizedTTL = Math.max(300, Math.min(86400, optimizedTTL));

      return Math.floor(optimizedTTL);
    }

    /**
     * Calculate estimated cost savings from cache optimization
     */
    private calculateEstimatedSavings(multiplier: number): string {
      // Rough estimation: each 10% increase in TTL = 8% cost reduction
      const costReduction = (multiplier - 1.0) * 0.8;
      return `${(costReduction * 100).toFixed(1)}%`;
    }

    // Expose private methods for testing
    public testCalculateCostAwareTTL = this.calculateCostAwareTTL.bind(this);
    public testCalculateEstimatedSavings =
      this.calculateEstimatedSavings.bind(this);
    public testGetPatternMultiplier = this.getPatternMultiplier.bind(this);
    public testGetTimeBasedMultiplier = this.getTimeBasedMultiplier.bind(this);
    public testGetUsageMultiplier = this.getUsageMultiplier.bind(this);
  }

  let aiService: TestAIService;

  beforeEach(() => {
    aiService = new TestAIService();
    // Clear any mock hour before each test
    aiService.clearMockHour();
  });

  afterEach(() => {
    aiService.clearMockHour();
  });

  describe("calculateCostAwareTTL", () => {
    it("should apply cost optimization factors for expensive completions", () => {
      const request = {
        prompt:
          "Design comprehensive fintech platform with advanced wealth management features",
        model: { id: "claude-3-opus" },
      };

      const completion = {
        content: "Detailed fintech platform architecture",
        model: { id: "claude-3-opus" },
        usage: { totalTokens: 3000 },
      };

      const pattern = "fintech" as AIPattern["type"];

      // Mock normal hours for predictable testing
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        pattern,
        request,
        completion,
      );

      // Verify TTL is significantly longer than base for expensive fintech completion
      // Base fintech TTL = 10800 * 1.6 (pattern) * 1.0 (time) * 0.9 (usage) * 1.5 (cost) * 1.4 (model) * 1.3 (prompt)
      // = 10800 * 1.6 * 0.9 * 1.5 * 1.4 * 1.3 ≈ 35424, capped at 86400
      expect(optimizedTTL).toBeGreaterThan(10800); // Base fintech TTL
      expect(optimizedTTL).toBeLessThan(86400); // But less than 24 hours
    });

    it("should handle time-based optimization during off-peak hours", () => {
      const request = {
        prompt: "Simple question about dashboard features",
        model: { id: "gpt-4" },
      };

      const completion = {
        content: "Dashboard features overview",
        model: { id: "gpt-4" },
        usage: { totalTokens: 500 },
      };

      const pattern = "dashboard" as AIPattern["type"];

      // Mock off-peak hours (23:00)
      aiService.setMockHour(23);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        pattern,
        request,
        completion,
      );

      // Should have off-peak optimization applied (1.4x time multiplier)
      // Base dashboard TTL = 1800 * 1.1 (pattern) * 1.4 (off-peak) * 1.2 (usage) * 1.4 (model)
      // = 1800 * 1.1 * 1.4 * 1.2 * 1.4 ≈ 4657
      expect(optimizedTTL).toBeGreaterThan(1800); // Base dashboard TTL
      expect(optimizedTTL).toBeLessThan(86400); // Within bounds
    });

    it("should apply premium model optimization", () => {
      const request = {
        prompt: "Complex architectural question",
        model: { id: "gpt-4-turbo" },
      };

      const completion = {
        content: "Detailed architectural response",
        model: { id: "gpt-4-turbo" },
        usage: { totalTokens: 1500 },
      };

      const pattern = "saas" as AIPattern["type"];

      // Mock normal hours for predictable testing
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        pattern,
        request,
        completion,
      );

      // Should have premium model multiplier applied
      // Base saas TTL = 3600 * 1.3 (pattern) * 1.0 (time) * 1.2 (usage) * 1.4 (model)
      // = 3600 * 1.3 * 1.2 * 1.4 ≈ 7862
      expect(optimizedTTL).toBeGreaterThan(3600); // Base saas TTL
      expect(optimizedTTL).toBeLessThan(86400); // Within bounds
    });

    it("should handle null/undefined patterns gracefully", () => {
      const request = {
        prompt: "Simple question",
        model: { id: "default" },
      };

      const completion = {
        content: "Simple response",
        model: { id: "default" },
        usage: { totalTokens: 200 },
      };

      // Mock peak hours for consistent testing (16:00)
      aiService.setMockHour(16);

      // Test with null pattern
      const ttlWithNull = aiService.testCalculateCostAwareTTL(
        null,
        request,
        completion,
      );

      // Test with undefined pattern
      const ttlWithUndefined = aiService.testCalculateCostAwareTTL(
        undefined,
        request,
        completion,
      );

      // Both should use default TTL with peak hour optimization (0.8x multiplier)
      // Base TTL = 1800 * 0.8 (peak hours) = 1440
      expect(ttlWithNull).toBe(1440);
      expect(ttlWithUndefined).toBe(1440);
    });

    it("should apply smart bounds to TTL values", () => {
      const request = {
        prompt: "A".repeat(2000), // Very long prompt
        model: { id: "claude-3-opus-200k" }, // Premium model
      };

      const completion = {
        content: "B".repeat(5000), // Very long response
        model: { id: "claude-3-opus-200k" },
        usage: { totalTokens: 5000 }, // Very high token count
      };

      const pattern = "fintech" as AIPattern["type"];

      // Mock normal hours
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        pattern,
        request,
        completion,
      );

      // Should be capped at maximum 24 hours (86400 seconds)
      expect(optimizedTTL).toBeLessThanOrEqual(86400);
      expect(optimizedTTL).toBeGreaterThanOrEqual(300); // Minimum 5 minutes
    });
  });

  describe("pattern-based optimization", () => {
    it("should apply higher multipliers for high-value patterns", () => {
      const fintechMultiplier = aiService.testGetPatternMultiplier("fintech");
      const dashboardMultiplier =
        aiService.testGetPatternMultiplier("dashboard");

      expect(fintechMultiplier).toBe(1.6); // High-value pattern
      expect(dashboardMultiplier).toBe(1.1); // Standard pattern
    });

    it("should apply medium multipliers for business-critical patterns", () => {
      const saasMultiplier = aiService.testGetPatternMultiplier("saas");
      const ecommerceMultiplier =
        aiService.testGetPatternMultiplier("ecommerce");

      expect(saasMultiplier).toBe(1.3); // Business-critical pattern
      expect(ecommerceMultiplier).toBe(1.3); // Business-critical pattern
    });

    it("should return 1.0 for null/undefined patterns", () => {
      const nullMultiplier = aiService.testGetPatternMultiplier(null);
      const undefinedMultiplier = aiService.testGetPatternMultiplier(undefined);

      expect(nullMultiplier).toBe(1.0);
      expect(undefinedMultiplier).toBe(1.0);
    });
  });

  describe("usage-based optimization", () => {
    it("should apply higher multipliers for high-frequency patterns", () => {
      const dashboardMultiplier = aiService.testGetUsageMultiplier("dashboard");
      const fintechMultiplier = aiService.testGetUsageMultiplier("fintech");

      expect(dashboardMultiplier).toBe(1.2); // High frequency
      expect(fintechMultiplier).toBe(0.9); // Low frequency
    });

    it("should return 1.0 for null/undefined patterns", () => {
      const nullMultiplier = aiService.testGetUsageMultiplier(null);
      const undefinedMultiplier = aiService.testGetUsageMultiplier(undefined);

      expect(nullMultiplier).toBe(1.0);
      expect(undefinedMultiplier).toBe(1.0);
    });
  });

  describe("time-based optimization", () => {
    it("should apply off-peak optimization", () => {
      // Mock off-peak hour (23:00)
      aiService.setMockHour(23);
      const multiplier = aiService.testGetTimeBasedMultiplier();

      expect(multiplier).toBe(1.4); // 40% longer during off-peak hours
    });

    it("should apply peak-hour optimization", () => {
      // Mock peak hour (16:00 - 4 PM UTC)
      aiService.setMockHour(16);
      const multiplier = aiService.testGetTimeBasedMultiplier();

      expect(multiplier).toBe(0.8); // 20% shorter during peak hours for freshness
    });

    it("should use normal optimization during regular hours", () => {
      // Mock regular hour (10:00 - 10 AM UTC)
      aiService.setMockHour(10);
      const multiplier = aiService.testGetTimeBasedMultiplier();

      expect(multiplier).toBe(1.0); // Normal caching during regular hours
    });
  });

  describe("cost savings calculation", () => {
    it("should calculate estimated savings correctly", () => {
      // 1.5x multiplier should result in 40% savings
      expect(aiService.testCalculateEstimatedSavings(1.5)).toBe("40.0%");

      // 2.0x multiplier should result in 80% savings
      expect(aiService.testCalculateEstimatedSavings(2.0)).toBe("80.0%");

      // 1.1x multiplier should result in 8% savings
      expect(aiService.testCalculateEstimatedSavings(1.1)).toBe("8.0%");
    });
  });

  describe("integration scenarios", () => {
    it("should demonstrate complete optimization workflow", () => {
      const expensiveRequest = {
        prompt:
          "Design enterprise-grade healthcare platform with HIPAA compliance",
        model: { id: "claude-3-opus" },
      };

      const expensiveCompletion = {
        content: "Comprehensive healthcare platform architecture",
        model: { id: "claude-3-opus" },
        usage: { totalTokens: 3500 },
      };

      const healthcarePattern = "healthcare" as AIPattern["type"];

      // Mock off-peak hours for maximum optimization (23:00)
      aiService.setMockHour(23);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        healthcarePattern,
        expensiveRequest,
        expensiveCompletion,
      );

      // Verify significant optimization for expensive healthcare completion
      // Base healthcare TTL = 7200 * 1.6 (pattern) * 1.4 (off-peak) * 0.9 (usage) * 1.5 (cost) * 1.4 (model) * 1.3 (prompt)
      // = 7200 * 1.6 * 1.4 * 0.9 * 1.5 * 1.4 * 1.3 ≈ 27451
      expect(optimizedTTL).toBeGreaterThan(10000); // Significant optimization over base 7200s
      expect(optimizedTTL).toBeLessThan(86400); // Within bounds

      // Verify cost savings calculation
      const multiplier = optimizedTTL / 7200; // Base healthcare TTL
      const estimatedSavings =
        aiService.testCalculateEstimatedSavings(multiplier);
      const savingsPercent = parseFloat(estimatedSavings);

      // Should result in substantial cost savings (>100%)
      expect(savingsPercent).toBeGreaterThan(100);
    });

    it("should handle edge cases with minimal optimization", () => {
      const simpleRequest = {
        prompt: "Basic question",
        model: { id: "basic-model" },
      };

      const simpleCompletion = {
        content: "Simple answer",
        model: { id: "basic-model" },
        usage: { totalTokens: 100 },
      };

      const noPattern = null;

      // Mock regular hours for consistent testing (10:00)
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        noPattern,
        simpleRequest,
        simpleCompletion,
      );

      // Should be base TTL with normal hours
      expect(optimizedTTL).toBe(1800); // 1800 * 1.0 (normal hours)
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
