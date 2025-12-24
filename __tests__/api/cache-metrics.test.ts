import { GET } from "@/app/api/cache/metrics/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Cache Metrics API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Cache metrics don't require auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/cache/metrics", () => {
    it("should return comprehensive cache metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("globalMetrics");
      expect(data.data).toHaveProperty("cacheOperations");
      expect(data.data).toHaveProperty("cachePerformance");
      expect(data.data).toHaveProperty("memoryUsage");
    });

    it("should include global cache statistics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const globalMetrics = data.data.globalMetrics;
      expect(globalMetrics).toHaveProperty("totalOperations");
      expect(globalMetrics).toHaveProperty("hitRate");
      expect(globalMetrics).toHaveProperty("missRate");
      expect(globalMetrics).toHaveProperty("totalKeys");
      expect(globalMetrics).toHaveProperty("evictions");
      expect(globalMetrics).toHaveProperty("expireRate");
    });

    it("should provide operation breakdown by type", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const operations = data.data.cacheOperations;
      expect(operations).toHaveProperty("get");
      expect(operations).toHaveProperty("set");
      expect(operations).toHaveProperty("del");
      expect(operations).toHaveProperty("exists");

      if (operations.get) {
        expect(operations.get).toHaveProperty("count");
        expect(operations.get).toHaveProperty("hits");
        expect(operations.get).toHaveProperty("misses");
        expect(operations.get).toHaveProperty("hitRate");
      }
    });

    it("should include performance metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const performance = data.data.cachePerformance;
      expect(performance).toHaveProperty("averageGetTime");
      expect(performance).toHaveProperty("averageSetTime");
      expect(performance).toHaveProperty("p95GetTime");
      expect(performance).toHaveProperty("p99GetTime");
      expect(performance).toHaveProperty("slowQueries");
    });

    it("should provide memory usage information", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const memoryUsage = data.data.memoryUsage;
      expect(memoryUsage).toHaveProperty("usedMemory");
      expect(memoryUsage).toHaveProperty("maxMemory");
      expect(memoryUsage).toHaveProperty("memoryFragmentationRatio");
      expect(memoryUsage).toHaveProperty("peakMemory");
    });

    it("should filter by specific cache type", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics?type=ai-cache",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("cacheType", "ai-cache");
    });

    it("should handle time range filtering", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics?timeRange=1h",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("timeRange", "1h");
      expect(data.data).toHaveProperty("filteredMetrics");
    });

    it("should support multiple time ranges", async () => {
      const timeRanges = ["5m", "15m", "1h", "6h", "24h", "7d"];

      for (const timeRange of timeRanges) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/metrics?timeRange=${timeRange}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.timeRange).toBe(timeRange);
      }
    });

    it("should validate time range parameter", async () => {
      const invalidTimeRanges = ["invalid", "2x", "3days", "1w"];

      for (const invalidRange of invalidTimeRanges) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/metrics?timeRange=${invalidRange}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("time range");
      }
    });

    it("should support detailed operation breakdown", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics?detailed=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Detailed view should include additional fields
      if (data.data.cacheOperations?.get) {
        expect(data.data.cacheOperations.get).toHaveProperty("distribution");
        expect(data.data.cacheOperations.get).toHaveProperty("patterns");
      }
    });

    it("should provide cache hit trend data", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics?trends=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("trends");
      expect(data.data.trends).toHaveProperty("hitRateTrend");
      expect(data.data.trends).toHaveProperty("operationVolumeTrend");
      expect(Array.isArray(data.data.trends.hitRateTrend)).toBe(true);
    });

    it("should handle cache type validation", async () => {
      const validTypes = [
        "ai-cache",
        "response-cache",
        "query-cache",
        "session-cache",
      ];

      for (const cacheType of validTypes) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/metrics?type=${cacheType}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("should reject invalid cache types", async () => {
      const invalidTypes = ["invalid-cache", "cache123", "cache_type"];

      for (const invalidType of invalidTypes) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/metrics?type=${invalidType}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    it("should support combined filtering", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics?type=ai-cache&timeRange=1h&detailed=true&trends=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cacheType).toBe("ai-cache");
      expect(data.data.timeRange).toBe("1h");
      expect(data.data.detailed).toBe(true);
      expect(data.data.trends).toBeDefined();
    });

    it("should include alerting thresholds", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("alerts");
      if (data.data.alerts) {
        expect(data.data.alerts).toHaveProperty("lowHitRateThreshold");
        expect(data.data.alerts).toHaveProperty("highMemoryThreshold");
        expect(data.data.alerts).toHaveProperty("slowQueryThreshold");
      }
    });

    it("should handle service errors gracefully", async () => {
      // Mock cache service failure
      const mockCacheService = testHelper.getMock("cacheService");
      if (mockCacheService) {
        mockCacheService.getMetrics.mockRejectedValue(
          new Error("Cache service unavailable"),
        );
      }

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("cache service");
    });

    it("should include appropriate caching headers", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);

      expect(response.headers.get("cache-control")).toBeDefined();
      expect(response.headers.get("etag")).toBeDefined();
    });

    it("should provide accurate percentage calculations", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const globalMetrics = data.data.globalMetrics;
      if (globalMetrics.totalOperations > 0) {
        const expectedHitRate =
          ((globalMetrics.totalHits || 0) / globalMetrics.totalOperations) *
          100;
        expect(globalMetrics.hitRate).toBeCloseTo(expectedHitRate, 1);
      }
    });

    it("should handle Redis connection status", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("connectionStatus");
      if (data.data.connectionStatus) {
        expect(data.data.connectionStatus).toHaveProperty("connected");
        expect(data.data.connectionStatus).toHaveProperty("lastCheck");
        expect(data.data.connectionStatus).toHaveProperty("connectionPool");
      }
    });
  });
});
