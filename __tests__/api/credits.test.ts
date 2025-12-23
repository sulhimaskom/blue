import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/credits/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { validateRequest } from "@/lib/api-utils";
import { mockUser, mockDbResponse, createTestRequest } from "../helpers";

// Mock the imports
jest.mock("@clerk/nextjs/server");
jest.mock("@/lib/db");
jest.mock("@/lib/api-utils");

const mockCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;
const mockDb = db as jest.MockedFunction<typeof db>;
const mockValidateRequest = validateRequest as jest.MockedFunction<
  typeof validateRequest
>;

describe("/api/credits", () => {
  describe("POST - Add Credits", () => {
    const validCreditData = {
      amount: 1000, // $10.00 in cents
      paymentMethodId: "pm_test_1234567890",
    };

    it("should successfully add credits with valid payment", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validCreditData,
      });

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockTransaction = {
        id: "transaction-uuid",
        userId: 1,
        amount: validCreditData.amount,
        creditsAdded: 100, // $10 = 100 credits
        stripePaymentId: "pi_mock_1234567890",
        createdAt: new Date(),
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 105, // 5 + 100
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.returning
        .mockResolvedValueOnce([mockTransaction]) // For transaction creation
        .mockResolvedValueOnce([mockUpdatedUser]); // For user update
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/credits",
        validCreditData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        transactionId: mockTransaction.id,
        creditsAdded: 100,
        totalCredits: 105,
        amount: 10.0,
        subscriptionTier: "free",
      });
      expect(responseData.data.paymentId).toMatch(/^pi_mock_/);
    });

    it("should upgrade user to pro tier when purchasing 500+ credits", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: { ...validCreditData, amount: 5000 }, // $50 = 500 credits
      });

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockTransaction = {
        id: "transaction-uuid",
        userId: 1,
        amount: 5000,
        creditsAdded: 500,
        stripePaymentId: "pi_mock_1234567890",
        createdAt: new Date(),
      };

      const mockUpdatedUser = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 505,
        subscriptionTier: "pro", // Should upgrade to pro
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.returning
        .mockResolvedValueOnce([mockTransaction])
        .mockResolvedValueOnce([mockUpdatedUser]);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest("POST", "/api/credits", {
        amount: 5000,
        paymentMethodId: "pm_test_123",
      }) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.subscriptionTier).toBe("pro");
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const request = createTestRequest(
        "POST",
        "/api/credits",
        validCreditData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Authentication required");
    });

    it("should return 400 when amount is below minimum", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: false,
        error: "Minimum $1.00 purchase",
      });

      const request = createTestRequest("POST", "/api/credits", {
        amount: 50,
        paymentMethodId: "pm_test_123",
      }) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it("should return 400 when payment method is missing", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: false,
        error: "Payment method required",
      });

      const request = createTestRequest("POST", "/api/credits") as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it("should handle database errors during transaction creation", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validCreditData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/credits",
        validCreditData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });
  });

  describe("GET - Fetch Credits Information", () => {
    it("should successfully fetch user credits and transaction history", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 15,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockTransactions = [
        {
          id: "transaction-1",
          userId: 1,
          amount: 1000,
          creditsAdded: 100,
          stripePaymentId: "pi_mock_123",
          createdAt: new Date("2025-01-01"),
        },
        {
          id: "transaction-2",
          userId: 1,
          amount: 500,
          creditsAdded: 50,
          stripePaymentId: "pi_mock_456",
          createdAt: new Date("2025-01-15"),
        },
      ];

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.orderBy.mockResolvedValue(mockTransactions);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest("GET", "/api/credits") as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        credits: 15,
        subscriptionTier: "free",
      });
      expect(responseData.data.transactions).toHaveLength(2);
      expect(responseData.data.pricing).toBeDefined();
      expect(responseData.data.pricing.packages).toHaveLength(4);
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const request = createTestRequest("GET", "/api/credits") as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
    });

    it("should return empty transaction history for new users", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 0,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.orderBy.mockResolvedValue([]); // Empty transactions
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest("GET", "/api/credits") as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.transactions).toHaveLength(0);
      expect(responseData.data.credits).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest("GET", "/api/credits") as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should return correct pricing information", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.orderBy.mockResolvedValue([]);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest("GET", "/api/credits") as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.pricing.creditValue).toBe("$0.10 per credit");
      expect(responseData.data.pricing.packages).toEqual([
        { credits: 10, price: "$1.00" },
        { credits: 50, price: "$5.00" },
        { credits: 100, price: "$10.00" },
        { credits: 500, price: "$50.00 (Pro tier)" },
      ]);
    });
  });
});
