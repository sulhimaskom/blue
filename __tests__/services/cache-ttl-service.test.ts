import { CacheTTLService } from "@/lib/services/cache/cache-ttl-service";
import { redisManager } from "@/lib/redis";
import { logger } from "@/lib/logger";

jest.mock("@/lib/redis");
jest.mock("@/lib/logger");

describe("CacheTTLService - Critical Path Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("calculateTTL - Static TTL Calculation", () => {
    it("should return AI_RESPONSE_TTL for ai-response prefix", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response");
      expect(ttl).toBe(1800); // 30 minutes
    });

    it("should return RESEARCH_DATA_TTL for research prefix", () => {
      const ttl = CacheTTLService.calculateTTL("research");
      expect(ttl).toBe(7200); // 2 hours
    });

    it("should return BLUEPRINT_TTL for blueprint prefix", () => {
      const ttl = CacheTTLService.calculateTTL("blueprint");
      expect(ttl).toBe(3600); // 1 hour
    });

    it("should return METRICS_TTL for metrics prefix", () => {
      const ttl = CacheTTLService.calculateTTL("metrics");
      expect(ttl).toBe(300); // 5 minutes
    });

    it("should return HEALTH_TTL for health prefix", () => {
      const ttl = CacheTTLService.calculateTTL("health");
      expect(ttl).toBe(60); // 1 minute
    });

    it("should return DEFAULT_TTL for unknown prefix", () => {
      const ttl = CacheTTLService.calculateTTL("unknown-prefix");
      expect(ttl).toBe(3600); // 1 hour default
    });

    it("should use custom TTL when provided", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response", { customTTL: 900 });
      expect(ttl).toBe(900); // Custom TTL overrides
    });

    it("should enforce minimum TTL of 60 seconds for custom TTL", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response", { customTTL: 30 });
      expect(ttl).toBe(60); // Enforced minimum
    });

    it("should calculate response TTL based on large content size (>100KB)", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: 150000 });
      expect(ttl).toBe(1800); // 30 minutes for large content
    });

    it("should calculate response TTL based on medium content size (>10KB)", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: 50000 });
      expect(ttl).toBe(900); // 15 minutes for medium content
    });

    it("should calculate response TTL based on small content size (<10KB)", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: 5000 });
      expect(ttl).toBe(300); // 5 minutes for small content
    });

    it("should handle zero content size for response TTL", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: 0 });
      expect(ttl).toBe(300); // 5 minutes default
    });

    it("should use custom TTL over content-based calculation", () => {
      const ttl = CacheTTLService.calculateTTL("response", {
        customTTL: 600,
        size: 150000,
      });
      expect(ttl).toBe(600); // Custom TTL overrides content-based
    });
  });

  describe("calculateDynamicTTL - Dynamic TTL Calculation", () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        get: jest.fn(),
        keys: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
    });

    it("should increase TTL by 50% when hit rate > 0.8", async () => {
      mockRedis.get
        .mockResolvedValueOnce("85")
        .mockResolvedValueOnce("15");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(2700); // 1800 * 1.5
    });

    it("should decrease TTL by 50% when hit rate < 0.3", async () => {
      mockRedis.get
        .mockResolvedValueOnce("20")
        .mockResolvedValueOnce("80");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(900); // 1800 * 0.5
    });

    it("should keep base TTL when hit rate is 0.5", async () => {
      mockRedis.get
        .mockResolvedValueOnce("50")
        .mockResolvedValueOnce("50");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // No adjustment
    });

    it("should decrease TTL by 20% when pattern count > 100", async () => {
      mockRedis.get
        .mockResolvedValueOnce("50")
        .mockResolvedValueOnce("50");
      mockRedis.keys.mockResolvedValueOnce(Array(150).fill("key"));

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBeCloseTo(1440); // 1800 * 0.8
    });

    it("should combine hit rate and pattern count adjustments", async () => {
      mockRedis.get
        .mockResolvedValueOnce("85")
        .mockResolvedValueOnce("15");
      mockRedis.keys.mockResolvedValueOnce(Array(120).fill("key"));

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBeCloseTo(2160); // 1800 * 1.5 * 0.8
    });

    it("should enforce minimum TTL of 60 seconds", async () => {
      mockRedis.get
        .mockResolvedValueOnce("5")
        .mockResolvedValueOnce("95");
      mockRedis.keys.mockResolvedValueOnce(Array(200).fill("key"));

      const ttl = await CacheTTLService.calculateDynamicTTL("health");
      expect(ttl).toBe(60); // Minimum enforced
    });

    it("should enforce maximum TTL of 86400 seconds (24 hours)", async () => {
      mockRedis.get
        .mockResolvedValueOnce("95")
        .mockResolvedValueOnce("5");
      mockRedis.keys.mockResolvedValueOnce([]);

      const ttl = await CacheTTLService.calculateDynamicTTL("blueprint");
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it("should use default hit rate when Redis is unavailable", async () => {
      (redisManager.getClient as jest.Mock).mockResolvedValue(null);

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // Base TTL with default hit rate
    });

    it("should use default hit rate when cache stats are missing", async () => {
      mockRedis.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // Base TTL with default hit rate
    });

    it("should return base TTL when total operations is zero", async () => {
      mockRedis.get
        .mockResolvedValueOnce("0")
        .mockResolvedValueOnce("0");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // Base TTL
    });

    it("should handle Redis errors gracefully and return base TTL", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis connection error"));

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // Base TTL on error
    });

    it("should log warning when Redis error occurs", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis connection error"));

      await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get cache hit rate",
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it("should handle pattern count errors gracefully", async () => {
      mockRedis.get
        .mockResolvedValueOnce("50")
        .mockResolvedValueOnce("50");
      mockRedis.keys.mockRejectedValue(new Error("Keys command failed"));

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBeCloseTo(1800); // Base TTL without pattern adjustment
    });

    it("should log warning when pattern count fails", async () => {
      mockRedis.get
        .mockResolvedValueOnce("50")
        .mockResolvedValueOnce("50");
      mockRedis.keys.mockRejectedValue(new Error("Keys command failed"));

      await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("getTTLRecommendations - TTL Recommendations", () => {
    it("should return recommendations for ai-response", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs["ai-response"]).toEqual({
        min: 900,
        max: 3600,
        recommended: 1800,
      });
    });

    it("should return recommendations for research", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs.research).toEqual({
        min: 1800,
        max: 14400,
        recommended: 7200,
      });
    });

    it("should return recommendations for blueprint", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs.blueprint).toEqual({
        min: 600,
        max: 7200,
        recommended: 3600,
      });
    });

    it("should return recommendations for metrics", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs.metrics).toEqual({
        min: 60,
        max: 600,
        recommended: 300,
      });
    });

    it("should return recommendations for health", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs.health).toEqual({
        min: 30,
        max: 300,
        recommended: 60,
      });
    });

    it("should return recommendations for response", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      expect(recs.response).toEqual({
        min: 60,
        max: 1800,
        recommended: 300,
      });
    });
  });

  describe("validateTTL - TTL Validation", () => {
    it("should return true for valid TTL (1 second)", () => {
      expect(CacheTTLService.validateTTL(1)).toBe(true);
    });

    it("should return true for valid TTL (86400 seconds = 24 hours)", () => {
      expect(CacheTTLService.validateTTL(86400)).toBe(true);
    });

    it("should return true for valid TTL (3600 seconds = 1 hour)", () => {
      expect(CacheTTLService.validateTTL(3600)).toBe(true);
    });

    it("should return false for TTL of 0", () => {
      expect(CacheTTLService.validateTTL(0)).toBe(false);
    });

    it("should return false for negative TTL", () => {
      expect(CacheTTLService.validateTTL(-60)).toBe(false);
    });

    it("should return false for TTL exceeding 86400 seconds", () => {
      expect(CacheTTLService.validateTTL(86401)).toBe(false);
    });

    it("should return false for large TTL values", () => {
      expect(CacheTTLService.validateTTL(100000)).toBe(false);
    });
  });

  describe("getCacheExpirations - Cache Expiration Monitoring", () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        keys: jest.fn(),
        ttl: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
    });

    it("should return expirations for all known patterns", async () => {
      const patterns = ["ai-response", "research", "blueprint", "metrics", "health"];
      mockRedis.keys.mockResolvedValue(["ai-platform:ai-response:test-key"]);
      mockRedis.ttl.mockResolvedValue(1200);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(Object.keys(expirations)).toEqual(expect.arrayContaining(patterns));
      expect(mockRedis.keys).toHaveBeenCalledTimes(5);
    });

    it("should return TTL value for existing cache keys", async () => {
      mockRedis.keys.mockResolvedValue(["ai-platform:ai-response:test-key"]);
      mockRedis.ttl.mockResolvedValue(1800);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations["ai-response"]).toBe(1800);
      expect(mockRedis.ttl).toHaveBeenCalledWith("ai-platform:ai-response:test-key");
    });

    it("should return 0 when no keys exist for pattern", async () => {
      mockRedis.keys.mockResolvedValue([]);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations["ai-response"]).toBeUndefined();
      expect(mockRedis.ttl).not.toHaveBeenCalled();
    });

    it("should return 0 when TTL is -1 (no expiration)", async () => {
      mockRedis.keys.mockResolvedValue(["ai-platform:ai-response:test-key"]);
      mockRedis.ttl.mockResolvedValue(-1);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations["ai-response"]).toBe(0);
    });

    it("should return 0 when TTL is -2 (key does not exist)", async () => {
      mockRedis.keys.mockResolvedValue(["ai-platform:ai-response:test-key"]);
      mockRedis.ttl.mockResolvedValue(-2);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations["ai-response"]).toBe(0);
    });

    it("should return empty object when Redis is unavailable", async () => {
      (redisManager.getClient as jest.Mock).mockResolvedValue(null);

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations).toEqual({});
      expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it("should handle Redis errors gracefully", async () => {
      mockRedis.keys.mockRejectedValue(new Error("Redis error"));

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations).toEqual({});
    });

    it("should log warning when Redis error occurs", async () => {
      mockRedis.keys.mockRejectedValue(new Error("Redis error"));

      await CacheTTLService.getCacheExpirations();
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get cache expirations",
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it("should handle TTL query errors gracefully", async () => {
      mockRedis.keys.mockResolvedValue(["ai-platform:ai-response:test-key"]);
      mockRedis.ttl.mockRejectedValue(new Error("TTL query failed"));

      const expirations = await CacheTTLService.getCacheExpirations();

      expect(expirations).toEqual(expect.any(Object));
    });
  });

  describe("Edge Cases - Boundary Conditions", () => {
    it("should handle extremely large custom TTL values", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response", { customTTL: 1000000 });
      expect(ttl).toBe(1000000); // No cap in calculateTTL (only in calculateDynamicTTL)
    });

    it("should handle negative custom TTL (enforces minimum)", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response", { customTTL: -100 });
      expect(ttl).toBe(60); // Minimum enforced
    });

    it("should handle zero custom TTL (no minimum enforcement for zero)", () => {
      const ttl = CacheTTLService.calculateTTL("ai-response", { customTTL: 0 });
      expect(ttl).toBe(1800); // Uses default TTL when customTTL is 0 (falsy)
    });

    it("should handle extremely large content sizes", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: 10000000 }); // 10MB
      expect(ttl).toBe(1800); // 30 minutes for >100KB
    });

    it("should handle negative content sizes", () => {
      const ttl = CacheTTLService.calculateTTL("response", { size: -100 });
      expect(ttl).toBe(300); // 5 minutes default for small content
    });

    it("should handle hit rate of exactly 0.8 (boundary)", async () => {
      const mockRedis = {
        get: jest.fn(),
        keys: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
      mockRedis.get.mockResolvedValueOnce("80").mockResolvedValueOnce("20");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // No adjustment (not > 0.8, exactly 0.8)
    });

    it("should handle hit rate of exactly 0.3 (boundary)", async () => {
      const mockRedis = {
        get: jest.fn(),
        keys: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
      mockRedis.get.mockResolvedValueOnce("30").mockResolvedValueOnce("70");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // No adjustment (not < 0.3)
    });

    it("should handle pattern count of exactly 100 (boundary)", async () => {
      const mockRedis = {
        get: jest.fn(),
        keys: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
      mockRedis.get.mockResolvedValueOnce("50").mockResolvedValueOnce("50");
      mockRedis.keys.mockResolvedValueOnce(Array(100).fill("key"));

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBe(1800); // No adjustment (not > 100)
    });
  });

  describe("Integration Scenarios - Real-World Usage", () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        get: jest.fn(),
        keys: jest.fn(),
        ttl: jest.fn(),
      };
      (redisManager.getClient as jest.Mock).mockResolvedValue(mockRedis);
    });

    it("should optimize AI response TTL with high hit rate", async () => {
      mockRedis.get.mockResolvedValueOnce("85").mockResolvedValueOnce("15");

      const ttl = await CacheTTLService.calculateDynamicTTL("ai-response");
      expect(ttl).toBeGreaterThan(1800); // Should be increased
    });

    it("should optimize research data TTL with low hit rate", async () => {
      mockRedis.get.mockResolvedValueOnce("15").mockResolvedValueOnce("85");

      const ttl = await CacheTTLService.calculateDynamicTTL("research");
      expect(ttl).toBeLessThan(7200); // Should be decreased
    });

    it("should handle mixed cache operations during expiration monitoring", async () => {
      mockRedis.keys.mockImplementation((pattern: string) => {
        if (pattern.includes("ai-response")) {
          return Promise.resolve(["ai-platform:ai-response:1", "ai-platform:ai-response:2"]);
        }
        return Promise.resolve(["test-key"]);
      });
      mockRedis.ttl.mockResolvedValue(600);

      const expirations = await CacheTTLService.getCacheExpirations();
      expect(expirations["ai-response"]).toBe(600);
    });

    it("should maintain TTL recommendations consistency across cache types", () => {
      const recs = CacheTTLService.getTTLRecommendations();
      const cacheTypes = ["ai-response", "research", "blueprint", "metrics", "health", "response"];

      cacheTypes.forEach(type => {
        expect(recs[type]).toHaveProperty("min");
        expect(recs[type]).toHaveProperty("max");
        expect(recs[type]).toHaveProperty("recommended");
        expect(recs[type].min).toBeLessThanOrEqual(recs[type].recommended);
        expect(recs[type].recommended).toBeLessThanOrEqual(recs[type].max);
      });
    });
  });
});
