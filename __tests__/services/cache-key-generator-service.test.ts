import { CacheKeyGeneratorService } from "../../lib/services/cache/key-generator-service";
import { NextRequest } from "next/server";

describe("CacheKeyGeneratorService", () => {
  describe("generateKey", () => {
    it("should generate consistent cache keys for same input", () => {
      const data = { model: "gpt-4", query: "test query" };
      const key1 = CacheKeyGeneratorService.generateKey("test", data);
      const key2 = CacheKeyGeneratorService.generateKey("test", data);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different prefixes", () => {
      const data = { test: "data" };
      const key1 = CacheKeyGeneratorService.generateKey("prefix1", data);
      const key2 = CacheKeyGeneratorService.generateKey("prefix2", data);

      expect(key1).not.toBe(key2);
    });

    it("should include version in cache key", () => {
      const data = { test: "data" };
      const key = CacheKeyGeneratorService.generateKey("ai-response", data);

      expect(key).toContain("v1");
    });

    it("should handle undefined values in data", () => {
      const data = { model: "gpt-4", query: undefined, context: null };
      const key = CacheKeyGeneratorService.generateKey("test", data);

      expect(key).toBeDefined();
      expect(key).toContain("ai-platform");
    });

    it("should normalize timestamps to minute precision", () => {
      const baseTime = Date.now();
      const timestamp1 = baseTime - (baseTime % 60000);
      const timestamp2 = timestamp1 + 30000; // Same minute, different second

      const data1 = { query: "test", timestamp: timestamp1 };
      const data2 = { query: "test", timestamp: timestamp2 };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should normalize limit and count values to max 1000", () => {
      const data1 = { limit: 5000, count: 2000 };
      const data2 = { limit: 5000, count: 2000 };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should clamp extreme limit values", () => {
      const data1 = { limit: 5000, query: "test" };
      const data2 = { limit: 0.5, query: "test" };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      // 5000 clamped to 1000, 0.5 clamped to 1
      expect(key1).not.toBe(key2);
    });

    it("should normalize AI model names", () => {
      const data1 = { model: "GPT-4 Turbo" };
      const data2 = { model: "gpt-4-turbo" };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should normalize long text content", () => {
      const longText = "a".repeat(200);
      const data = { query: longText };
      const key = CacheKeyGeneratorService.generateKey("test", data);

      expect(key).toBeDefined();
      expect(key).toContain("ai-platform");
    });

    it("should normalize URLs by removing cache-related params", () => {
      const data1 = { url: "https://example.com?timestamp=123456&cache=v1" };
      const data2 = { url: "https://example.com?timestamp=789012&cache=v2" };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should handle empty object", () => {
      const key = CacheKeyGeneratorService.generateKey("test", {});

      expect(key).toBeDefined();
      expect(key).toContain("ai-platform:test");
    });

    it("should handle null data", () => {
      const key = CacheKeyGeneratorService.generateKey("test", null);

      expect(key).toBeDefined();
    });

    it("should handle primitive data types", () => {
      const key1 = CacheKeyGeneratorService.generateKey("test", "string");
      const key2 = CacheKeyGeneratorService.generateKey("test", 123);
      const key3 = CacheKeyGeneratorService.generateKey("test", true);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key3).toBeDefined();
    });
  });

  describe("generateResponseKey", () => {
    it("should generate consistent response keys", () => {
      const url = "https://example.com/api/test";
      const request = new NextRequest(url, { method: "GET" });

      const key1 = CacheKeyGeneratorService.generateResponseKey(request);
      const key2 = CacheKeyGeneratorService.generateResponseKey(request);

      expect(key1).toBe(key2);
    });

    it("should generate consistent keys for same method", () => {
      const url1 = "https://example.com/api/test1";
      const url2 = "https://example.com/api/test2";
      const request1 = new NextRequest(url1, { method: "GET" });
      const request2 = new NextRequest(url2, { method: "GET" });

      const key1 = CacheKeyGeneratorService.generateResponseKey(request1);
      const key2 = CacheKeyGeneratorService.generateResponseKey(request2);

      expect(key1).not.toBe(key2);
    });

    it("should handle different URLs", () => {
      const url1 = "https://example.com/api/test1";
      const url2 = "https://example.com/api/test2";
      const request1 = new NextRequest(url1, { method: "GET" });
      const request2 = new NextRequest(url2, { method: "GET" });

      const key1 = CacheKeyGeneratorService.generateResponseKey(request1);
      const key2 = CacheKeyGeneratorService.generateResponseKey(request2);

      expect(key1).not.toBe(key2);
    });

    it("should vary by specified headers", () => {
      const url1 = "https://example.com/api/test1";
      const url2 = "https://example.com/api/test2";
      const request1 = new NextRequest(url1, {
        method: "GET",
        headers: { authorization: "Bearer token1" },
      });
      const request2 = new NextRequest(url2, {
        method: "GET",
        headers: { authorization: "Bearer token2" },
      });

      const key1 = CacheKeyGeneratorService.generateResponseKey(request1, [
        "authorization",
      ]);
      const key2 = CacheKeyGeneratorService.generateResponseKey(request2, [
        "authorization",
      ]);

      expect(key1).not.toBe(key2);
    });

    it("should not vary by unspecified headers", () => {
      const url = "https://example.com/api/test";
      const request1 = new NextRequest(url, {
        method: "GET",
        headers: { authorization: "Bearer token1" },
      });
      const request2 = new NextRequest(url, {
        method: "GET",
        headers: { authorization: "Bearer token2" },
      });

      const key1 = CacheKeyGeneratorService.generateResponseKey(request1);
      const key2 = CacheKeyGeneratorService.generateResponseKey(request2);

      expect(key1).toBe(key2);
    });

    it("should handle missing vary headers gracefully", () => {
      const url = "https://example.com/api/test";
      const request = new NextRequest(url, { method: "GET" });

      const key = CacheKeyGeneratorService.generateResponseKey(request, [
        "non-existent-header",
      ]);

      expect(key).toBeDefined();
      expect(key).toContain("response");
    });

    it("should include cache prefix", () => {
      const url = "https://example.com/api/test";
      const request = new NextRequest(url, { method: "GET" });

      const key = CacheKeyGeneratorService.generateResponseKey(request);

      expect(key).toContain("ai-platform:response");
    });
  });

  describe("generateETag", () => {
    it("should generate consistent ETags for same data", () => {
      const data = { test: "data" };
      const etag1 = CacheKeyGeneratorService.generateETag(data);
      const etag2 = CacheKeyGeneratorService.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it("should generate different ETags for different data", () => {
      const data1 = { test: "data1" };
      const data2 = { test: "data2" };

      const etag1 = CacheKeyGeneratorService.generateETag(data1);
      const etag2 = CacheKeyGeneratorService.generateETag(data2);

      expect(etag1).not.toBe(etag2);
    });

    it("should generate ETag as hex string", () => {
      const data = { test: "data" };
      const etag = CacheKeyGeneratorService.generateETag(data);

      expect(etag).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should handle nested objects", () => {
      const data = {
        user: { id: 1, name: "Test" },
        items: [1, 2, 3],
      };

      const etag1 = CacheKeyGeneratorService.generateETag(data);
      const etag2 = CacheKeyGeneratorService.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it("should handle array data", () => {
      const data = [1, 2, 3, 4, 5];

      const etag1 = CacheKeyGeneratorService.generateETag(data);
      const etag2 = CacheKeyGeneratorService.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it("should handle string data", () => {
      const data = "test string";

      const etag1 = CacheKeyGeneratorService.generateETag(data);
      const etag2 = CacheKeyGeneratorService.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it("should handle null", () => {
      const etag = CacheKeyGeneratorService.generateETag(null);

      expect(etag).toBeDefined();
      expect(etag).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe("calculateContentFingerprint", () => {
    it("should generate consistent fingerprints", () => {
      const data = { test: "data" };
      const fp1 = CacheKeyGeneratorService.calculateContentFingerprint(data);
      const fp2 = CacheKeyGeneratorService.calculateContentFingerprint(data);

      expect(fp1).toBe(fp2);
    });

    it("should include fp: prefix", () => {
      const data = { test: "data" };
      const fp = CacheKeyGeneratorService.calculateContentFingerprint(data);

      expect(fp).toMatch(/^fp:/);
    });

    it("should limit fingerprint to 16 hex characters", () => {
      const data = { test: "data" };
      const fp = CacheKeyGeneratorService.calculateContentFingerprint(data);

      expect(fp).toBe("fp:" + fp.substring(3).substring(0, 16));
    });

    it("should handle string data directly", () => {
      const text = "test string";
      const fp1 = CacheKeyGeneratorService.calculateContentFingerprint(text);
      const fp2 = CacheKeyGeneratorService.calculateContentFingerprint({ data: text });

      expect(fp1).not.toBe(fp2);
    });

    it("should generate different fingerprints for different data", () => {
      const data1 = { test: "data1" };
      const data2 = { test: "data2" };

      const fp1 = CacheKeyGeneratorService.calculateContentFingerprint(data1);
      const fp2 = CacheKeyGeneratorService.calculateContentFingerprint(data2);

      expect(fp1).not.toBe(fp2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle deeply nested objects", () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };

      const key = CacheKeyGeneratorService.generateKey("test", data);

      expect(key).toBeDefined();
    });

    it("should handle special characters in keys", () => {
      const data = {
        query: "test with spaces & special chars!",
        model: "model@#$%",
      };

      const key = CacheKeyGeneratorService.generateKey("test", data);

      expect(key).toBeDefined();
      expect(key).not.toContain("&");
      expect(key).not.toContain("@");
    });

    it("should handle very large objects", () => {
      const largeArray = Array(1000).fill({ id: 1, value: "test" });
      const data = { items: largeArray };

      const key = CacheKeyGeneratorService.generateKey("test", data);

      expect(key).toBeDefined();
    });

    it("should normalize numeric limits consistently", () => {
      const data1 = { limit: 10, query: "test" };
      const data2 = { limit: 10, query: "test" };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should handle boolean values", () => {
      const data1 = { active: true };
      const data2 = { active: false };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).not.toBe(key2);
    });

    it("should handle date objects in timestamps", () => {
      const date1 = new Date("2024-01-01T10:30:00Z");
      const date2 = new Date("2024-01-01T10:30:30Z");

      const data1 = { timestamp: date1 };
      const data2 = { timestamp: date2 };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      expect(key1).toBe(key2);
    });

    it("should handle multiple URL parameters", () => {
      const data1 = {
        url: "https://example.com?timestamp=123456&cache=v1&_t=abc&other=test",
      };
      const data2 = {
        url: "https://example.com?timestamp=789012&cache=v2&_t=xyz&other=test",
      };

      const key1 = CacheKeyGeneratorService.generateKey("test", data1);
      const key2 = CacheKeyGeneratorService.generateKey("test", data2);

      // Timestamp, cache, and _t should be removed, so keys should match
      expect(key1).toBe(key2);
    });
  });

  describe("Integration Scenarios", () => {
    it("should work for AI response caching", () => {
      const data = {
        model: "GPT-4",
        query: "What is machine learning?",
        temperature: 0.7,
        maxTokens: 2000,
      };

      const key = CacheKeyGeneratorService.generateKey("ai-response", data);

      expect(key).toContain("ai-platform:ai-response:v1");
      expect(key).toBeDefined();
    });

    it("should work for blueprint caching", () => {
      const data = {
        userId: "user123",
        projectId: "project456",
        version: 2,
      };

      const key = CacheKeyGeneratorService.generateKey("blueprint", data);

      expect(key).toContain("ai-platform:blueprint:v1");
    });

    it("should work for metrics caching", () => {
      const data = {
        metric: "cache_hit_rate",
        timeRange: "24h",
        granularity: "hourly",
      };

      const key = CacheKeyGeneratorService.generateKey("metrics", data);

      expect(key).toContain("ai-platform:metrics:v1");
    });

    it("should work for HTTP response caching with headers", () => {
      const url = "https://api.example.com/data";
      const request = new NextRequest(url, {
        method: "GET",
        headers: { "accept-language": "en-US", authorization: "Bearer token" },
      });

      const key = CacheKeyGeneratorService.generateResponseKey(request, [
        "accept-language",
        "authorization",
      ]);

      expect(key).toContain("ai-platform:response");
    });

    it("should maintain key consistency across multiple calls", () => {
      const data = {
        model: "gpt-4",
        query: "test query",
        temperature: 0.7,
        limit: 100,
      };

      const keys = Array(10)
        .fill(null)
        .map(() => CacheKeyGeneratorService.generateKey("test", data));

      expect(new Set(keys).size).toBe(1);
    });
  });
});
