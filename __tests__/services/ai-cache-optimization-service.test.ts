/**
 * AI Cache Optimization Service Tests
 *
 * @domain ai-agent-engineer
 * @date 2026-02-25
 * @author AI Agent Engineer
 *
 * Tests for the AICacheOptimizationService which provides comprehensive
 * metrics and analytics for AI cache optimization.
 */

import {
  AICacheOptimizationService,
} from "../../lib/services/ai-cache-optimization-service";
import { redisManager } from "../../lib/redis";

// Mock dependencies
jest.mock("../../lib/redis");
jest.mock("../../lib/logger");

describe("AICacheOptimizationService", () => {
  let service: AICacheOptimizationService;

  beforeEach(() => {
    // Reset the singleton instance for testing
    (AICacheOptimizationService as any).instance = undefined;
    service = AICacheOptimizationService.getInstance();
    jest.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    test("should return same instance", () => {
      const instance1 = AICacheOptimizationService.getInstance();
      const instance2 = AICacheOptimizationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test("should be instantiated with getInstance", () => {
      expect(service).toBeDefined();
    });
  });

  describe("getOptimizationMetrics", () => {
    test("should return comprehensive optimization metrics", async () => {
      // Mock Redis to return test data
      (redisManager.executeWithFallback as jest.Mock).mockResolvedValue({
        memoryUsage: "used_memory_human:1MB\r\nused_memory:1048576",
        keyspace: "db0:keys=10,expires=5,avg_ttl=3600000",
      });

      const metrics = await service.getOptimizationMetrics();

      expect(metrics).toHaveProperty("cachePerformance");
      expect(metrics).toHaveProperty("costOptimization");
      expect(metrics).toHaveProperty("patternOptimization");
      expect(metrics).toHaveProperty("timeOptimization");
      expect(metrics).toHaveProperty("overallImpact");
    });

    test("should handle Redis failure gracefully", async () => {
      // Mock Redis to throw an error
      (redisManager.executeWithFallback as jest.Mock).mockRejectedValue(
        new Error("Redis connection failed")
      );

      const metrics = await service.getOptimizationMetrics();

      // Should still return metrics with fallback values
      expect(metrics).toBeDefined();
      expect(metrics.cachePerformance).toBeDefined();
      expect(metrics.cachePerformance.totalCacheKeys).toBe(0);
      expect(metrics.cachePerformance.cacheEfficiency).toBe(0);
    });
  });

  describe("Cache Hit Rate", () => {
    test("should return default cache hit rate", async () => {
      const hitRate = await (service as any).getOverallCacheHitRate();
      expect(hitRate).toBe(75);
    });
  });

  describe("Time-Based Optimization", () => {
    test("should calculate time-based multiplier for off-peak hours", () => {
      // Test off-peak (23:00)
      const multiplier = (service as any).getTimeBasedMultiplier(23);
      expect(multiplier).toBe(1.4);
    });

    test("should calculate time-based multiplier for peak hours", () => {
      // Test peak (15:00)
      const multiplier = (service as any).getTimeBasedMultiplier(15);
      expect(multiplier).toBe(0.8);
    });

    test("should calculate time-based multiplier for normal hours", () => {
      // Test normal (10:00)
      const multiplier = (service as any).getTimeBasedMultiplier(10);
      expect(multiplier).toBe(1.0);
    });

    test("should return correct time category for off-peak", () => {
      const category = (service as any).getTimeCategory(23);
      expect(category).toBe("off-peak");
    });

    test("should return correct time category for peak", () => {
      const category = (service as any).getTimeCategory(15);
      expect(category).toBe("peak");
    });

    test("should return correct time category for normal", () => {
      const category = (service as any).getTimeCategory(10);
      expect(category).toBe("normal");
    });

    test("should calculate time-based savings for extended cache", () => {
      const savings = (service as any).calculateTimeBasedSavings(1.4);
      expect(savings).toBe("40% longer cache duration");
    });

    test("should calculate time-based savings for shorter cache", () => {
      const savings = (service as any).calculateTimeBasedSavings(0.8);
      expect(savings).toBe("20% shorter cache duration");
    });

    test("should calculate time-based savings for no change", () => {
      const savings = (service as any).calculateTimeBasedSavings(1.0);
      expect(savings).toBe("no change");
    });
  });

  describe("Optimization Factor", () => {
    test("should calculate optimization factor correctly", () => {
      const factor = (service as any).calculateOptimizationFactor(75);
      expect(factor).toBe(1 + (75 / 100) * 0.15);
      expect(factor).toBe(1.1125);
    });

    test("should return minimum factor for low hit rate", () => {
      const factor = (service as any).calculateOptimizationFactor(0);
      expect(factor).toBe(1.0);
    });
  });

  describe("Pattern Multiplier", () => {
    test("should return high multiplier for fintech pattern", () => {
      const multiplier = (service as any).calculatePatternMultiplier("fintech");
      expect(multiplier).toBe(1.6);
    });

    test("should return high multiplier for healthcare pattern", () => {
      const multiplier = (service as any).calculatePatternMultiplier("healthcare");
      expect(multiplier).toBe(1.6);
    });

    test("should return medium multiplier for saas pattern", () => {
      const multiplier = (service as any).calculatePatternMultiplier("saas");
      expect(multiplier).toBe(1.3);
    });

    test("should return medium multiplier for ecommerce pattern", () => {
      const multiplier = (service as any).calculatePatternMultiplier("ecommerce");
      expect(multiplier).toBe(1.3);
    });

    test("should return default multiplier for unknown pattern", () => {
      const multiplier = (service as any).calculatePatternMultiplier("unknown");
      expect(multiplier).toBe(1.1);
    });
  });

  describe("Pattern TTL", () => {
    test("should return correct TTL for fintech", async () => {
      const ttl = await (service as any).getAverageTTLForPattern("fintech");
      expect(ttl).toBe(10800);
    });

    test("should return correct TTL for healthcare", async () => {
      const ttl = await (service as any).getAverageTTLForPattern("healthcare");
      expect(ttl).toBe(7200);
    });

    test("should return correct TTL for saas", async () => {
      const ttl = await (service as any).getAverageTTLForPattern("saas");
      expect(ttl).toBe(3600);
    });

    test("should return default TTL for unknown pattern", async () => {
      const ttl = await (service as any).getAverageTTLForPattern("unknown");
      expect(ttl).toBe(1800);
    });
  });

  describe("Optimization Recommendation", () => {
    test("should recommend improvements for low hit rate", () => {
      const recommendation = (service as any).getOptimizationRecommendation(50);
      expect(recommendation).toContain("Consider increasing cache TTL");
    });

    test("should provide positive feedback for high hit rate", () => {
      const recommendation = (service as any).getOptimizationRecommendation(90);
      expect(recommendation).toContain("Excellent cache performance");
    });

    test("should provide balanced feedback for moderate hit rate", () => {
      const recommendation = (service as any).getOptimizationRecommendation(70);
      expect(recommendation).toContain("Good cache performance");
    });
  });

  describe("Overall Impact Calculation", () => {
    test("should calculate overall impact correctly", async () => {
      const impact = await (service as any).calculateOverallImpact();

      expect(impact).toHaveProperty("performanceImprovement");
      expect(impact).toHaveProperty("costReduction");
      expect(impact).toHaveProperty("roiMultiplier");
      expect(impact).toHaveProperty("recommendation");
    });
  });

  describe("Cache Efficiency", () => {
    test("should calculate cache efficiency", async () => {
      const efficiency = await (service as any).calculateCacheEfficiency();
      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe("Redis Memory Parsing", () => {
    test("should parse Redis memory info correctly", () => {
      const info = "used_memory_human:1MB\r\nused_memory:1048576\r\nmaxmemory:0";
      const parsed = (service as any).parseRedisMemoryInfo(info);

      expect(parsed.usedHuman).toBe("1MB");
      expect(parsed.used).toBe(1048576);
    });

    test("should handle missing memory info fields", () => {
      const info = "random_field:value";
      const parsed = (service as any).parseRedisMemoryInfo(info);

      expect(parsed.usedHuman).toBeUndefined();
      expect(parsed.used).toBeUndefined();
    });
  });
});
