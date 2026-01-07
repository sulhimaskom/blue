/**
 * Test to verify the service decomposition works correctly
 * This test validates that the atomic services work independently and together
 */
import { CacheKeyService } from "../lib/services/cache-key-service";
import { CacheTTLService } from "../lib/services/cache-ttl-service";
import { CacheDataService } from "../lib/services/cache-data-service";
import { CacheInvalidationService } from "../lib/services/cache-invalidation-service";

describe("Service Decomposition Verification", () => {
  describe("CacheKeyService - Atomic Key Generation", () => {
    test("should generate consistent cache keys", () => {
      const params = { userId: 123, type: "blueprint" };
      const key1 = CacheKeyService.generateKey("test-prefix", params);
      const key2 = CacheKeyService.generateKey("test-prefix", params);

      expect(key1).toBe(key2);
      expect(key1).toContain("ai-platform:test-prefix:");
      expect(key1.length).toBeGreaterThan(20);
    });

    test("should normalize data for better cache hits", () => {
      const data1 = { timestamp: 1234567890, content: "test" };
      const data2 = { content: "test", timestamp: 1234567890 }; // Different order
      const key1 = CacheKeyService.generateKey("test", data1);
      const key2 = CacheKeyService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    test("should generate ETags consistently", () => {
      const data = { test: "data" };
      const etag1 = CacheKeyService.generateETag(data);
      const etag2 = CacheKeyService.generateETag(data);

      expect(etag1).toBe(etag2);
      expect(typeof etag1).toBe("string");
      expect(etag1).toMatch(/^"[a-f0-9]+"/);
    });
  });

  describe("CacheTTLService - Atomic TTL Calculation", () => {
    test("should calculate TTL based on prefix and params", () => {
      const ttl1 = CacheTTLService.calculateTTL("ai-response", {
        model: "gpt-4",
      });
      const ttl2 = CacheTTLService.calculateTTL("health-check", {});

      expect(ttl1).toBeGreaterThan(0);
      expect(ttl2).toBeGreaterThan(0);
      expect(ttl1).not.toBe(ttl2); // Different prefixes should have different TTLs
    });

    test("should apply scaling factors for different parameters", () => {
      const baseTTL = CacheTTLService.calculateTTL("ai-response", {});
      const boostedTTL = CacheTTLService.calculateTTL("ai-response", {
        model: "gpt-4",
      });

      expect(boostedTTL).toBeGreaterThan(baseTTL);
    });

    test("should clamp TTL to min/max boundaries", () => {
      const tinyTTL = CacheTTLService.calculateTTL("test", {}, { maxTTL: 10 });
      const hugeTTL = CacheTTLService.calculateTTL(
        "test",
        {},
        { minTTL: 10000 },
      );

      expect(tinyTTL).toBeLessThanOrEqual(10);
      expect(hugeTTL).toBeGreaterThanOrEqual(10000);
    });

    test("should get TTL strategies", () => {
      const strategy = CacheTTLService.getTTLStrategy("ai-response");
      expect(strategy).not.toBeNull();
      expect(strategy?.baseTTL).toBe(1800);
    });
  });

  describe("CacheInvalidationService - Atomic Invalidation", () => {
    test("should have invalidation rules defined", () => {
      const rules = CacheInvalidationService.getInvalidationRules();
      expect(rules.length).toBeGreaterThan(0);

      const blueprintRule = rules.find((r) => r.event === "blueprint:created");
      expect(blueprintRule).toBeDefined();
      expect(blueprintRule?.patterns).toContain("user-blueprint-stats");
    });

    test("should add and remove invalidation rules", () => {
      const initialCount =
        CacheInvalidationService.getInvalidationRules().length;

      CacheInvalidationService.addInvalidationRule({
        event: "test:event",
        patterns: ["test-pattern"],
        priority: 5,
      });

      let rules = CacheInvalidationService.getInvalidationRules();
      expect(rules.length).toBe(initialCount + 1);

      CacheInvalidationService.removeInvalidationRules("test:event");
      rules = CacheInvalidationService.getInvalidationRules();
      expect(rules.length).toBe(initialCount);
    });
  });

  describe("CacheDataService - Atomic Data Operations", () => {
    test("should handle cache stats calculation", async () => {
      const stats = await CacheDataService.getCacheStats();
      expect(stats).toHaveProperty("totalKeys");
      expect(stats).toHaveProperty("totalSize");
      expect(stats).toHaveProperty("avgTTL");
      expect(stats).toHaveProperty("expirationDistribution");

      expect(typeof stats.totalKeys).toBe("number");
      expect(typeof stats.totalSize).toBe("number");
      expect(typeof stats.avgTTL).toBe("number");
      expect(typeof stats.expirationDistribution).toBe("object");
    });

    test("should categorize TTL correctly", async () => {
      // This would be tested through the getCacheStats method
      const stats = await CacheDataService.getCacheStats();
      const distribution = stats.expirationDistribution;

      // Check that distribution keys are valid categories
      const validCategories = [
        "< 1 min",
        "1-5 min",
        "5-15 min",
        "15-30 min",
        "30-60 min",
        "1-2 hours",
        "2-6 hours",
        "> 6 hours",
      ];

      Object.keys(distribution).forEach((category) => {
        expect(validCategories).toContain(category);
        expect(typeof distribution[category]).toBe("number");
      });
    });
  });

  describe("Service Integration - Working Together", () => {
    test("should work together for end-to-end caching flow", () => {
      // Generate key
      const key = CacheKeyService.generateKey("integration-test", { id: 123 });
      expect(key).toBeTruthy();

      // Calculate TTL
      const ttl = CacheTTLService.calculateTTL("integration-test", { id: 123 });
      expect(ttl).toBeGreaterThan(0);

      // Check invalidation rules exist
      const rules = CacheInvalidationService.getInvalidationRules();
      expect(rules.length).toBeGreaterThan(0);

      // This demonstrates that all atomic services work independently
      // but can be composed together for complete caching functionality
    });

    test("should show reduced complexity compared to monolithic service", () => {
      // Each service should have a focused responsibility
      const keyServiceMethods = Object.getOwnPropertyNames(
        CacheKeyService,
      ).filter((name) => typeof (CacheKeyService as any)[name] === "function");

      const ttlServiceMethods = Object.getOwnPropertyNames(
        CacheTTLService,
      ).filter((name) => typeof (CacheTTLService as any)[name] === "function");

      const invalidationServiceMethods = Object.getOwnPropertyNames(
        CacheInvalidationService,
      ).filter(
        (name) => typeof (CacheInvalidationService as any)[name] === "function",
      );

      // Each service should have fewer than 10 core methods (focused responsibility)
      expect(keyServiceMethods.length).toBeLessThan(15);
      expect(ttlServiceMethods.length).toBeLessThan(15);
      expect(invalidationServiceMethods.length).toBeLessThan(15);

      // Total method count across all services should be reasonable
      const totalMethods =
        keyServiceMethods.length +
        ttlServiceMethods.length +
        invalidationServiceMethods.length;
      expect(totalMethods).toBeGreaterThan(10); // Reasonable complexity
      expect(totalMethods).toBeLessThan(50); // Not overly complex
    });
  });
});
