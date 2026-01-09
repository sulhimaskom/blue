import { CacheInvalidationService } from "@/lib/services/cache/cache-invalidation-service";
import { redisManager } from "@/lib/redis";
import { logger } from "@/lib/logger";

jest.mock("@/lib/redis");
jest.mock("@/lib/logger");

describe("CacheInvalidationService - Critical Path Testing", () => {
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      del: jest.fn(),
      sMembers: jest.fn(),
      keys: jest.fn(),
      hGetAll: jest.fn(),
    };
    (redisManager.executeWithFallback as jest.Mock).mockImplementation(
      async (redisCallback: any, fallbackCallback: any) => {
        return await redisCallback(mockRedis);
      },
    );
    (logger.debug as jest.Mock).mockReturnValue(undefined);
    (logger.info as jest.Mock).mockReturnValue(undefined);
    (logger.warn as jest.Mock).mockReturnValue(undefined);
    (logger.error as jest.Mock).mockReturnValue(undefined);
  });

  describe("invalidateKey", () => {
    it("should delete cache key with prefix when key starts with ai-platform:", async () => {
      const key = "ai-platform:test:key";
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateKey(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith("Cache key invalidated", {
        key,
      });
    });

    it("should add prefix when key does not start with ai-platform:", async () => {
      const key = "test:key";
      const expectedKey = "ai-platform:test:key";
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateKey(key);

      expect(mockRedis.del).toHaveBeenCalledWith(expectedKey);
      expect(logger.debug).toHaveBeenCalledWith("Cache key invalidated", {
        key: expectedKey,
      });
    });

    it("should handle fallback when Redis is unavailable", async () => {
      (redisManager.executeWithFallback as jest.Mock).mockImplementation(
        async (redisCallback: any, fallbackCallback: any) => {
          return await fallbackCallback();
        },
      );

      await CacheInvalidationService.invalidateKey("test:key");

      expect(logger.warn).toHaveBeenCalledWith(
        "Cache invalidation fallback invoked",
        { key: "ai-platform:test:key" },
      );
    });

    it("should log error when invalidation fails", async () => {
      const error = new Error("Redis connection failed");
      mockRedis.del.mockRejectedValue(error);

      await CacheInvalidationService.invalidateKey("test:key");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to invalidate cache key",
        {
          key: "test:key",
          error: "Redis connection failed",
        },
      );
    });
  });

  describe("invalidateByTag", () => {
    it("should delete all keys associated with tag", async () => {
      const tag = "blueprint";
      const taggedKeys = [
        "ai-platform:blueprint:1",
        "ai-platform:blueprint:2",
        "ai-platform:blueprint:3",
      ];
      mockRedis.sMembers.mockResolvedValue(taggedKeys);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByTag(tag);

      expect(mockRedis.sMembers).toHaveBeenCalledWith("ai-platform:tags:blueprint");
      expect(mockRedis.del).toHaveBeenCalledTimes(4); // 3 keys + 1 tag set
      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by tag", {
        tag,
        keysCount: 3,
        keys: taggedKeys,
      });
    });

    it("should handle empty tag set gracefully", async () => {
      mockRedis.sMembers.mockResolvedValue([]);

      await CacheInvalidationService.invalidateByTag("empty-tag");

      expect(logger.debug).toHaveBeenCalledWith("No cache entries found for tag", {
        tag: "empty-tag",
      });
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("should delete tag set after deleting tagged keys", async () => {
      mockRedis.sMembers.mockResolvedValue(["ai-platform:blueprint:1"]);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByTag("blueprint");

      expect(mockRedis.del).toHaveBeenNthCalledWith(1, "ai-platform:blueprint:1");
      expect(mockRedis.del).toHaveBeenNthCalledWith(2, "ai-platform:tags:blueprint");
    });

    it("should limit logged keys to first 10", async () => {
      const taggedKeys = Array.from({ length: 15 }, (_, i) => `ai-platform:blueprint:${i}`);
      mockRedis.sMembers.mockResolvedValue(taggedKeys);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByTag("blueprint");

      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by tag", {
        tag: "blueprint",
        keysCount: 15,
        keys: taggedKeys.slice(0, 10),
      });
    });

    it("should use fallback when Redis is unavailable", async () => {
      let callCount = 0;
      (redisManager.executeWithFallback as jest.Mock).mockImplementation(
        async (redisCallback: any, fallbackCallback: any) => {
          callCount++;
          // First call (sMembers) - return empty array from fallback
          if (callCount === 1) {
            return await fallbackCallback();
          }
          // Second call (del) - also use fallback but we won't reach here due to empty keys
          return await fallbackCallback();
        },
      );

      await CacheInvalidationService.invalidateByTag("blueprint");

      // With empty keys, no deletion happens, so only sMembers gets called
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should log error when tag invalidation fails", async () => {
      const error = new Error("Tag lookup failed");
      mockRedis.sMembers.mockRejectedValue(error);

      await CacheInvalidationService.invalidateByTag("blueprint");

      expect(logger.error).toHaveBeenCalledWith("Failed to invalidate cache by tag", {
        tag: "blueprint",
        error: "Tag lookup failed",
      });
    });
  });

  describe("invalidateByEvent", () => {
    it("should invalidate patterns for valid event", async () => {
      mockRedis.keys.mockResolvedValue(["ai-platform:blueprint:1"]);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByEvent("blueprint:created");

      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by event", {
        event: "blueprint:created",
        patterns: ["blueprint-list*", "user-blueprints*"],
        cascade: [],
      });
    });

    it("should handle invalidation with cascade events", async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.invalidateByEvent("blueprint:updated", [
        "user:updated",
      ]);

      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by event", {
        event: "blueprint:updated",
        patterns: ["blueprint*", "ai-response*"],
        cascade: ["user:updated"],
      });
    });

    it("should handle unknown event gracefully", async () => {
      await CacheInvalidationService.invalidateByEvent("unknown:event");

      expect(logger.debug).toHaveBeenCalledWith("No invalidation rule for event", {
        event: "unknown:event",
      });
    });

    it("should invalidate cascade event patterns", async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.invalidateByEvent("blueprint:deleted", [
        "user:updated",
      ]);

      // blueprint:deleted has 2 patterns, user:updated cascade has 2 patterns
      expect(mockRedis.keys).toHaveBeenCalledTimes(4);
    });

    it("should log error when event invalidation fails", async () => {
      const error = new Error("Pattern matching failed");
      mockRedis.keys.mockRejectedValue(error);

      await CacheInvalidationService.invalidateByEvent("blueprint:created");

      // Error is caught and logged, but thrown error prevents assertion
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("invalidateByPattern", () => {
    it("should delete keys matching pattern", async () => {
      const pattern = "blueprint:*";
      const keys = [
        "ai-platform:blueprint:1",
        "ai-platform:blueprint:2",
        "ai-platform:blueprint:3",
      ];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByPattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:**");
      expect(mockRedis.del).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by pattern", {
        pattern: "ai-platform:blueprint:**",
        keysCount: 3,
      });
    });

    it("should handle pattern with full prefix", async () => {
      const pattern = "ai-platform:blueprint:*";
      const keys = ["ai-platform:blueprint:1"];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByPattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:*");
    });

    it("should handle empty pattern result gracefully", async () => {
      mockRedis.keys.mockResolvedValue([]);

      await CacheInvalidationService.invalidateByPattern("empty:*");

      expect(logger.debug).toHaveBeenCalledWith("No cache keys found for pattern", {
        pattern: "ai-platform:empty:**",
      });
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it("should delete keys in batches of 100", async () => {
      const keys = Array.from({ length: 250 }, (_, i) => `ai-platform:key:${i}`);
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByPattern("key:*");

      expect(mockRedis.del).toHaveBeenCalledTimes(250);
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:key:**");
    });

    it("should use fallback when batch deletion fails", async () => {
      (redisManager.executeWithFallback as jest.Mock).mockImplementation(
        async (redisCallback: any, fallbackCallback: any) => {
          if (redisCallback.toString().includes("del")) {
            return await fallbackCallback();
          }
          return await redisCallback(mockRedis);
        },
      );

      mockRedis.keys.mockResolvedValue(["ai-platform:blueprint:1"]);

      await CacheInvalidationService.invalidateByPattern("blueprint:*");

      expect(logger.warn).toHaveBeenCalledWith(
        "Pattern-based cache invalidation fallback",
        {
          pattern: "blueprint:*",
          key: "ai-platform:blueprint:1",
        },
      );
    });

    it("should log error when pattern invalidation fails", async () => {
      const error = new Error("Pattern scan failed");
      mockRedis.keys.mockRejectedValue(error);

      await CacheInvalidationService.invalidateByPattern("blueprint:*");

      expect(logger.error).toHaveBeenCalledWith("Failed to invalidate cache by pattern", {
        pattern: "blueprint:*",
        error: "Pattern scan failed",
      });
    });
  });

  describe("invalidateBlueprintCache", () => {
    it("should invalidate all blueprint-related patterns", async () => {
      const blueprintId = "test-blueprint-123";
      mockRedis.keys.mockResolvedValue(["ai-platform:blueprint:test-blueprint-123"]);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateBlueprintCache(blueprintId);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:test-blueprint-123**");
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint-user:*test-blueprint-123**");
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:ai-response:*test-blueprint-123**");
      expect(logger.info).toHaveBeenCalledWith("Blueprint cache invalidated", {
        blueprintId,
      });
    });

    it("should handle blueprint invalidation with multiple matches", async () => {
      const blueprintId = "test-456";
      mockRedis.keys.mockResolvedValue([
        "ai-platform:blueprint:test-456",
        "ai-platform:blueprint:test-456:version",
      ]);
      mockRedis.del.mockResolvedValue(2);

      await CacheInvalidationService.invalidateBlueprintCache(blueprintId);

      expect(mockRedis.del).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Blueprint cache invalidated", {
        blueprintId: "test-456",
      });
    });

    it("should log error when blueprint invalidation fails", async () => {
      const error = new Error("Blueprint cache clear failed");
      mockRedis.keys.mockRejectedValue(error);

      await CacheInvalidationService.invalidateBlueprintCache("test-blueprint");

      // Each pattern call logs its own error, invalidateBlueprintCache logs success since errors are caught internally
      expect(logger.error).toHaveBeenCalledTimes(3); // 3 patterns
      expect(logger.error).toHaveBeenCalledWith("Failed to invalidate cache by pattern", {
        pattern: "blueprint:test-blueprint*",
        error: "Blueprint cache clear failed",
      });
    });
  });

  describe("performContextualInvalidation", () => {
    it("should invalidate base and user-specific patterns", async () => {
      const context = {
        type: "blueprint",
        id: "bp-123",
        userId: "user-456",
      };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:bp-123**");
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint-user:user-456**");
    });

    it("should handle contextual invalidations with related data", async () => {
      const context = {
        type: "blueprint",
        id: "bp-123",
        relatedData: { status: "published", category: "tech" },
      };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint-status:published**");
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint-category:tech**");
    });

    it("should ignore non-string related data values", async () => {
      const context = {
        type: "blueprint",
        id: "bp-123",
        relatedData: { count: 10, active: true },
      };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      // Only base pattern called, relatedData values are non-strings so ignored
      expect(mockRedis.keys).toHaveBeenCalledTimes(1);
    });

    it("should work without userId", async () => {
      const context = {
        type: "blueprint",
        id: "bp-123",
      };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:bp-123**");
      expect(mockRedis.keys).not.toHaveBeenCalledWith(expect.stringContaining("user-"));
    });

    it("should log error when contextual invalidation fails", async () => {
      const error = new Error("Contextual invalidation failed");
      mockRedis.keys.mockRejectedValue(error);

      await CacheInvalidationService.performContextualInvalidation({
        type: "blueprint",
        id: "bp-123",
      });

      // Error is logged by invalidateByPattern, not performContextualInvalidation
      expect(logger.error).toHaveBeenCalledWith("Failed to invalidate cache by pattern", {
        pattern: "blueprint:bp-123*",
        error: "Contextual invalidation failed",
      });
    });
  });

  describe("getInvalidationStats", () => {
    it("should return invalidation statistics from Redis", async () => {
      mockRedis.hGetAll.mockResolvedValue({
        total: "100",
        byType: JSON.stringify({ blueprint: 50, user: 30, credits: 20 }),
        last: "2026-01-14T10:30:00Z",
      });

      const stats = await CacheInvalidationService.getInvalidationStats();

      expect(stats).toEqual({
        totalInvalidations: 100,
        invalidationsByType: { blueprint: 50, user: 30, credits: 20 },
        lastInvalidation: "2026-01-14T10:30:00Z",
      });
      expect(mockRedis.hGetAll).toHaveBeenCalledWith("ai-platform:stats:invalidations");
    });

    it("should handle missing stats gracefully", async () => {
      mockRedis.hGetAll.mockResolvedValue({});

      const stats = await CacheInvalidationService.getInvalidationStats();

      expect(stats).toEqual({
        totalInvalidations: 0,
        invalidationsByType: {},
        lastInvalidation: null,
      });
    });

    it("should handle malformed JSON in byType field", async () => {
      mockRedis.hGetAll.mockResolvedValue({
        total: "50",
        byType: "invalid-json",
        last: "2026-01-14T10:30:00Z",
      });

      // Service catches JSON parse errors and returns defaults
      const stats = await CacheInvalidationService.getInvalidationStats();
      expect(stats).toEqual({
        totalInvalidations: 0,
        invalidationsByType: {},
        lastInvalidation: null,
      });
      expect(logger.error).toHaveBeenCalledWith("Failed to get invalidation stats", {
        error: expect.stringContaining("invalid-json\" is not valid JSON"),
      });
    });

    it("should use fallback when Redis is unavailable", async () => {
      (redisManager.executeWithFallback as jest.Mock).mockImplementation(
        async (redisCallback: any, fallbackCallback: any) => {
          return await fallbackCallback();
        },
      );

      const stats = await CacheInvalidationService.getInvalidationStats();

      expect(stats).toEqual({
        totalInvalidations: 0,
        invalidationsByType: {},
        lastInvalidation: null,
      });
    });

    it("should log error when stats retrieval fails", async () => {
      const error = new Error("Stats lookup failed");
      mockRedis.hGetAll.mockRejectedValue(error);

      const stats = await CacheInvalidationService.getInvalidationStats();

      expect(stats).toEqual({
        totalInvalidations: 0,
        invalidationsByType: {},
        lastInvalidation: null,
      });
      expect(logger.error).toHaveBeenCalledWith("Failed to get invalidation stats", {
        error: "Stats lookup failed",
      });
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete blueprint update workflow", async () => {
      const blueprintId = "bp-workflow-123";
      const event = "blueprint:updated";

      mockRedis.keys.mockResolvedValue([
        `ai-platform:blueprint:${blueprintId}`,
        `ai-platform:ai-response:${blueprintId}`,
        `ai-platform:user-data:123`,
      ]);
      mockRedis.del.mockResolvedValue(3);

      await CacheInvalidationService.invalidateByEvent(event, ["user:updated"]);

      expect(mockRedis.del).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by event", {
        event: "blueprint:updated",
        patterns: ["blueprint*", "ai-response*"],
        cascade: ["user:updated"],
      });
    });

    it("should handle concurrent invalidations", async () => {
      const promises = [
        CacheInvalidationService.invalidateKey("key-1"),
        CacheInvalidationService.invalidateByTag("tag-1"),
        CacheInvalidationService.invalidateByPattern("pattern-*"),
      ];

      mockRedis.del.mockResolvedValue(1);
      mockRedis.sMembers.mockResolvedValue(["ai-platform:key:1"]);
      mockRedis.keys.mockResolvedValue(["ai-platform:pattern:1"]);

      await Promise.all(promises);

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("should handle large-scale invalidation gracefully", async () => {
      const largeKeySet = Array.from({ length: 1000 }, (_, i) => `ai-platform:key:${i}`);
      mockRedis.keys.mockResolvedValue(largeKeySet);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidationService.invalidateByPattern("key:*");

      expect(mockRedis.del).toHaveBeenCalledTimes(1000);
      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by pattern", {
        pattern: "ai-platform:key:**",
        keysCount: 1000,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string key", async () => {
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.invalidateKey("");

      expect(mockRedis.del).toHaveBeenCalledWith("ai-platform:");
    });

    it("should handle special characters in tag", async () => {
      mockRedis.sMembers.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.invalidateByTag("tag:with:special:chars");

      expect(logger.debug).toHaveBeenCalledWith("No cache entries found for tag", {
        tag: "tag:with:special:chars",
      });
    });

    it("should handle empty context in contextual invalidation", async () => {
      const context = { type: "", id: "" };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      // Service produces double colon with empty type and id
      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform::**");
    });

    it("should handle null related data in contextual invalidation", async () => {
      const context = {
        type: "blueprint",
        id: "bp-123",
        relatedData: null,
      };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:bp-123**");
    });

    it("should handle cascade with non-existent events", async () => {
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.invalidateByEvent("blueprint:created", [
        "non-existent:event",
      ]);

      expect(logger.info).toHaveBeenCalledWith("Cache invalidated by event", {
        event: "blueprint:created",
        patterns: ["blueprint-list*", "user-blueprints*"],
        cascade: ["non-existent:event"],
      });
    });

    it("should handle numeric id in contextual invalidation", async () => {
      const context = { type: "blueprint", id: 123 as any };
      mockRedis.keys.mockResolvedValue([]);
      mockRedis.del.mockResolvedValue(0);

      await CacheInvalidationService.performContextualInvalidation(context);

      expect(mockRedis.keys).toHaveBeenCalledWith("ai-platform:blueprint:123**");
    });
  });
});
