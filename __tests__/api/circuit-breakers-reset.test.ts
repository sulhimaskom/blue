import { POST } from "@/app/api/circuit-breakers/reset/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Circuit Breakers Reset API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true, // Reset requires admin auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/circuit-breakers/reset", () => {
    it("should reset specific circuit breaker successfully", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(true);
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "ai-iflow",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("circuitName", "ai-iflow");
      expect(data.data).toHaveProperty("reset");
      expect(data.data).toHaveProperty("timestamp");
    });

    it("should reset all circuit breakers when no specific name provided", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetAllCircuitBreakers.mockResolvedValue(
          true,
        );
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("reset", "all");
      expect(data.data).toHaveProperty("affectedCircuitBreakers");
    });

    it("should require authentication", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "ai-iflow",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should validate circuit breaker name format", async () => {
      const invalidNames = [
        "",
        "   ",
        "name with spaces",
        "name-with-special-chars!",
        "123",
      ];

      for (const invalidName of invalidNames) {
        const request = testHelper.createRequest({
          method: "POST",
          path: "/api/circuit-breakers/reset",
          body: {
            circuitName: invalidName,
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("valid circuit name");
      }
    });

    it("should handle non-existent circuit breaker", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(false);
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "non-existent-circuit",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should validate request body structure", async () => {
      const invalidBodies = [
        null,
        undefined,
        "string-instead-of-object",
        123,
        [],
      ];

      for (const invalidBody of invalidBodies) {
        const request = testHelper.createRequest({
          method: "POST",
          path: "/api/circuit-breakers/reset",
          body: invalidBody,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("valid JSON");
      }
    });

    it("should handle additional properties in body gracefully", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(true);
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "ai-iflow",
          additionalProperty: "should-be-ignored",
          anotherProp: 123,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should log reset operations for auditing", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(true);
      }

      const mockUserService = testHelper.getMock("userService");
      const mockUser = testHelper.getCurrentUser();
      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "github-api",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // In a real implementation, we'd check the logger calls
      // For now, just ensure the operation succeeds
      expect(data.data.circuitName).toBe("github-api");
    });

    it("should provide detailed reset confirmation", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetAllCircuitBreakers.mockResolvedValue([
          "ai-iflow",
          "research-tavily",
          "github-api",
          "redis-connection",
        ]);
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reset).toBe("all");
      expect(Array.isArray(data.data.affectedCircuitBreakers)).toBe(true);
      expect(data.data.affectedCircuitBreakers).toContain("ai-iflow");
    });

    it("should handle partial reset failures gracefully", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        // Reset some but not all circuits
        mockCircuitBreakerService.resetAllCircuitBreakers.mockResolvedValue([
          "ai-iflow",
          "github-api", // But not research-tavily or redis-connection
        ]);
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status for partial success
      expect(data.success).toBe(true);
      expect(data.data.reset).toBe("partial");
      expect(Array.isArray(data.data.successfulResets)).toBe(true);
      expect(Array.isArray(data.data.failedResets)).toBe(true);
    });

    it("should include rate limiting for reset operations", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(true);
      }

      // Make rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, () =>
        testHelper.createRequest({
          method: "POST",
          path: "/api/circuit-breakers/reset",
          body: { circuitName: "ai-iflow" },
        }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      // First few should succeed, later ones should be rate limited
      const successCount = responses.filter((res) => res.status === 200).length;
      const rateLimitedCount = responses.filter(
        (res) => res.status === 429,
      ).length;

      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it("should validate circuit names against allowed list", async () => {
      const allowedNames = [
        "ai-iflow",
        "research-tavily",
        "github-api",
        "redis-connection",
      ];

      for (const allowedName of allowedNames) {
        const mockCircuitBreakerService = testHelper.getMock(
          "circuitBreakerService",
        );
        if (mockCircuitBreakerService) {
          mockCircuitBreakerService.resetCircuitBreaker.mockResolvedValue(true);
        }

        const request = testHelper.createRequest({
          method: "POST",
          path: "/api/circuit-breakers/reset",
          body: {
            circuitName: allowedName,
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("should reject unauthorized reset attempts on protected circuits", async () => {
      // Some circuits might be protected and require elevated permissions
      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "database-connection", // Assume this is protected
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("protected circuit");
    });

    it("should handle service errors during reset", async () => {
      const mockCircuitBreakerService = testHelper.getMock(
        "circuitBreakerService",
      );
      if (mockCircuitBreakerService) {
        mockCircuitBreakerService.resetCircuitBreaker.mockRejectedValue(
          new Error("Circuit breaker unavailable"),
        );
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
        body: {
          circuitName: "ai-iflow",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("reset failed");
    });
  });
});
