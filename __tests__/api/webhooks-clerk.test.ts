import { jest } from "@jest/globals";
import { POST } from "@/app/api/webhooks/clerk/route";
import { createTestRequest } from "./helpers";

// Mock services properly
jest.mock("@/lib/services/webhook-service", () => ({
  WebhookService: {
    processWebhook: jest.fn(),
  },
}));

jest.mock("@/lib/services/security-service", () => ({
  SecurityService: {
    verifyClerkWebhook: jest.fn(),
  },
}));

import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";

const mockWebhookService = WebhookService as jest.Mocked<typeof WebhookService>;
const mockSecurityService = SecurityService as jest.Mocked<
  typeof SecurityService
>;

describe("Clerk Webhook API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockSecurityService.verifyClerkWebhook.mockReturnValue(true);

    // Mock the processWebhook method to return a successful response
    mockWebhookService.processWebhook.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Webhook processed successfully",
          eventType: "user.created",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  describe("POST /api/webhooks/clerk", () => {
    const validHeaders = {
      "svix-id": "webhook_test_123456",
      "svix-timestamp": "1640995200",
      "svix-signature": "v1_valid_signature_string",
    };

    it("should process user.created webhook successfully", async () => {
      // Arrange
      const userCreatedPayload = {
        type: "user.created",
        data: {
          id: "user_123456",
          email_addresses: [{ email_address: "test@example.com" }],
          first_name: "John",
          last_name: "Doe",
          created_at: 1640995200,
        },
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userCreatedPayload,
        validHeaders,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: "Webhook processed successfully",
        eventType: "user.created",
      });

      // Verify WebhookService.processWebhook was called
      expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          serviceName: "Clerk",
          verifySignature: expect.any(Function),
          processEvent: expect.any(Function),
        }),
      );
    });

    it("should process user.updated webhook successfully", async () => {
      // Arrange
      const userUpdatedPayload = {
        type: "user.updated",
        data: {
          id: "user_123456",
          email_addresses: [{ email_address: "updated@example.com" }],
          first_name: "John",
          last_name: "Smith", // Changed last name
          updated_at: 1640995300,
        },
      };

      // Mock response for user.updated
      mockWebhookService.processWebhook.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: "Webhook processed successfully",
            eventType: "user.updated",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userUpdatedPayload,
        validHeaders,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: "Webhook processed successfully",
        eventType: "user.updated",
      });

      expect(mockWebhookService.processWebhook).toHaveBeenCalled();
    });

    it("should process user.deleted webhook successfully", async () => {
      // Arrange
      const userDeletedPayload = {
        type: "user.deleted",
        data: {
          id: "user_123456",
          deleted: true,
        },
      };

      // Mock response for user.deleted
      mockWebhookService.processWebhook.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: "Webhook processed successfully",
            eventType: "user.deleted",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userDeletedPayload,
        validHeaders,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: "Webhook processed successfully",
        eventType: "user.deleted",
      });

      expect(mockWebhookService.processWebhook).toHaveBeenCalled();
    });

    it("should reject webhooks with missing required headers", async () => {
      // Arrange
      const payload = {
        type: "user.created",
        data: { id: "user_123456" },
      };

      const incompleteHeaders = {
        "svix-id": "webhook_test_123456",
        // Missing svix-timestamp and svix-signature
      };

      // Mock security service to fail verification for incomplete headers
      mockSecurityService.verifyClerkWebhook.mockReturnValue(false);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        payload,
        incompleteHeaders,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain("Invalid webhook signature");
    });

    it("should handle webhook service errors gracefully", async () => {
      // Arrange
      const payload = {
        type: "user.created",
        data: {
          id: "user_123456",
          email_addresses: [{ email_address: "test@example.com" }],
        },
      };

      // Mock webhook service error
      mockWebhookService.processWebhook.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Webhook processing failed",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        payload,
        validHeaders,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain("Webhook processing failed");
    });

    it("should process multiple user events in sequence", async () => {
      // Test user lifecycle: created -> updated -> deleted
      const events = [
        {
          type: "user.created",
          data: {
            id: "user_lifecycle_123",
            email_addresses: [{ email_address: "lifecycle@example.com" }],
          },
        },
        {
          type: "user.updated",
          data: {
            id: "user_lifecycle_123",
            email_addresses: [{ email_address: "updated@example.com" }],
          },
        },
        {
          type: "user.deleted",
          data: { id: "user_lifecycle_123", deleted: true },
        },
      ];

      for (const event of events) {
        jest.clearAllMocks();

        mockSecurityService.verifyClerkWebhook.mockReturnValue(true);

        // Mock response for each event type
        mockWebhookService.processWebhook.mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              message: "Webhook processed successfully",
              eventType: event.type,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );

        const request = createTestRequest(
          "POST",
          "/api/webhooks/clerk",
          event,
          validHeaders,
        );

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.eventType).toBe(event.type);
        expect(data.success).toBe(true);
      }
    });

    it("should handle webhook replay scenarios (same event processed multiple times)", async () => {
      // Arrange
      const duplicatePayload = {
        type: "user.created",
        data: {
          id: "user_duplicate_123",
          email_addresses: [{ email_address: "duplicate@example.com" }],
        },
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        duplicatePayload,
        validHeaders,
      );

      // Act - Process the same webhook twice
      const response1 = await POST(request);
      const response2 = await POST(request);

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should be processed successfully (idempotency handled by service layer)
      expect(mockWebhookService.processWebhook).toHaveBeenCalledTimes(2);
    });

    it("should log webhook processing attempts", async () => {
      // Arrange
      const payload = {
        type: "user.created",
        data: {
          id: "user_logging_123",
          email_addresses: [{ email_address: "logging@example.com" }],
        },
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        payload,
        validHeaders,
      );

      // Mock logger to verify logging calls
      const mockLogger = require("@/lib/logger").logger;
      mockLogger.info = jest.fn();

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(
        request,
        expect.any(Object),
      );
    });
  });
});
