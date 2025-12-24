import { GET } from "@/app/api/metrics/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Metrics API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Metrics endpoint doesn't require auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/metrics", () => {
    it("should return comprehensive metrics by default", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("apiMetrics");
      expect(data.data).toHaveProperty("systemMetrics");
      expect(data.data).toHaveProperty("performanceMetrics");
      expect(data.data).toHaveProperty("cacheMetrics");
    });

    it("should return specific metric data when metric name provided", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("metricName", "api-response-time");
      expect(data.data).toHaveProperty("values");
      expect(data.data).toHaveProperty("timestamps");
      expect(Array.isArray(data.data.values)).toBe(true);
    });

    it("should return metric summary when summary flag is set", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time&summary=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("metricName", "api-response-time");
      expect(data.data).toHaveProperty("summary");
      expect(data.data.summary).toHaveProperty("avg");
      expect(data.data.summary).toHaveProperty("min");
      expect(data.data.summary).toHaveProperty("max");
      expect(data.data.summary).toHaveProperty("p95");
      expect(data.data.summary).toHaveProperty("p99");
    });

    it("should respect limit parameter for metric data", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time&limit=50",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      if (data.data.values) {
        expect(data.data.values.length).toBeLessThanOrEqual(50);
      }
    });

    it("should handle invalid metric names gracefully", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=invalid-metric-name",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should validate limit parameter", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time&limit=invalid",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should enforce maximum limit", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time&limit=10000",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("exceeds maximum");
    });

    it("should cache comprehensive metrics responses", async () => {
      const mockAPIMetricsService = testHelper.getMock("apiMetricsService");
      let callCount = 0;
      mockAPIMetricsService.getComprehensiveMetrics.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          apiMetrics: { responseTime: [100, 200, 150] },
          systemMetrics: { uptime: 3600 },
          performanceMetrics: { memory: 0.7 },
          cacheMetrics: { hitRate: 0.85 },
        });
      });

      // First request
      const request1 = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics",
      });
      await GET(request1);

      // Second request should hit cache
      const request2 = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics",
      });
      await GET(request2);

      expect(callCount).toBe(1); // Should only call once due to caching
    });

    it("should cache metric-specific responses", async () => {
      const mockAPIMetricsService = testHelper.getMock("apiMetricsService");
      let callCount = 0;
      mockAPIMetricsService.getMetricData.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          metricName: "api-response-time",
          values: [100, 200, 150],
          timestamps: [
            "2024-01-01T00:00:00Z",
            "2024-01-01T00:01:00Z",
            "2024-01-01T00:02:00Z",
          ],
        });
      });

      // First request
      const request1 = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time",
      });
      await GET(request1);

      // Second request should hit cache
      const request2 = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time",
      });
      await GET(request2);

      expect(callCount).toBe(1); // Should only call once due to caching
    });

    it("should include appropriate caching headers", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics",
      });

      const response = await GET(request);

      expect(response.headers.get("cache-control")).toContain("max-age=10");
      expect(response.headers.get("etag")).toBeDefined();
    });

    it("should handle different metric types", async () => {
      const testMetrics = [
        "api-response-time",
        "database-query-time",
        "cache-hit-rate",
        "error-rate",
        "throughput",
      ];

      for (const metric of testMetrics) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/metrics?metric=${metric}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.metricName).toBe(metric);
      }
    });

    it("should handle service errors gracefully", async () => {
      const mockAPIMetricsService = testHelper.getMock("apiMetricsService");
      mockAPIMetricsService.getComprehensiveMetrics.mockRejectedValue(
        new Error("Metrics service unavailable"),
      );

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("metrics service unavailable");
    });
  });

  describe("Parameter Combinations", () => {
    it("should handle metric with summary and limit", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time&summary=true&limit=25",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("metricName", "api-response-time");
      expect(data.data).toHaveProperty("summary");
    });

    it("should reject summary without metric", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?summary=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("metric name");
    });

    it("should handle empty query parameters", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("apiMetrics");
    });
  });

  describe("Data Format and Structure", () => {
    it("should return consistent timestamps format", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.timestamps && data.data.timestamps.length > 0) {
        expect(data.data.timestamps[0]).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      }
    });

    it("should return numeric values for metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/metrics?metric=api-response-time",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.values && data.data.values.length > 0) {
        data.data.values.forEach((value: any) => {
          expect(typeof value).toBe("number");
          expect(value).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });
});
