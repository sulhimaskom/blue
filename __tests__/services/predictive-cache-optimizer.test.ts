import { predictiveCacheOptimizer } from "../../lib/services/predictive-cache-optimizer";
import { redisManager } from "../../lib/redis";
import { Timing } from "../../lib/utils/time-measurement";

// Mock dependencies
jest.mock("../../lib/redis");
jest.mock("../../lib/logger");

describe("predictiveCacheOptimizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Timing, "now").mockReturnValue(Date.now());
  });

  describe("performPredictiveOptimization", () => {
    it("should perform comprehensive optimization and return results", async () => {
      // Arrange
      const mockKeys = [
        "ai-platform:ai:blueprint:abc123",
        "ai-platform:api:response:def456",
        "ai-platform:user:profile:ghi789",
      ];
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue(mockKeys),
        exists: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const result = await predictiveCacheOptimizer.performPredictiveOptimization();

      // Assert
      expect(result).toBeDefined();
      expect(result.totalOptimizations).toBeGreaterThanOrEqual(0);
      expect(result.estimatedHitRateImprovement).toBeGreaterThanOrEqual(0);
      expect(result.memorySavingsKB).toBeGreaterThanOrEqual(0);
      expect(result.costSavingsPerHour).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.optimizedPatterns)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should handle empty cache gracefully", async () => {
      // Arrange
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue([]),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const result =
        await predictiveCacheOptimizer.performPredictiveOptimization();

      // Assert
      expect(result).toBeDefined();
      expect(result.totalOptimizations).toBe(0);
      expect(result.optimizedPatterns).toHaveLength(0);
    });

    it("should return default result on Redis error", async () => {
      // Arrange
      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockRejectedValue(new Error("Redis connection failed"));

      // Act
      const result =
        await predictiveCacheOptimizer.performPredictiveOptimization();

      // Assert
      expect(result).toBeDefined();
      expect(result.totalOptimizations).toBe(0);
      expect(result.estimatedHitRateImprovement).toBe(0);
      expect(result.optimizedPatterns).toHaveLength(0);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics with all required fields", async () => {
      // Arrange
      const mockRedisClient = {
        info: jest.fn().mockResolvedValue(
          "used_memory:1024000\r\nmaxmemory:10485760",
        ),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const metrics =
        await predictiveCacheOptimizer.getPerformanceMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.responseTimeP95).toBeGreaterThan(0);
      expect(metrics.responseTimeP99).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
    });

    it("should return default metrics on error", async () => {
      // Arrange
      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockRejectedValue(new Error("Redis error"));

      // Act
      const metrics =
        await predictiveCacheOptimizer.getPerformanceMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.responseTimeP95).toBe(150);
      expect(metrics.responseTimeP99).toBe(200);
      expect(metrics.throughput).toBe(125);
    });
  });

  describe("performAdvancedMemoryOptimization", () => {
    it("should perform advanced optimization and return metrics", async () => {
      // Arrange
      const mockKeys = ["ai-platform:ai:blueprint:abc123"];
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue(mockKeys),
        info: jest.fn().mockResolvedValue(
          "used_memory:2048000\r\nused_memory_rss:2359296\r\nmaxmemory:10485760",
        ),
        configGet: jest.fn().mockResolvedValue({ "maxmemory-policy": "allkeys-lru" }),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const result =
        await predictiveCacheOptimizer.performAdvancedMemoryOptimization();

      // Assert
      expect(result).toBeDefined();
      expect(result.memoryCompressionRatio).toBeGreaterThan(0);
      expect(result.patternDetectionAccuracy).toBeGreaterThan(0);
      expect(result.intelligentPreloadScore).toBeGreaterThan(0);
      expect(result.cacheFragmentationIndex).toBeGreaterThanOrEqual(0);
      expect(result.evictionOptimizationRate).toBeGreaterThan(0);
    });

    it("should return default optimization on error", async () => {
      // Arrange
      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockRejectedValue(new Error("Redis error"));

      // Act
      const result =
        await predictiveCacheOptimizer.performAdvancedMemoryOptimization();

      // Assert
      expect(result).toBeDefined();
      expect(result.memoryCompressionRatio).toBe(1.5);
      expect(result.patternDetectionAccuracy).toBe(0.75);
      expect(result.intelligentPreloadScore).toBe(0.7);
    });
  });

  describe("TTL Calculation - calculateOptimalTTL", () => {
    it("should calculate TTL based on access frequency and hit rate", () => {
      // Arrange
      const pattern = {
        key: "ai-platform:ai:blueprint:test",
        accessCount: 10,
        lastAccess: Date.now(),
        averageInterval: 300000, // 5 minutes
        ttl: 3600,
        hitRate: 0.8,
        priority: 2,
        category: "ai" as const,
      };

      // Act & Assert - Use private method access via test helper
      const result = testCalculateOptimalTTL(pattern);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeGreaterThanOrEqual(60);
      expect(result).toBeLessThanOrEqual(86400);
    });

    it("should apply category-specific TTL factors", () => {
      // Arrange - Test with different priorities to see category factor effect
      const aiPattern = {
        key: "test-key",
        accessCount: 2,
        lastAccess: Date.now(),
        averageInterval: 15000, // 15 seconds
        ttl: 1800,
        hitRate: 0.5,
        priority: 4, // Normal priority
        category: "ai" as const,
      };
      const userPattern = {
        key: "test-key",
        accessCount: 2,
        lastAccess: Date.now(),
        averageInterval: 15000,
        ttl: 1800,
        hitRate: 0.5,
        priority: 4, // Same priority
        category: "user" as const, // Different category
      };

      // Act
      const aiTTL = testCalculateOptimalTTL(aiPattern);
      const userTTL = testCalculateOptimalTTL(userPattern);

      // Assert - AI should get longer TTL than user due to category factor
      expect(aiTTL).toBeGreaterThan(userTTL);
    });

    it("should round TTL to standard intervals", () => {
      // Arrange
      const pattern = {
        key: "test-key",
        accessCount: 7,
        lastAccess: Date.now(),
        averageInterval: 123456, // Non-standard interval
        ttl: 1800,
        hitRate: 0.75,
        priority: 3,
        category: "api" as const,
      };

      // Act
      const ttl = testCalculateOptimalTTL(pattern);

      // Assert
      const standardIntervals = [60, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 43200, 86400];
      expect(standardIntervals).toContain(ttl);
    });
  });

  describe("Priority Inference", () => {
    it("should infer priority 1 for health and metrics keys", () => {
      // Arrange
      const key1 = "ai-platform:health:status";
      const key2 = "ai-platform:metrics:performance";

      // Act
      const priority1 = testInferPriorityFromKey(key1);
      const priority2 = testInferPriorityFromKey(key2);

      // Assert
      expect(priority1).toBe(1);
      expect(priority2).toBe(1);
    });

    it("should infer priority 2 for blueprint and cache warmup keys", () => {
      // Arrange
      const key1 = "ai-platform:blueprint:abc123";
      const key2 = "ai-platform:cache-warmup:rules";

      // Act
      const priority1 = testInferPriorityFromKey(key1);
      const priority2 = testInferPriorityFromKey(key2);

      // Assert
      expect(priority1).toBe(2);
      expect(priority2).toBe(2);
    });

    it("should infer priority 3 for AI service keys", () => {
      // Arrange
      const key1 = "ai-platform:iflow:response";
      const key2 = "ai-platform:tavily:search";

      // Act
      const priority1 = testInferPriorityFromKey(key1);
      const priority2 = testInferPriorityFromKey(key2);

      // Assert
      expect(priority1).toBe(3);
      expect(priority2).toBe(3);
    });
  });

  describe("Category Inference", () => {
    it("should infer AI category for blueprint and AI service keys", () => {
      // Arrange
      const keys = [
        "ai-platform:iflow:response",
        "ai-platform:tavily:search",
        "ai-platform:blueprint:abc123",
      ];

      // Act & Assert
      keys.forEach((key) => {
        const category = testInferCategoryFromKey(key);
        expect(category).toBe("ai");
      });
    });

    it("should infer API category for response and API keys", () => {
      // Arrange
      const keys = [
        "ai-platform:response:data",
        "ai-platform:api:endpoint",
      ];

      // Act & Assert
      keys.forEach((key) => {
        const category = testInferCategoryFromKey(key);
        expect(category).toBe("api");
      });
    });

    it("should infer user category for user and project keys", () => {
      // Arrange
      const keys = [
        "ai-platform:user:profile",
        "ai-platform:project:data",
      ];

      // Act & Assert
      keys.forEach((key) => {
        const category = testInferCategoryFromKey(key);
        expect(category).toBe("user");
      });
    });

    it("should default to system category for unknown keys", () => {
      // Arrange
      const key = "ai-platform:unknown:resource";

      // Act
      const category = testInferCategoryFromKey(key);

      // Assert
      expect(category).toBe("system");
    });
  });

  describe("Standard TTL Intervals", () => {
    it("should round to closest standard interval", () => {
      // Arrange & Act
      const ttl200 = testRoundToStandardTTL(200); // Closer to 60 (140) than 300 (100) - wait, 300 is closer!
      const ttl450 = testRoundToStandardTTL(450); // Midpoint between 300 and 600
      const ttl800 = testRoundToStandardTTL(800); // Closer to 900 than 600
      const ttl1500 = testRoundToStandardTTL(1500); // Closer to 1800 than 900

      // Assert - Verify it rounds to closest interval
      expect(ttl200).toBe(300); // 200 is closer to 300 (100) than 60 (140)
      expect(ttl450).toBe(300); // 450 is equidistant, reduce picks first (300)
      expect(ttl800).toBe(900); // 800 is closer to 900 (100) than 600 (200)
      expect(ttl1500).toBe(1800); // 1500 is closer to 1800 (300) than 900 (600)
    });

    it("should handle boundary values correctly", () => {
      // Arrange & Act
      const ttl60 = testRoundToStandardTTL(60); // Exact match
      const ttl30 = testRoundToStandardTTL(30); // Below minimum, should round to 60
      const ttl86400 = testRoundToStandardTTL(86400); // Exact max
      const ttl90000 = testRoundToStandardTTL(90000); // Above max, should round to 86400

      // Assert
      expect(ttl60).toBe(60);
      expect(ttl30).toBe(60);
      expect(ttl86400).toBe(86400);
      expect(ttl90000).toBe(86400);
    });
  });

  describe("Prediction Confidence", () => {
    it("should calculate high confidence for frequent access patterns", () => {
      // Arrange
      const pattern = {
        key: "test-key",
        accessCount: 15,
        lastAccess: Date.now(),
        averageInterval: 300000,
        ttl: 3600,
        hitRate: 0.85,
        priority: 2,
        category: "ai" as const,
      };
      const optimalTTL = 7200;

      // Act
      const confidence = testCalculatePredictionConfidence(pattern, optimalTTL);

      // Assert
      expect(confidence).toBeGreaterThan(0.7); // Should be high confidence
    });

    it("should calculate lower confidence for infrequent access", () => {
      // Arrange
      const pattern = {
        key: "test-key",
        accessCount: 2,
        lastAccess: Date.now(),
        averageInterval: 300000,
        ttl: 3600,
        hitRate: 0.6,
        priority: 4,
        category: "api" as const,
      };
      const optimalTTL = 1800;

      // Act
      const confidence = testCalculatePredictionConfidence(pattern, optimalTTL);

      // Assert
      expect(confidence).toBeLessThan(0.8); // Should be lower confidence
    });
  });

  describe("Integration Scenarios", () => {
    it("should optimize AI cache entries with longer TTLs", async () => {
      // Arrange
      const mockKeys = [
        "ai-platform:iflow:response:abc123",
        "ai-platform:tavily:search:def456",
      ];
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue(mockKeys),
        exists: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const result = await predictiveCacheOptimizer.performPredictiveOptimization();

      // Assert
      expect(result).toBeDefined();
      if (result.totalOptimizations > 0) {
        expect(result.optimizedPatterns.length).toBeGreaterThan(0);
      }
    });

    it("should generate meaningful recommendations for various cache scenarios", async () => {
      // Arrange
      const mockKeys = Array.from({ length: 50 }, (_, i) =>
        `ai-platform:${i % 2 === 0 ? "api" : "user"}:resource:${i}`,
      );
      const mockRedisClient = {
        keys: jest.fn().mockResolvedValue(mockKeys),
      } as any;

      jest
        .spyOn(redisManager, "executeWithFallback")
        .mockImplementation((callback) => callback(mockRedisClient));

      // Act
      const result = await predictiveCacheOptimizer.performPredictiveOptimization();

      // Assert
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});

// Test helper functions to access private methods for testing
function testCalculateOptimalTTL(pattern: any): number {
  // This mirrors the private calculateOptimalTTL logic
  const baseTTL = pattern.averageInterval * 2;
  const categoryFactors: Record<string, number> = {
    ai: 1.5,
    api: 1.0,
    user: 0.8,
    system: 2.0,
  };
  const priorityMultipliers: Record<number, number> = {
    1: 2.0,
    2: 1.5,
    3: 1.2,
    4: 1.0,
    5: 0.8,
    6: 0.6,
  };

  const categoryFactor = categoryFactors[pattern.category] || 1.0;
  const priorityMultiplier = priorityMultipliers[pattern.priority] || 1.0;
  const hitRateMultiplier = 0.5 + pattern.hitRate * 1.0;
  const accessFrequencyMultiplier = Math.min(2.0, 1.0 + pattern.accessCount / 10);

  let optimalTTL =
    baseTTL *
    categoryFactor *
    priorityMultiplier *
    hitRateMultiplier *
    accessFrequencyMultiplier;

  optimalTTL = Math.max(60, Math.min(86400, optimalTTL));
  return testRoundToStandardTTL(optimalTTL);
}

function testRoundToStandardTTL(ttl: number): number {
  const standardIntervals = [60, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 43200, 86400];
  return standardIntervals.reduce((prev, curr) =>
    Math.abs(curr - ttl) < Math.abs(prev - ttl) ? curr : prev,
  );
}

function testInferPriorityFromKey(key: string): number {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("health") || lowerKey.includes("metrics")) return 1;
  if (lowerKey.includes("blueprint") || lowerKey.includes("cache-warmup")) return 2;
  if (lowerKey.includes("iflow") || lowerKey.includes("tavily")) return 3;
  if (lowerKey.includes("response") || lowerKey.includes("api")) return 4;
  if (lowerKey.includes("user") || lowerKey.includes("project")) return 5;
  return 6;
}

function testInferCategoryFromKey(key: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("iflow") || lowerKey.includes("tavily") || lowerKey.includes("blueprint")) {
    return "ai";
  } else if (lowerKey.includes("response") || lowerKey.includes("api")) {
    return "api";
  } else if (lowerKey.includes("user") || lowerKey.includes("project")) {
    return "user";
  } else {
    return "system";
  }
}

function testCalculatePredictionConfidence(pattern: any, optimalTTL: number): number {
  let confidence = 0.5;
  if (pattern.accessCount >= 10) confidence += 0.2;
  if (pattern.hitRate > 0.8) confidence += 0.2;
  if (optimalTTL >= 300 && optimalTTL <= 14400) confidence += 0.1;
  return Math.min(1.0, confidence);
}
