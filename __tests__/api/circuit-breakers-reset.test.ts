import { POST } from "@/app/api/circuit-breakers/reset/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Circuit Breakers Reset API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true,
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/circuit-breakers/reset", () => {
    it("should reset all circuit breakers successfully with admin privileges", async () => {
      const mockUser = testHelper.getCurrentUser();
      testHelper.getCurrentUser().isAdmin = true;

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("action", "reset");
      expect(data.data).toHaveProperty("message");
      expect(data.data).toHaveProperty("affectedServices");
      expect(data.data).toHaveProperty("timestamp");
      expect(data.data.affectedServices).toContain("ai-iflow");
    });

    it("should reject unauthenticated requests with 401", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("should reject non-admin users with 403", async () => {
      testHelper.getCurrentUser().isAdmin = false;

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Admin access required");
    });

    it("should log reset operations for admin users", async () => {
      testHelper.getCurrentUser().isAdmin = true;

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const mockLogger = testHelper.getMock("logger");
      if (mockLogger) {
        expect(mockLogger.userAction).toHaveBeenCalledWith(
          "Circuit breakers reset",
          testHelper.getCurrentUser().clerkId,
          expect.any(Object),
        );
      }
    });

    it("should log security events for unauthorized access attempts", async () => {
      testHelper.getCurrentUser().isAdmin = false;

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);

      expect(response.status).toBe(403);

      const mockLogger = testHelper.getMock("logger");
      if (mockLogger) {
        expect(mockLogger.security).toHaveBeenCalledWith(
          "Unauthorized circuit breaker reset attempt",
          expect.any(Object),
        );
      }
    });

    it("should include rate limiting for reset operations", async () => {
      testHelper.getCurrentUser().isAdmin = true;

      const requests = Array.from({ length: 15 }, () =>
        testHelper.createRequest({
          method: "POST",
          path: "/api/circuit-breakers/reset",
        }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      const successCount = responses.filter((res) => res.status === 200).length;
      const rateLimitedCount = responses.filter(
        (res) => res.status === 429,
      ).length;

      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it("should handle service errors gracefully", async () => {
      testHelper.getCurrentUser().isAdmin = true;

      const mockAiService = testHelper.getMock("aiService");
      if (mockAiService) {
        mockAiService.resetCircuitBreakers.mockRejectedValue(
          new Error("AI service unavailable"),
        );
      }

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/circuit-breakers/reset",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
