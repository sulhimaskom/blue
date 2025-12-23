import { POST } from "@/app/api/webhooks/clerk/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Clerk Webhook API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Webhooks don't require authentication
    });

    // Setup successful webhook service responses
    const mockWebhookService = testHelper.getMock("webhookService");
    mockWebhookService.createWebhookResponse = jest.fn().mockReturnValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Webhook processed successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/webhooks/clerk", () => {
    const validHeaders = {
      "svix-id": "webhook_test_123456",
      "svix-timestamp": "1640995200",
      "svix-signature": "v1_valid_signature_string",
    };

    const userCreatedEvent = {
      type: "user.created",
      data: {
        id: "user_test_123",
        email_addresses: [{ email_address: "test@example.com" }],
        first_name: "Test",
        last_name: "User",
      },
    };

    it("should process user.created webhook successfully", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userCreatedEvent,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should process user.updated webhook successfully", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      const userUpdatedEvent = {
        ...userCreatedEvent,
        type: "user.updated",
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userUpdatedEvent,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should process user.deleted webhook successfully", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      const userDeletedEvent = {
        ...userCreatedEvent,
        type: "user.deleted",
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userDeletedEvent,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject webhooks with missing required headers", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(false);

      const invalidHeaders = {
        "svix-id": "webhook_test_123456",
        // Missing svix-timestamp and svix-signature
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: invalidHeaders,
        body: userCreatedEvent,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("should handle webhook service errors gracefully", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      const mockWebhook = testHelper.getMock("webhookService");
      mockWebhook.createWebhookResponse.mockImplementation(() => {
        throw new Error("Webhook processing failed");
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userCreatedEvent,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should process multiple user events in sequence", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      const events = [
        { ...userCreatedEvent, type: "user.created" },
        { ...userCreatedEvent, type: "user.updated" },
        { ...userCreatedEvent, type: "user.deleted" },
      ];

      const responses = await Promise.all(
        events.map((event) =>
          POST(
            testHelper.createRequest({
              method: "POST",
              path: "/api/webhooks/clerk",
              headers: validHeaders,
              body: event,
            }),
          ),
        ),
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should handle webhook replay scenarios (same event processed multiple times)", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      // Process the same event twice
      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userCreatedEvent,
      });

      const response1 = await POST(request);
      const response2 = await POST(request);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
    });

    it("should log webhook processing attempts", async () => {
      const mockSecurity = testHelper.getMock("securityService");
      mockSecurity.verifyClerkWebhook.mockReturnValue(true);

      // Mock console.log to verify logging
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/clerk",
        headers: validHeaders,
        body: userCreatedEvent,
      });

      await POST(request);

      // Verify that logging was attempted
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
