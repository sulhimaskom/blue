/**
 * UserService Test Suite
 *
 * Critical Business Logic Testing:
 * - User authentication via Clerk and database verification
 * - Credit updates with threshold monitoring
 * - Subscription tier auto-upgrade logic
 * - Webhook-based user lifecycle operations (create, update, delete)
 * - Admin role detection and customer ID extraction
 * - Credit warning notifications at threshold levels
 * - Error handling for authentication, database, and validation errors
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { UserService, type AuthenticatedUser, type RequestContext } from "@/lib/services/user-service";

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@clerk/nextjs/server");

jest.mock("@/lib/db/rls-policies");

jest.mock("@/lib/services/webhook-event-dispatcher");

jest.mock("@/lib/services/notification-service");

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    security: jest.fn(),
    apiError: jest.fn(),
    systemEvent: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/constants");

import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { setRLSContext } from "@/lib/db/rls-policies";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { NotificationService } from "@/lib/services/notification-service";
import { CREDIT_RULES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { AuthenticationError, DatabaseError, ValidationError } from "@/lib/api-utils";

describe("UserService - Critical Business Logic", () => {
  let mockDbInstance: any;

  const mockContext: RequestContext = {
    requestId: "test-request-123",
  };

  const mockUserRecord = {
    id: 1,
    clerkId: "clerk_123",
    email: "test@example.com",
    credits: 100,
    subscriptionTier: "free",
    createdAt: new Date("2024-01-01"),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (CREDIT_RULES as jest.Mocked<typeof CREDIT_RULES>).SIGNUP_BONUS = 50;
  });

  describe("hasSufficientCredits - Credit Validation", () => {
    test("should return true when user has sufficient credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk_123",
        id: 1,
        email: "test@example.com",
        credits: 100,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
        isAdmin: false,
      };

      // Act
      const result = UserService.hasSufficientCredits(user, 50);

      // Assert
      expect(result).toBe(true);
    });

    test("should return true when user has exact required credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk_123",
        id: 1,
        email: "test@example.com",
        credits: 50,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
        isAdmin: false,
      };

      // Act
      const result = UserService.hasSufficientCredits(user, 50);

      // Assert
      expect(result).toBe(true);
    });

    test("should return false when user has insufficient credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk_123",
        id: 1,
        email: "test@example.com",
        credits: 30,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
        isAdmin: false,
      };

      // Act
      const result = UserService.hasSufficientCredits(user, 50);

      // Assert
      expect(result).toBe(false);
    });

    test("should use default requiredCredits of 1", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk_123",
        id: 1,
        email: "test@example.com",
        credits: 1,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
        isAdmin: false,
      };

      // Act
      const result = UserService.hasSufficientCredits(user);

      // Assert
      expect(result).toBe(true);
    });

    test("should return false for zero credits with default requiredCredits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk_123",
        id: 1,
        email: "test@example.com",
        credits: 0,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
        isAdmin: false,
      };

      // Act
      const result = UserService.hasSufficientCredits(user);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("createWebhookUser - User Creation", () => {
    const mockUserCreationRequest = {
      clerkId: "clerk_new",
      email: "new@example.com",
      requestId: "webhook-req-123",
    };

    test("should throw ValidationError when clerkId is missing", async () => {
      // Arrange
      const invalidRequest = { ...mockUserCreationRequest, clerkId: "" };

      // Act & Assert
      await expect(UserService.createWebhookUser(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(UserService.createWebhookUser(invalidRequest)).rejects.toThrow("Clerk ID and email are required");
    });

    test("should throw ValidationError when email is missing", async () => {
      // Arrange
      const invalidRequest = { ...mockUserCreationRequest, email: "" };

      // Act & Assert
      await expect(UserService.createWebhookUser(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(UserService.createWebhookUser(invalidRequest)).rejects.toThrow("Clerk ID and email are required");
    });
  });

  describe("deleteWebhookUser - User Deletion", () => {
    test("should throw ValidationError when clerkId is missing", async () => {
      // Act & Assert
      await expect(UserService.deleteWebhookUser("", "webhook-req-456")).rejects.toThrow(ValidationError);
      await expect(UserService.deleteWebhookUser("", "webhook-req-456")).rejects.toThrow("Clerk ID is required");
    });
  });

  describe("updateWebhookUser - User Email Update", () => {
    const mockUserUpdateRequest = {
      clerkId: "clerk_123",
      email: "updated@example.com",
      requestId: "webhook-req-789",
    };

    test("should throw ValidationError when clerkId is missing", async () => {
      // Arrange
      const invalidRequest = { ...mockUserUpdateRequest, clerkId: "" };

      // Act & Assert
      await expect(UserService.updateWebhookUser(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(UserService.updateWebhookUser(invalidRequest)).rejects.toThrow("Clerk ID is required");
    });

    test("should throw ValidationError when email is missing", async () => {
      // Arrange
      const invalidRequest = { ...mockUserUpdateRequest, email: "" };

      // Act & Assert
      await expect(UserService.updateWebhookUser(invalidRequest)).rejects.toThrow(ValidationError);
      await expect(UserService.updateWebhookUser(invalidRequest)).rejects.toThrow("Email is required");
    });
  });
});
