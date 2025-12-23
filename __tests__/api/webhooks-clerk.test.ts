import { NextRequest } from "next/server";
import { POST, OPTIONS } from "@/app/api/webhooks/clerk/route";
import { db } from "@/lib/db";
import { mockDbResponse, createTestRequest } from "../helpers";

// Mock the imports
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockDb = db as jest.MockedFunction<typeof db>;

describe("/api/webhooks/clerk", () => {
  describe("POST - Clerk Webhook Handler", () => {
    const validWebhookHeaders = {
      "svix-id": "test-id",
      "svix-timestamp": "1234567890",
      "svix-signature": "test-signature",
      "content-type": "application/json",
    };

    const userCreatedEvent = {
      type: "user.created",
      data: {
        id: "clerk-user-123",
        email_addresses: [
          {
            email_address: "test@example.com",
          },
        ],
      },
    };

    const userUpdatedEvent = {
      type: "user.updated",
      data: {
        id: "clerk-user-123",
        email_addresses: [
          {
            email_address: "updated@example.com",
          },
        ],
      },
    };

    const userDeletedEvent = {
      type: "user.deleted",
      data: {
        id: "clerk-user-123",
      },
    };

    it("should handle user creation webhook successfully", async () => {
      // Arrange
      const mockUserRecord = {
        id: 1,
        clerkId: "clerk-user-123",
        email: "test@example.com",
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.delete.mockReturnValue(mockDatabase as any);

      // Mock user not found initially, then creation
      mockDatabase.limit.mockResolvedValueOnce([]); // No existing user
      mockDatabase.returning.mockResolvedValue([mockUserRecord]); // New user created
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userCreatedEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userCreatedEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.received).toBe(true);
    });

    it("should handle duplicate user creation gracefully", async () => {
      // Arrange
      const mockExistingUser = {
        id: 1,
        clerkId: "clerk-user-123",
        email: "test@example.com",
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockExistingUser);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockExistingUser]); // User exists
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userCreatedEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userCreatedEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should not attempt to insert if user already exists
      expect(mockDatabase.insert).not.toHaveBeenCalled();
    });

    it("should handle user deletion webhook successfully", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.delete.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userDeletedEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userDeletedEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockDatabase.delete).toHaveBeenCalled();
    });

    it("should handle user email update webhook successfully", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userUpdatedEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userUpdatedEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockDatabase.update).toHaveBeenCalledWith({
        email: "updated@example.com",
      });
    });

    it("should reject webhooks with missing headers", async () => {
      // Arrange
      const invalidHeaders = {
        "content-type": "application/json",
        // Missing svix headers
      };

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userCreatedEvent,
        invalidHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userCreatedEvent));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Invalid webhook headers");
    });

    it("should handle user creation without email address", async () => {
      // Arrange
      const eventNoEmail = {
        type: "user.created",
        data: {
          id: "clerk-user-123",
          email_addresses: [], // No email addresses
        },
      };

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // No existing user
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        eventNoEmail,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(eventNoEmail));

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("No email provided");
    });

    it("should handle invalid JSON payload", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
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

    it("should handle database errors during user creation", async () => {
      // Arrange
      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
        userCreatedEvent,
        validWebhookHeaders,
      ) as NextRequest;
      (request as any).text = jest
        .fn()
        .mockResolvedValue(JSON.stringify(userCreatedEvent));

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
        type: "user.unknown",
        data: {
          id: "clerk-user-123",
        },
      };

      const mockDatabase = mockDbResponse(null);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/webhooks/clerk",
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
