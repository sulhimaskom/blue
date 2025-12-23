import { POST, GET } from "@/app/api/blueprints/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Blueprint API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true,
    });

    // Setup successful service responses
    testHelper.withSuccessfulUserResponses();

    // Setup blueprint engine success response
    const mockBlueprintEngine = testHelper.getMock("blueprintEngine");
    mockBlueprintEngine.generateBlueprint.mockResolvedValue({
      projectId: "test-project-123",
      blueprintId: "test-blueprint-456",
      status: "completed",
      estimatedDuration: 5000,
      blueprint: {
        title: "SneakerMarket Blueprint",
        description: "A marketplace for rare sneakers",
        sections: [
          {
            title: "Authentication",
            description: "User authentication system",
          },
          {
            title: "Marketplace",
            description: "Product listing and search",
          },
        ],
      },
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/blueprints", () => {
    const validPayload = {
      input: "I want to build a marketplace for rare sneakers",
      projectName: "SneakerMarket",
    };

    it("should generate blueprint successfully with valid input and sufficient credits", async () => {
      // Setup user with sufficient credits
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 5;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 5,
        subscriptionTier: "free",
      });

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        projectId: "test-project-123",
        blueprintId: "test-blueprint-456",
        status: "completed",
        estimatedDuration: 5000,
      });
    });

    it("should reject blueprint generation for users with insufficient credits", async () => {
      // Setup user with insufficient credits
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 0;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 0,
        subscriptionTier: "free",
      });

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("insufficient credits");
    });

    it("should validate payload and reject invalid inputs", async () => {
      const invalidPayload = {
        input: "", // Empty input
        projectName: "ValidProject",
      };

      const request = testHelper.createRequest({
        method: "POST",
        body: invalidPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("required");
    });

    it("should handle blueprint engine errors gracefully", async () => {
      const mockBlueprintEngine = testHelper.getMock("blueprintEngine");
      mockBlueprintEngine.generateBlueprint.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 5;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 5,
        subscriptionTier: "free",
      });

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should deduct credits after successful blueprint generation", async () => {
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 5;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 5,
        subscriptionTier: "free",
      });

      // Mock credit deduction
      mockUserService.updateUserCredits.mockResolvedValue({
        ...mockUser,
        credits: 4, // 5 - 1 credit cost
      });

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUserService.updateUserCredits).toHaveBeenCalledWith(
        mockUser!.id,
        -1, // Deduct 1 credit
        expect.any(String),
      );
    });

    it("should handle unauthenticated requests", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/blueprints", () => {
    it("should return user's blueprint history", async () => {
      const mockBlueprints = [
        {
          id: 1,
          userId: "user_test_123",
          projectName: "SneakerMarket",
          input: "I want to build a marketplace for rare sneakers",
          blueprint: {
            title: "SneakerMarket Blueprint",
            description: "A marketplace for rare sneakers",
          },
          status: "completed",
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          userId: "user_test_123",
          projectName: "TaskTracker",
          input: "A simple task tracking app",
          blueprint: {
            title: "TaskTracker Blueprint",
            description: "A simple task tracking app",
          },
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ];

      testHelper.withDbQuery(mockBlueprints);

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.blueprints).toHaveLength(2);
      expect(data.data.blueprints[0].projectName).toBe("SneakerMarket");
    });

    it("should return empty array for users with no blueprints", async () => {
      testHelper.withDbQuery([]); // Empty result

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.blueprints).toEqual([]);
    });

    it("should support pagination", async () => {
      const mockBlueprints = Array.from(
        { length: 25 }, // More than default pageSize
        (_, i) => ({
          id: i + 1,
          userId: "user_test_123",
          projectName: `Project ${i + 1}`,
          input: `Input for project ${i + 1}`,
          blueprint: {
            title: `Blueprint ${i + 1}`,
            description: `Description for project ${i + 1}`,
          },
          status: "completed",
          createdAt: new Date().toISOString(),
        }),
      );

      testHelper.withDbQuery(mockBlueprints);

      const request = testHelper.createRequest({
        method: "GET",
        url: "http://localhost/api/blueprints?page=1&limit=10",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.blueprints).toHaveLength(10);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it("should handle unauthenticated requests", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
