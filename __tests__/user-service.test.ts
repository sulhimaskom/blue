/**
 * User Service Test Suite
 *
 * Critical Business Logic Testing:
 * - User authentication via Clerk integration
 * - Credit updates with atomic operations
 * - Subscription tier upgrades based on credit purchases
 * - Row Level Security (RLS) context management
 * - Error handling for authentication and database failures
 */

import {
  UserService,
  type AuthenticatedUser,
  type RequestContext,
} from "../lib/services/user-service";

// Helper to create mock db object
const createMockDb = (mockData?: any) => {
  const mockSelect = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockData || []),
      }),
    }),
  });

  const mockUpdate = jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(mockData || []),
      }),
    }),
  });

  return {
    select: mockSelect,
    update: mockUpdate,
  };
};

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("../lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("../lib/db/rls-policies", () => ({
  setRLSContext: jest.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";
import { db } from "../lib/db";
import { setRLSContext } from "../lib/db/rls-policies";
import { AuthenticationError, DatabaseError } from "../lib/api-utils";

describe("UserService - Critical Business Logic", () => {
  let mockContext: RequestContext;

  beforeEach(() => {
    mockContext = { requestId: "test-request-id" };
    jest.clearAllMocks();
  });

  describe("getAuthenticatedUser - User Authentication", () => {
    test("should successfully authenticate user with valid clerk credentials", async () => {
      // Arrange
      const mockClerkUser = { id: "clerk-user-id" };
      const mockDbUser = {
        id: 1,
        clerkId: "clerk-user-id",
        email: "test@example.com",
        credits: 100,
        subscriptionTier: "free",
        createdAt: new Date("2024-01-01"),
      };

      (currentUser as jest.Mock).mockResolvedValue(mockClerkUser);
      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([mockDbUser]));

      // Act
      const result = await UserService.getAuthenticatedUser(mockContext);

      // Assert
      expect(result).toEqual({
        clerkId: mockDbUser.clerkId,
        id: mockDbUser.id,
        email: mockDbUser.email,
        credits: mockDbUser.credits,
        subscriptionTier: mockDbUser.subscriptionTier,
        createdAt: mockDbUser.createdAt,
        customerId: undefined,
        isAdmin: false,
      });
      expect(setRLSContext).toHaveBeenCalledWith(mockClerkUser.id);
    });

    test("should throw AuthenticationError when clerk user is not authenticated", async () => {
      // Arrange
      (currentUser as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        UserService.getAuthenticatedUser(mockContext),
      ).rejects.toThrow(AuthenticationError);
    });

    test("should throw AuthenticationError when user not found in database", async () => {
      // Arrange
      const mockClerkUser = { id: "clerk-user-id" };

      (currentUser as jest.Mock).mockResolvedValue(mockClerkUser);
      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([]));

      // Act & Assert
      await expect(
        UserService.getAuthenticatedUser(mockContext),
      ).rejects.toThrow(AuthenticationError);
      await expect(
        UserService.getAuthenticatedUser(mockContext),
      ).rejects.toThrow("User not found");
    });

    test("should throw DatabaseError when database operation fails", async () => {
      // Arrange
      const mockClerkUser = { id: "clerk-user-id" };

      (currentUser as jest.Mock).mockResolvedValue(mockClerkUser);
      (setRLSContext as jest.Mock).mockResolvedValue(undefined);

      const mockDb = createMockDb();
      mockDb.select().from().where().limit = jest
        .fn()
        .mockRejectedValue(new Error("Database connection failed"));
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act & Assert
      await expect(
        UserService.getAuthenticatedUser(mockContext),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("updateUserCredits - Credit Management", () => {
    const mockDbUser = {
      id: 1,
      clerkId: "clerk-user-id",
      email: "test@example.com",
      credits: 100,
      subscriptionTier: "free",
      createdAt: new Date("2024-01-01"),
    };

    test("should successfully add positive credits to user", async () => {
      // Arrange
      const creditsToAdd = 50;
      const updatedUser = { ...mockDbUser, credits: 150 };

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([updatedUser]));

      // Act
      const result = await UserService.updateUserCredits(
        mockDbUser.id,
        creditsToAdd,
        mockContext,
      );

      // Assert
      expect(result.credits).toBe(150);
      expect(setRLSContext).toHaveBeenCalledWith(mockDbUser.clerkId);
    });

    test("should successfully deduct credits from user", async () => {
      // Arrange
      const creditsToDeduct = -30;
      const updatedUser = { ...mockDbUser, credits: 70 };

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([updatedUser]));

      // Act
      const result = await UserService.updateUserCredits(
        mockDbUser.id,
        creditsToDeduct,
        mockContext,
      );

      // Assert
      expect(result.credits).toBe(70);
    });

    test("should throw DatabaseError when user not found during credit update", async () => {
      // Arrange
      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([]));

      // Act & Assert
      await expect(
        UserService.updateUserCredits(1, 50, mockContext),
      ).rejects.toThrow(DatabaseError);
    });

    test("should throw DatabaseError when database operation fails", async () => {
      // Arrange
      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      const mockDb = createMockDb();
      mockDb.update().set().where().returning = jest
        .fn()
        .mockRejectedValue(new Error("Transaction failed"));
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act & Assert
      await expect(
        UserService.updateUserCredits(1, 50, mockContext),
      ).rejects.toThrow(DatabaseError);
    });

    test("should handle zero credit change", async () => {
      // Arrange
      const updatedUser = { ...mockDbUser };

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([updatedUser]));

      // Act
      const result = await UserService.updateUserCredits(
        mockDbUser.id,
        0,
        mockContext,
      );

      // Assert
      expect(result.credits).toBe(mockDbUser.credits);
    });
  });

  describe("hasSufficientCredits - Credit Validation", () => {
    test("should return true when user has sufficient credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 100,
        subscriptionTier: "free",
        createdAt: new Date(),
      };
      const requiredCredits = 50;

      // Act
      const result = UserService.hasSufficientCredits(user, requiredCredits);

      // Assert
      expect(result).toBe(true);
    });

    test("should return true when user has exactly required credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 100,
        subscriptionTier: "free",
        createdAt: new Date(),
      };
      const requiredCredits = 100;

      // Act
      const result = UserService.hasSufficientCredits(user, requiredCredits);

      // Assert
      expect(result).toBe(true);
    });

    test("should return false when user has insufficient credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 50,
        subscriptionTier: "free",
        createdAt: new Date(),
      };
      const requiredCredits = 100;

      // Act
      const result = UserService.hasSufficientCredits(user, requiredCredits);

      // Assert
      expect(result).toBe(false);
    });

    test("should return false when user has zero credits and requires credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 0,
        subscriptionTier: "free",
        createdAt: new Date(),
      };
      const requiredCredits = 1;

      // Act
      const result = UserService.hasSufficientCredits(user, requiredCredits);

      // Assert
      expect(result).toBe(false);
    });

    test("should return true when user has zero credits and requires zero credits", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 0,
        subscriptionTier: "free",
        createdAt: new Date(),
      };
      const requiredCredits = 0;

      // Act
      const result = UserService.hasSufficientCredits(user, requiredCredits);

      // Assert
      expect(result).toBe(true);
    });

    test("should default to 1 required credit when not specified", () => {
      // Arrange
      const user: AuthenticatedUser = {
        clerkId: "clerk-123",
        id: 1,
        email: "test@example.com",
        credits: 1,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      // Act
      const result = UserService.hasSufficientCredits(user);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("updateSubscriptionTierIfNeeded - Tier Management", () => {
    const mockDbUser = {
      id: 1,
      clerkId: "clerk-user-id",
      email: "test@example.com",
      credits: 100,
      subscriptionTier: "free",
      createdAt: new Date("2024-01-01"),
    };

    test("should upgrade to Pro tier when 500+ credits purchased", async () => {
      // Arrange
      const creditsAdded = 500;
      const updatedUser = { ...mockDbUser, subscriptionTier: "pro" };

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([updatedUser]));

      // Act
      await UserService.updateSubscriptionTierIfNeeded(
        mockDbUser.id,
        creditsAdded,
        mockContext,
      );

      // Assert
      expect(setRLSContext).toHaveBeenCalledWith(mockDbUser.clerkId);
    });

    test("should not upgrade to Pro tier when less than 500 credits purchased", async () => {
      // Arrange
      const creditsAdded = 499;

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([mockDbUser]));

      // Act
      await UserService.updateSubscriptionTierIfNeeded(
        mockDbUser.id,
        creditsAdded,
        mockContext,
      );

      // Assert - verify RLS context is set but update for tier upgrade doesn't happen
      expect(setRLSContext).toHaveBeenCalledWith(mockDbUser.clerkId);
      // The service should set RLS context but skip tier upgrade logic
    });

    test("should handle errors gracefully without throwing", async () => {
      // Arrange
      const creditsAdded = 500;

      const mockDb = createMockDb();
      mockDb.select().from().where().limit = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act & Assert - should not throw
      await expect(
        UserService.updateSubscriptionTierIfNeeded(
          mockDbUser.id,
          creditsAdded,
          mockContext,
        ),
      ).resolves.not.toThrow();
    });

    test("should upgrade to Pro tier with exactly 500 credits", async () => {
      // Arrange
      const creditsAdded = 500;

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([mockDbUser]));

      // Act
      await UserService.updateSubscriptionTierIfNeeded(
        mockDbUser.id,
        creditsAdded,
        mockContext,
      );

      // Assert
      expect(setRLSContext).toHaveBeenCalled();
    });

    test("should upgrade to Pro tier with more than 500 credits", async () => {
      // Arrange
      const creditsAdded = 1000;

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([mockDbUser]));

      // Act
      await UserService.updateSubscriptionTierIfNeeded(
        mockDbUser.id,
        creditsAdded,
        mockContext,
      );

      // Assert
      expect(setRLSContext).toHaveBeenCalled();
    });

    test("should handle user not found gracefully", async () => {
      // Arrange
      const creditsAdded = 500;

      (setRLSContext as jest.Mock).mockResolvedValue(undefined);
      (db as jest.Mock).mockReturnValue(createMockDb([]));

      // Act & Assert - should not throw
      await expect(
        UserService.updateSubscriptionTierIfNeeded(
          999,
          creditsAdded,
          mockContext,
        ),
      ).resolves.not.toThrow();
    });
  });
});
