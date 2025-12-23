import { jest } from "@jest/globals";
import { POST, GET } from "@/app/api/credits/route";
import { mockUser, mockDbResponse, createTestRequest } from "./helpers";

// Mock services and constants
jest.mock("@/lib/services/user-service");
jest.mock("@/lib/constants");

import { UserService } from "@/lib/services/user-service";
import { CREDIT_RULES, PRICING_PACKAGES } from "@/lib/constants";

const mockUserService = UserService as jest.Mocked<typeof UserService>;

// Mock constants properly
const mockCreditRules = {
  SIGNUP_BONUS: 5,
  CONVERSION_RATE: 10, // $1.00 = 10 credits
  BLUEPRINT_COST: 1,
  PRO_THRESHOLD: 500,
  MINIMUM_PURCHASE: 100, // $1.00 minimum in cents
  MAXIMUM_PURCHASE: 100000, // $1000.00 maximum in cents
};

const mockPricingPackages = [
  { credits: 10, price: "$1.00" },
  { credits: 50, price: "$5.00" },
  { credits: 100, price: "$10.00" },
  { credits: 500, price: "$50.00 (Pro tier)" },
];

// Mock the constants
(CREDIT_RULES as any) = mockCreditRules;
(PRICING_PACKAGES as any) = mockPricingPackages;

describe("Credits API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (
      require("@clerk/nextjs/server").currentUser as jest.Mock
    ).mockResolvedValue(mockUser);

    mockUserService.getAuthenticatedUser.mockResolvedValue({
      id: 1,
      clerkId: mockUser.id,
      email: mockUser.email,
      credits: 10,
      subscriptionTier: "pro",
      createdAt: new Date(),
    });
  });

  describe("POST /api/credits", () => {
    const validPayload = {
      amount: 1000, // $10.00 in cents
      paymentMethodId: "pm_test_123456789",
    };

    it("should add credits successfully with valid payment", async () => {
      // Arrange
      const mockTransaction = {
        id: "transaction-123",
        userId: 1,
        amount: 1000,
        creditsAdded: 100, // 1000 / 10 conversion rate
        stripePaymentId: "pi_mock_123456789",
        createdAt: new Date(),
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 110, // 10 initial + 100 added
        subscriptionTier: "pro",
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([mockTransaction]);

      // Mock transaction insertion
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockReturnValue(Promise.resolve([mockTransaction]));

      // Mock service methods
      mockUserService.updateSubscriptionTierIfNeeded.mockResolvedValue();
      mockUserService.updateUserCredits.mockResolvedValue(mockUpdatedUser);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("POST", "/api/credits", validPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        transactionId: "transaction-123",
        creditsAdded: 100,
        totalCredits: 110,
        amount: 10.0, // Converted back to dollars
        subscriptionTier: "pro",
        paymentId: expect.stringContaining("pi_mock_"),
        message: expect.stringContaining("Credits added successfully"),
      });

      // Verify service interactions
      expect(
        mockUserService.updateSubscriptionTierIfNeeded,
      ).toHaveBeenCalledWith(1, 100, expect.any(Object));
      expect(mockUserService.updateUserCredits).toHaveBeenCalledWith(
        1,
        100,
        expect.any(Object),
      );
    });

    it("should reject amounts below minimum purchase", async () => {
      // Arrange
      const invalidPayload = {
        amount: 50, // Below $1.00 minimum
        paymentMethodId: "pm_test_123",
      };

      const request = createTestRequest("POST", "/api/credits", invalidPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    it("should reject amounts above maximum purchase", async () => {
      // Arrange
      const invalidPayload = {
        amount: 200000, // Above $1000.00 maximum
        paymentMethodId: "pm_test_123",
      };

      const request = createTestRequest("POST", "/api/credits", invalidPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    it("should reject invalid payment method ID", async () => {
      // Arrange
      const invalidPayload = {
        amount: 1000,
        paymentMethodId: "", // Empty payment method ID
      };

      const request = createTestRequest("POST", "/api/credits", invalidPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    it("should handle database errors during transaction creation", async () => {
      // Arrange
      const mockDb = mockDbResponse([]);
      mockDb.insert.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("POST", "/api/credits", validPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();

      // Verify credits were not added on failure
      expect(mockUserService.updateUserCredits).not.toHaveBeenCalled();
    });

    it("should update subscription tier when reaching thresholds", async () => {
      // Arrange
      const mockTransaction = {
        id: "transaction-upgrade",
        userId: 1,
        amount: 5000, // $50.00
        creditsAdded: 500,
        stripePaymentId: "pi_mock_upgrade",
        createdAt: new Date(),
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 510, // Should trigger tier upgrade
        subscriptionTier: "enterprise", // Upgraded tier
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([mockTransaction]);
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.values.mockReturnValue(mockDb);
      mockDb.returning.mockReturnValue(Promise.resolve([mockTransaction]));

      mockUserService.updateSubscriptionTierIfNeeded.mockResolvedValue();
      mockUserService.updateUserCredits.mockResolvedValue(mockUpdatedUser);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("POST", "/api/credits", validPayload);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.subscriptionTier).toBe("enterprise");
      expect(mockUserService.updateSubscriptionTierIfNeeded).toHaveBeenCalled();
    });
  });

  describe("GET /api/credits", () => {
    it("should return user credit information with transaction history", async () => {
      // Arrange
      const mockUserDetails = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 15,
        subscriptionTier: "pro",
        createdAt: new Date(),
      };

      const mockTransactions = [
        {
          id: "trans-1",
          userId: 1,
          amount: 1000,
          creditsAdded: 100,
          stripePaymentId: "pi_test_1",
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "trans-2",
          userId: 1,
          amount: 500,
          creditsAdded: 50,
          stripePaymentId: "pi_test_2",
          createdAt: new Date("2024-01-02"),
        },
      ];

      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUserDetails);

      const mockDb = mockDbResponse(mockTransactions);

      // Mock transaction query
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.orderBy.mockReturnValue(Promise.resolve(mockTransactions));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        credits: 15,
        subscriptionTier: "pro",
        transactions: expect.arrayContaining([
          expect.objectContaining({
            id: "trans-1",
            amount: 1000,
            creditsAdded: 100,
            paymentId: "pi_test_1",
          }),
          expect.objectContaining({
            id: "trans-2",
            amount: 500,
            creditsAdded: 50,
            paymentId: "pi_test_2",
          }),
        ]),
        pricing: {
          creditValue: "$0.10 per credit",
          packages: mockPricingPackages,
        },
      });
    });

    it("should return credit info for free-tier users with no transactions", async () => {
      // Arrange
      const mockFreeUser = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 2,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      mockUserService.getAuthenticatedUser.mockResolvedValue(mockFreeUser);

      const mockDb = mockDbResponse([]);

      // Mock empty transaction query
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.orderBy.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        credits: 2,
        subscriptionTier: "free",
        transactions: [],
        pricing: {
          creditValue: "$0.10 per credit",
          packages: mockPricingPackages,
        },
      });
    });

    it("should reject unauthenticated requests", async () => {
      // Arrange
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it("should handle user service errors gracefully", async () => {
      // Arrange
      mockUserService.getAuthenticatedUser.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle user not found case", async () => {
      // Arrange
      mockUserService.getAuthenticatedUser.mockRejectedValue(
        new Error("User not found"),
      );

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should maintain consistent response structure", async () => {
      // Arrange
      const mockUserDetails = {
        id: 123,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 25,
        subscriptionTier: "pro",
        createdAt: new Date(),
      };

      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUserDetails);

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);

      // Verify all expected fields are present
      expect(data).toHaveProperty("userId");
      expect(data).toHaveProperty("credits");
      expect(data).toHaveProperty("subscriptionTier");
      expect(data).toHaveProperty("message");

      // Verify data types
      expect(typeof data.userId).toBe("number");
      expect(typeof data.credits).toBe("number");
      expect(typeof data.subscriptionTier).toBe("string");
      expect(typeof data.message).toBe("string");

      // Verify values
      expect(data.userId).toBe(123);
      expect(data.credits).toBe(25);
      expect(data.subscriptionTier).toBe("pro");
      expect(data.message).toContain("Credits retrieved");
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with null subscription tier gracefully", async () => {
      // Arrange
      const mockUserWithNullTier = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: null as any,
        createdAt: new Date(),
      };

      mockUserService.getAuthenticatedUser.mockResolvedValue(
        mockUserWithNullTier,
      );

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      // The API should handle null tiers gracefully, defaulting to "free"
      expect(response.status).toBe(200);
      expect(data.subscriptionTier).toBeDefined();
    });

    it("should handle negative credits edge case", async () => {
      // Arrange
      const mockUserNegativeCredits = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: -5, // Edge case: negative credits
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      mockUserService.getAuthenticatedUser.mockResolvedValue(
        mockUserNegativeCredits,
      );

      const request = createTestRequest("GET", "/api/credits");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.credits).toBe(-5); // Should return exact value without validation
    });
  });
});
