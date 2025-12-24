import { GET } from "@/app/api/circuit-breakers/metrics/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Circuit Breakers Metrics API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Circuit breaker metrics don't require auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/circuit-breakers/metrics", () => {
    it("should return comprehensive circuit breaker metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("circuitBreakers");
      expect(data.data).toHaveProperty("overallHealth");
      expect(Array.isArray(data.data.circuitBreakers)).toBe(true);
    });

    it("should include all required circuit breaker fields", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.data.circuitBreakers.length > 0) {
        const circuitBreaker = data.data.circuitBreakers[0];
        expect(circuitBreaker).toHaveProperty("name");
        expect(circuitBreaker).toHaveProperty("state");
        expect(circuitBreaker).toHaveProperty("failureCount");
        expect(circuitBreaker).toHaveProperty("successCount");
        expect(circuitBreaker).toHaveProperty("totalCalls");
        expect(circuitBreaker).toHaveProperty("successRate");
        expect(circuitBreaker).toHaveProperty("isAvailable");
        expect(circuitBreaker).toHaveProperty("lastFailureTime");
        expect(circuitBreaker).toHaveProperty("lastSuccessTime");
        expect(circuitBreaker).toHaveProperty("createdTime");
      }
    });

    it("should include standard circuit breakers", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const circuitBreakerNames = data.data.circuitBreakers.map(
        (cb: any) => cb.name,
      );

      // Should include core circuit breakers
      expect(circuitBreakerNames).toContain("ai-iflow");
      expect(circuitBreakerNames).toContain("research-tavily");
      expect(circuitBreakerNames).toContain("github-api");
      expect(circuitBreakerNames).toContain("redis-connection");
    });

    it("should calculate overall health correctly", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data.overallHealth).toHaveProperty("totalCircuitBreakers");
      expect(data.data.overallHealth).toHaveProperty("healthyCircuitBreakers");
      expect(data.data.overallHealth).toHaveProperty("degradedCircuitBreakers");
      expect(data.data.overallHealth).toHaveProperty(
        "unhealthyCircuitBreakers",
      );
      expect(data.data.overallHealth).toHaveProperty("healthScore");
      expect(data.data.overallHealth).toHaveProperty("overallStatus");
    });

    it("should handle different circuit breaker states", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const states = data.data.circuitBreakers.map((cb: any) => cb.state);

      // Valid states should be: CLOSED, OPEN, HALF_OPEN
      states.forEach((state: string) => {
        expect(["CLOSED", "OPEN", "HALF_OPEN"]).toContain(state);
      });
    });

    it("should provide accurate success rate calculations", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      data.data.circuitBreakers.forEach((cb: any) => {
        if (cb.totalCalls > 0) {
          const expectedSuccessRate = (cb.successCount / cb.totalCalls) * 100;
          expect(cb.successRate).toBeCloseTo(expectedSuccessRate, 1);
        } else {
          expect(cb.successRate).toBe(0);
        }
      });
    });

    it("should include timestamp fields in ISO format", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      data.data.circuitBreakers.forEach((cb: any) => {
        if (cb.lastFailureTime) {
          expect(cb.lastFailureTime).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
        }
        if (cb.lastSuccessTime) {
          expect(cb.lastSuccessTime).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
        }
        if (cb.createdTime) {
          expect(cb.createdTime).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          );
        }
      });
    });

    it("should handle specific circuit breaker query", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics?circuit=ai-iflow",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.circuitBreakers).toHaveLength(1);
      expect(data.data.circuitBreakers[0].name).toBe("ai-iflow");
    });

    it("should handle non-existent circuit breaker query", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics?circuit=non-existent",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should include performance metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("performanceMetrics");
      expect(data.data.performanceMetrics).toHaveProperty(
        "averageResponseTime",
      );
      expect(data.data.performanceMetrics).toHaveProperty(
        "failureRecoveryTime",
      );
      expect(data.data.performanceMetrics).toHaveProperty(
        "circuitOperationsRate",
      );
    });

    it("should validate circuit breaker name parameter", async () => {
      const invalidNames = [
        "",
        "   ",
        "name with spaces",
        "name-with-special-chars!",
      ];

      for (const invalidName of invalidNames) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/circuit-breakers/metrics?circuit=${encodeURIComponent(invalidName)}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });

    it("should support filtering by state", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics?state=CLOSED",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      data.data.circuitBreakers.forEach((cb: any) => {
        expect(cb.state).toBe("CLOSED");
      });
    });

    it("should support filtering by availability", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics?available=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      data.data.circuitBreakers.forEach((cb: any) => {
        expect(cb.isAvailable).toBe(true);
      });
    });

    it("should handle combined filters", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics?state=CLOSED&available=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      data.data.circuitBreakers.forEach((cb: any) => {
        expect(cb.state).toBe("CLOSED");
        expect(cb.isAvailable).toBe(true);
      });
    });

    it("should include caching headers", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);

      expect(response.headers.get("cache-control")).toBeDefined();
      expect(response.headers.get("etag")).toBeDefined();
    });

    it("should handle service errors gracefully", async () => {
      // Mock a scenario where circuit breaker service fails
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.getAllCircuitBreakers.mockRejectedValue(
          new Error("Circuit breaker service unavailable"),
        );
      }

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("circuit breaker service");
    });

    it("should provide health score calculation", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const healthScore = data.data.overallHealth.healthScore;
      expect(typeof healthScore).toBe("number");
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    it("should categorize circuit breakers by status correctly", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/circuit-breakers/metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const total = data.data.overallHealth.totalCircuitBreakers;
      const healthy = data.data.overallHealth.healthyCircuitBreakers;
      const degraded = data.data.overallHealth.degradedCircuitBreakers;
      const unhealthy = data.data.overallHealth.unhealthyCircuitBreakers;

      expect(total).toBe(healthy + degraded + unhealthy);
    });
  });
});
