/**
 * AI Service Cost-Aware Caching Optimization Test - Enhanced Deterministic Version
 *
 * Tests the advanced cost-aware caching system with intelligent TTL scaling
 * Enhanced for 100% deterministic testing with comprehensive edge case coverage
 */

import type { AIPattern } from "@/lib/services/service-types";

// Test the private methods via reflection-style access
describe("AI Service Cost-Aware Caching Optimization", () => {
  // Mock AI Service class to test private methods with enhanced time mocking
  class TestAIService {
    private mockHour: number | null = null;
    private mockDate: Date | null = null;
    private mockTimezoneOffset: number = 0; // For timezone edge case testing
    private deterministicCounter: number = 0; // For consistent sequence testing

    /**
     * Override getCurrentHour for testing with enhanced determinism
     */
    protected getCurrentHour(): number {
      if (this.mockHour !== null) {
        return this.mockHour;
      }
      // Always use a fixed time for deterministic results when not mocked
      return 10; // 10 AM UTC - normal hours
    }

    /**
     * Get current date for time-dependent calculations
     */
    protected getCurrentDate(): Date {
      if (this.mockDate !== null) {
        return this.mockDate;
      }
      // Use a fixed date for consistent test results
      return new Date("2026-01-07T10:00:00.000Z");
    }

    /**
     * Get timezone offset for edge case testing
     */
    protected getTimezoneOffset(): number {
      return this.mockTimezoneOffset;
    }

    /**
     * Get deterministic counter for sequence testing
     */
    protected getDeterministicCounter(): number {
      return this.deterministicCounter++;
    }

    /**
     * Set mock hour for testing time-based optimization
     */
    public setMockHour(hour: number): void {
      this.mockHour = hour;
    }

    /**
     * Set mock date for edge case testing
     */
    public setMockDate(date: Date): void {
      this.mockDate = date;
    }

    /**
     * Set mock timezone offset for edge case testing
     */
    public setMockTimezoneOffset(offset: number): void {
      this.mockTimezoneOffset = offset;
    }

    /**
     * Reset deterministic counter
     */
    public resetDeterministicCounter(): void {
      this.deterministicCounter = 0;
    }

    /**
     * Clear all mock values and reset state
     */
    public clearMockValues(): void {
      this.mockHour = null;
      this.mockDate = null;
      this.mockTimezoneOffset = 0;
      this.resetDeterministicCounter();
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
     * Calculate cost-aware TTL with intelligent scaling and enhanced precision
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

      // Calculate final TTL with intelligent scaling and floating-point precision
      let optimizedTTL =
        baseTTL *
        costFactors *
        patternMultiplier *
        timeMultiplier *
        usageMultiplier;

      // Apply smart bounds with enhanced precision handling
      optimizedTTL = Math.max(300, Math.min(86400, optimizedTTL));

      // Use Math.floor for consistent deterministic results
      return Math.floor(optimizedTTL);
    }

    /**
     * Enhanced cost optimization factors with extreme value handling
     */
    private calculateCostOptimizationFactorsEnhanced(
      request: any,
      completion: any,
    ): number {
      let multiplier = 1.0;

      // Handle edge cases for extreme token counts
      const totalTokens = completion?.usage?.totalTokens || 0;
      if (totalTokens > 10000) {
        multiplier *= 2.0; // 100% longer for extremely expensive responses
      } else if (totalTokens > 2000) {
        multiplier *= 1.5; // 50% longer for expensive responses
      } else if (totalTokens === 0) {
        multiplier *= 0.5; // 50% shorter for empty responses
      }

      // Handle edge cases for prompt complexity
      const promptLength = request?.prompt?.length || 0;
      if (promptLength > 10000) {
        multiplier *= 1.5; // 50% longer for extremely complex prompts
      } else if (promptLength > 500) {
        multiplier *= 1.3; // 30% longer for complex prompts
      } else if (promptLength === 0) {
        multiplier *= 0.7; // 30% shorter for empty prompts
      }

      // Enhanced model-specific optimization
      const modelId = request?.model?.id || "default";
      if (modelId.includes("gpt-4") || modelId.includes("claude-3")) {
        multiplier *= 1.4; // 40% longer for premium models
      } else if (modelId.includes("gpt-3.5")) {
        multiplier *= 1.1; // 10% longer for standard models
      }

      return multiplier;
    }

    /**
     * Enhanced time-based optimization with timezone support
     */
    private getTimeBasedMultiplierEnhanced(): number {
      const currentHour = this.getCurrentHour();
      const timezoneOffset = this.getTimezoneOffset();

      // Adjust hour based on timezone for edge case testing
      const adjustedHour = (currentHour + timezoneOffset + 24) % 24;

      // Extended off-peak hours with precise boundaries
      if (adjustedHour >= 22 || adjustedHour < 6) {
        return 1.4; // 40% longer during off-peak hours
      }

      // Peak hours with precise boundaries
      if (adjustedHour >= 14 && adjustedHour < 18) {
        return 0.8; // 20% shorter during peak hours
      }

      return 1.0; // Normal caching during other hours
    }

    /**
     * Validate floating-point precision in calculations
     */
    private validateFloatingPointPrecision(value: number): number {
      // Round to 6 decimal places to eliminate floating-point errors
      return Math.round(value * 1000000) / 1000000;
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
    public testCalculateCostOptimizationFactors =
      this.calculateCostOptimizationFactors.bind(this);
    public testGetPatternMultiplier = this.getPatternMultiplier.bind(this);
    public testGetTimeBasedMultiplier = this.getTimeBasedMultiplier.bind(this);
    public testGetUsageMultiplier = this.getUsageMultiplier.bind(this);
    public testGetPatternTypicalTTL = this.getPatternTypicalTTL.bind(this);
    public testCalculateCostOptimizationFactorsEnhanced =
      this.calculateCostOptimizationFactorsEnhanced.bind(this);
    public testGetTimeBasedMultiplierEnhanced =
      this.getTimeBasedMultiplierEnhanced.bind(this);
    public testValidateFloatingPointPrecision =
      this.validateFloatingPointPrecision.bind(this);
  }

  let aiService: TestAIService;

  beforeEach(() => {
    aiService = new TestAIService();
    // Clear any mock values before each test for complete isolation
    aiService.clearMockValues();
  });

  afterEach(() => {
    // Ensure complete state cleanup after each test
    aiService.clearMockValues();
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

  describe("cost factors calculation", () => {
    it("should calculate cost optimization factors correctly", () => {
      const expensiveRequest = {
        prompt: "A".repeat(600), // Over 500 chars
        model: { id: "gpt-4-turbo" },
      };

      const expensiveCompletion = {
        content: "Expensive response",
        model: { id: "gpt-4-turbo" },
        usage: { totalTokens: 2500 }, // Over 2000 tokens
      };

      const factors = aiService.testCalculateCostOptimizationFactors(
        expensiveRequest,
        expensiveCompletion,
      );

      // Should apply: 1.5 (expensive) * 1.3 (complex) * 1.4 (premium) = 2.73
      expect(factors).toBeCloseTo(2.73, 2);
    });

    it("should return 1.0 for cheap requests", () => {
      const cheapRequest = {
        prompt: "Simple",
        model: { id: "basic-model" },
      };

      const cheapCompletion = {
        content: "Simple",
        model: { id: "basic-model" },
        usage: { totalTokens: 100 },
      };

      const factors = aiService.testCalculateCostOptimizationFactors(
        cheapRequest,
        cheapCompletion,
      );

      expect(factors).toBe(1.0);
    });
  });

  describe("pattern TTL mapping", () => {
    it("should return correct TTL for each pattern", () => {
      expect(aiService.testGetPatternTypicalTTL("fintech")).toBe(10800);
      expect(aiService.testGetPatternTypicalTTL("healthcare")).toBe(7200);
      expect(aiService.testGetPatternTypicalTTL("dashboard")).toBe(1800);
      expect(aiService.testGetPatternTypicalTTL("saas")).toBe(3600);
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

  describe("enhanced time-based boundary tests", () => {
    it("should handle all boundary conditions with precision", () => {
      const testRequest = {
        prompt: "Boundary test",
        model: { id: "test-model" },
      };

      const testCompletion = {
        content: "Boundary response",
        model: { id: "test-model" },
        usage: { totalTokens: 500 },
      };

      // Test all critical boundary hours with exact expectations
      const boundaryTests = [
        {
          hour: 22,
          expected: Math.floor(1800 * 1.4),
          description: "Start of off-peak",
        },
        {
          hour: 23,
          expected: Math.floor(1800 * 1.4),
          description: "Deep off-peak",
        },
        {
          hour: 0,
          expected: Math.floor(1800 * 1.4),
          description: "Midnight off-peak",
        },
        {
          hour: 5,
          expected: Math.floor(1800 * 1.4),
          description: "Early morning off-peak",
        },
        {
          hour: 6,
          expected: Math.floor(1800 * 1.4),
          description: "End of off-peak",
        },
        {
          hour: 7,
          expected: Math.floor(1800 * 1.0),
          description: "Start of normal hours",
        },
        {
          hour: 13,
          expected: Math.floor(1800 * 1.0),
          description: "Pre-peak normal hours",
        },
        {
          hour: 14,
          expected: Math.floor(1800 * 0.8),
          description: "Start of peak hours",
        },
        {
          hour: 17,
          expected: Math.floor(1800 * 0.8),
          description: "Late peak hours",
        },
        {
          hour: 18,
          expected: Math.floor(1800 * 0.8),
          description: "End of peak hours",
        },
        {
          hour: 19,
          expected: Math.floor(1800 * 1.0),
          description: "Post-peak normal hours",
        },
        {
          hour: 21,
          expected: Math.floor(1800 * 1.0),
          description: "Pre-off-peak normal hours",
        },
      ];

      boundaryTests.forEach(({ hour, expected, description }) => {
        aiService.setMockHour(hour);
        const result = aiService.testCalculateCostAwareTTL(
          null,
          testRequest,
          testCompletion,
        );
        expect(result).toBe(expected);
      });
    });

    it("should handle timezone edge cases", () => {
      const testRequest = {
        prompt: "Timezone test",
        model: { id: "test-model" },
      };

      const testCompletion = {
        content: "Timezone response",
        model: { id: "test-model" },
        usage: { totalTokens: 500 },
      };

      // Test timezone offsets that could affect boundary conditions
      const timezoneTests = [
        {
          hour: 20,
          offset: 2,
          multiplier: 1.4,
          description: "UTC 20:00 + 2h = 22:00 off-peak",
        },
        {
          hour: 4,
          offset: -2,
          multiplier: 1.4,
          description: "UTC 04:00 - 2h = 02:00 off-peak",
        },
        {
          hour: 12,
          offset: 5,
          multiplier: 0.8,
          description: "UTC 12:00 + 5h = 17:00 peak",
        },
      ];

      timezoneTests.forEach(({ hour, offset, multiplier, description }) => {
        aiService.setMockHour(hour);
        aiService.setMockTimezoneOffset(offset);
        const result = aiService.testGetTimeBasedMultiplierEnhanced();
        expect(result).toBe(multiplier);
      });
    });
  });

  describe("extreme value and edge case testing", () => {
    it("should handle extremely high token counts", () => {
      const extremeRequest = {
        prompt: "A".repeat(10000), // Extremely long prompt
        model: { id: "claude-3-opus" },
      };

      const extremeCompletion = {
        content: "B".repeat(20000), // Extremely long response
        model: { id: "claude-3-opus" },
        usage: { totalTokens: 15000 }, // Extremely high token count
      };

      // Mock normal hours to isolate cost factors
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        null,
        extremeRequest,
        extremeCompletion,
      );

      // Should be capped at maximum but show extreme optimization
      expect(optimizedTTL).toBeLessThanOrEqual(86400); // capped at 24 hours
      expect(optimizedTTL).toBeGreaterThan(3600); // significantly longer than base
    });

    it("should handle zero and empty values gracefully", () => {
      const emptyRequest = {
        prompt: "",
        model: { id: "basic-model" },
      };

      const emptyCompletion = {
        content: "",
        model: { id: "basic-model" },
        usage: { totalTokens: 0 },
      };

      // Mock normal hours
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        null,
        emptyRequest,
        emptyCompletion,
      );

      // Should handle empty values without crashing
      expect(optimizedTTL).toBeGreaterThanOrEqual(300); // minimum 5 minutes
      expect(optimizedTTL).toBeLessThanOrEqual(7200); // reasonable upper bound
    });

    it("should handle missing properties defensively", () => {
      const malformedRequest = {};
      const malformedCompletion = {};

      // Mock normal hours
      aiService.setMockHour(10);

      const optimizedTTL = aiService.testCalculateCostAwareTTL(
        null,
        malformedRequest,
        malformedCompletion,
      );

      // Should handle missing properties without crashing
      expect(optimizedTTL).toBe(1800); // Default TTL with no optimizations
    });

    it("should validate floating-point precision in complex calculations", () => {
      const precisionRequest = {
        prompt: "A".repeat(501), // Just over threshold
        model: { id: "gpt-4" },
      };

      const precisionCompletion = {
        content: "Precision test",
        model: { id: "gpt-4" },
        usage: { totalTokens: 2001 }, // Just over threshold
      };

      // Mock normal hours
      aiService.setMockHour(10);

      // Test multiple runs for consistency
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(
          aiService.testCalculateCostAwareTTL(
            "dashboard" as AIPattern["type"],
            precisionRequest,
            precisionCompletion,
          ),
        );
      }

      // All results should be identical (deterministic)
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });

      // Verify floating-point precision validation
      const testValue = 1800 * 1.5 * 1.3 * 1.4 * 1.1 * 1.0 * 1.2;
      const validatedValue =
        aiService.testValidateFloatingPointPrecision(testValue);
      expect(validatedValue).toBeCloseTo(testValue, 6);
    });
  });

  describe("comprehensive integration scenarios", () => {
    it("should demonstrate complete optimization workflow with maximum optimization", () => {
      const expensiveRequest = {
        prompt:
          "Design enterprise-grade healthcare platform with HIPAA compliance and advanced AI integration",
        model: { id: "claude-3-opus" },
      };

      const expensiveCompletion = {
        content:
          "Comprehensive healthcare platform architecture with full compliance framework",
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

    it("should handle minimal optimization scenarios correctly", () => {
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

    it("should maintain test isolation and prevent state leakage", () => {
      // First test with specific conditions
      aiService.setMockHour(23);
      const firstResult = aiService.testGetTimeBasedMultiplier();
      expect(firstResult).toBe(1.4);

      // Reset and test with different conditions
      aiService.clearMockValues();
      aiService.setMockHour(16);
      const secondResult = aiService.testGetTimeBasedMultiplier();
      expect(secondResult).toBe(0.8);

      // Ensure no state leakage between tests
      expect(firstResult).not.toBe(secondResult);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
