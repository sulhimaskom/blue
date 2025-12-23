import { NextRequest } from "next/server";
import { POST, OPTIONS } from "@/app/api/webhooks/stripe/route";
import { db } from "@/lib/db";
import { mockDbResponse, createTestRequest } from "../helpers";

// Mock the imports
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockDb = db as jest.MockedFunction<typeof db>;

describe("/api/webhooks/stripe", () => {
  describe("POST - Stripe Webhook Handler", () => {
    const validWebhookHeaders = {
      "stripe-signature": "v1=test-signature",
      "content-type": "application/json",
    };

    const paymentIntentSucceededEvent = {
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test_1234567890",
          amount: 1000, // $10.00 in cents
          metadata: {
            userId: "clerk-user-123",
            creditsAdded: "100",
          },
        },
      },
    };

    const paymentIntentWithoutMetadataEvent = {
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_test_1234567890",
          amount: 1000,
          metadata: {}, // No metadata
        },
      },
    };

    const invoicePaymentSucceededEvent = {
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: "in_test_1234567890",
          subscription: "sub_test_1234567890",
        },
      },
    };

    it("should handle payment intent succeeded webhook successfully", async () => {
      // Arrange
      const mockUserRecord = {
        id: 1,
        clerkId: "clerk-user-123",
        email: "test@example.com",
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);

      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentSucceededEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.received).toBe(true);
      expect(mockDatabase.update).toHaveBeenCalledWith({
        credits: 105, // 5 + 100
        subscriptionTier: "free", // Still free since 100 < 500
      });
      expect(mockDatabase.insert).toHaveBeenCalledWith({
        userId: 1,
        amount: 1000,
        creditsAdded: 100,
        stripePaymentId: "pi_test_1234567890",
      });
    });

    it("should upgrade to pro tier when adding 500+ credits via webhook", async () => {
      // Arrange
      const proTierEvent = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_1234567890",
            amount: 5000, // $50.00
            metadata: {
              userId: "clerk-user-123",
              creditsAdded: "500",
            },
          },
        },
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "clerk-user-123",
        email: "test@example.com",
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);

      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        proTierEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(proTierEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockDatabase.update).toHaveBeenCalledWith({
        credits: 505, // 5 + 500
        subscriptionTier: "pro", // Should upgrade to pro
      });
    });

    it("should handle invoice payment succeeded webhook", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        invoicePaymentSucceededEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(invoicePaymentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should log subscription payment but not update user (handled in Phase 4)
    });

    it("should reject webhooks with invalid signature", async () => {
      // Arrange
      const invalidHeaders = {
        "stripe-signature": "invalid-signature",
        "content-type": "application/json",
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentSucceededEvent,
        invalidHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid Stripe webhook signature");
    });

    it("should reject webhooks with missing signature", async () => {
      // Arrange
      const invalidHeaders = {
        "content-type": "application/json",
        // Missing stripe-signature
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentSucceededEvent,
        invalidHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should handle payment intent for non-existent user", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // User not found
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentSucceededEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should still return success even if user not found
      expect(mockDatabase.update).not.toHaveBeenCalled();
    });

    it("should handle payment intent without metadata", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentWithoutMetadataEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentWithoutMetadataEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should handle gracefully without metadata
    });

    it("should handle invalid JSON payload", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        {},
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest.fn().mockResolvedValue("invalid json");

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid webhook payload");
    });

    it("should handle database errors during payment processing", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        paymentIntentSucceededEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(paymentIntentSucceededEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should handle unknown event types gracefully", async () => {
      // Arrange
      const unknownEvent = {
        type: "payment_intent.unknown",
        data: {
          object: {
            id: "pi_test_1234567890",
          },
        },
      };

      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/stripe",
        unknownEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(unknownEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should still return success for unknown events
    });
  });

  describe("OPTIONS - Webhook Testing", () => {
    it("should handle OPTIONS requests for webhook testing", async () => {
      // Act
      const response = await OPTIONS();

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
