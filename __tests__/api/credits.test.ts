import { POST, GET } from "@/app/api/credits/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Credits API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true,
    });

    // Setup successful user service responses
    testHelper.withSuccessfulUserResponses();
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/credits", () => {
    it("should return user credit balance", async () => {
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 25;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/credits",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        credits: 25,
        isPro: false,
        proThreshold: 500,
      });
    });

    it("should return zero credits for new user", async () => {
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 0;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/credits",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(0);
      expect(data.data.isPro).toBe(false);
    });

    it("should identify pro users correctly", async () => {
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 750; // Above PRO_THRESHOLD

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/credits",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(750);
      expect(data.data.isPro).toBe(true);
    });

    it("should handle unauthenticated requests", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/credits",
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/credits", () => {
    const validPurchaseData = {
      package: 100, // 100 credits = $10.00
    };

    it("should process credit purchase successfully", async () => {
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 25;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockUserService.updateUserCredits.mockResolvedValue({
        ...mockUser,
        credits: 125, // 25 + 100
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: validPurchaseData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        newBalance: 125,
        creditsPurchased: 100,
        cost: "$10.00",
        transactionId: expect.any(String),
      });
    });

    it("should reject invalid package amounts", async () => {
      const invalidPurchaseData = {
        package: 75, // Not a valid package size
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: validPurchaseData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid package");
    });

    it("should reject purchases below minimum", async () => {
      const belowMinimumData = {
        package: 5, // Below minimum of 10
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: belowMinimumData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle service errors gracefully", async () => {
      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockRejectedValue(
        new Error("Database error"),
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: validPurchaseData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should validate payload format", async () => {
      const invalidPayload = {
        package: "100", // Should be number, not string
      };

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: invalidPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return pricing information", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/credits",
      });

      // Add query parameter for pricing
      const url = new URL(request.url);
      url.searchParams.set("pricing", "true");
      request.url = url.toString();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.pricing).toEqual([
        { credits: 10, price: "$1.00" },
        { credits: 50, price: "$5.00" },
        { credits: 100, price: "$10.00" },
        { credits: 500, price: "$50.00 (Pro tier)" },
      ]);
    });

    it("should handle unauthenticated purchase attempts", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/credits",
        body: validPurchaseData,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});
