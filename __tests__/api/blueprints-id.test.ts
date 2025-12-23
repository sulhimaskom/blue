import { PUT, GET } from "@/app/api/blueprints/[id]/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Blueprint Details API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true,
    });

    // Setup successful service responses
    testHelper.withSuccessfulUserResponses();
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/blueprints/[id]", () => {
    const mockBlueprint = {
      id: 1,
      userId: "user_test_123",
      projectName: "TestProject",
      input: "Build a test application",
      blueprint: {
        title: "Test Application Blueprint",
        description: "A comprehensive test application",
        sections: [
          {
            title: "Setup",
            description: "Initial project setup",
            steps: [
              "Initialize project structure",
              "Set up dependencies",
              "Configure development environment",
            ],
          },
          {
            title: "Core Features",
            description: "Main application functionality",
            steps: [
              "Implement authentication",
              "Create data models",
              "Build API endpoints",
            ],
          },
        ],
      },
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should fetch blueprint details successfully", async () => {
      testHelper.withDbQuery([mockBlueprint]);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/blueprints/1",
      });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockBlueprint);
    });

    it("should return 404 for non-existent blueprint", async () => {
      testHelper.withDbQuery([]); // Empty result

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/blueprints/1",
      });
      const response = await GET(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should reject access to blueprints owned by other users", async () => {
      const otherUserBlueprint = {
        ...mockBlueprint,
        userId: "other_user_456",
      };

      testHelper.withDbQuery([otherUserBlueprint]);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/blueprints/1",
      });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not authorized");
    });

    it("should handle blueprint in progress status", async () => {
      const inProgressBlueprint = {
        ...mockBlueprint,
        status: "generating",
        blueprint: null, // Not ready yet
      };

      testHelper.withDbQuery([inProgressBlueprint]);

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/blueprints/1",
      });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("generating");
      expect(data.data.blueprint).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const mockUserService = testHelper.getMock("userService");
      mockUserService.getAuthenticatedUser.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/blueprints/1",
      });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/blueprints/[id] (Refine)", () => {
    const validRefinePayload = {
      feedback:
        "Make it more scalable and add real-time features for better user experience",
      updateType: "feature" as const,
    };

    it("should refine blueprint successfully", async () => {
      const mockBlueprint = {
        id: 1,
        userId: "user_test_123",
        projectName: "TestProject",
        input: "Build a test application",
        blueprint: {
          title: "Test Application Blueprint",
          description: "A comprehensive test application",
        },
        status: "completed",
      };

      testHelper.withDbQuery([mockBlueprint]);

      // Setup user with sufficient credits
      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 5;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 5,
        subscriptionTier: "free",
      });

      // Setup successful refinement
      const mockBlueprintEngine = testHelper.getMock("blueprintEngine");
      mockBlueprintEngine.refineBlueprint.mockResolvedValue({
        success: true,
        refinedBlueprint: {
          title: "Enhanced Test Application Blueprint",
          description: "A scalable test application with real-time features",
          sections: [
            ...((mockBlueprint.blueprint as any)?.sections || []),
            {
              title: "Performance Optimization",
              description: "Caching and optimization strategies",
            },
            {
              title: "Real-time Features",
              description: "WebSocket integration",
            },
          ],
        },
      });

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: validRefinePayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.refinedBlueprint.title).toBe(
        "Enhanced Test Application Blueprint",
      );
    });

    it("should reject refinement for blueprints not owned by user", async () => {
      const otherUserBlueprint = {
        id: 1,
        userId: "other_user_456",
        projectName: "OtherProject",
        status: "completed",
      };

      testHelper.withDbQuery([otherUserBlueprint]);

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: validRefinePayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it("should reject refinement for blueprints that are not completed", async () => {
      const inProgressBlueprint = {
        id: 1,
        userId: "user_test_123",
        projectName: "TestProject",
        status: "generating",
      };

      testHelper.withDbQuery([inProgressBlueprint]);

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: validRefinePayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("must be completed");
    });

    it("should validate refinement payload", async () => {
      const mockBlueprint = {
        id: 1,
        userId: "user_test_123",
        projectName: "TestProject",
        status: "completed",
      };

      testHelper.withDbQuery([mockBlueprint]);

      const invalidPayload = {
        feedback: "short", // Too short feedback
      };

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: invalidPayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should deduct credits for refinement", async () => {
      const mockBlueprint = {
        id: 1,
        userId: "user_test_123",
        projectName: "TestProject",
        status: "completed",
      };

      testHelper.withDbQuery([mockBlueprint]);

      const mockUser = testHelper.getCurrentUser();
      mockUser!.credits = 5;

      const mockUserService = testHelper.getMock("userService");
      mockUserService.getUserByClerkId.mockResolvedValue({
        ...mockUser,
        credits: 5,
        subscriptionTier: "free",
      });

      mockUserService.updateUserCredits.mockResolvedValue({
        ...mockUser,
        credits: 4, // 5 - 1 credit cost
      });

      const mockBlueprintEngine = testHelper.getMock("blueprintEngine");
      mockBlueprintEngine.refineBlueprint.mockResolvedValue({
        success: true,
        refinedBlueprint: (mockBlueprint as any).blueprint,
      });

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: validRefinePayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(200);
      expect(mockUserService.updateUserCredits).toHaveBeenCalledWith(
        mockUser!.id,
        -1, // Deduct 1 credit
        expect.stringContaining("refinement"),
      );
    });

    it("should handle unauthenticated refinement attempts", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "PUT",
        path: "/api/blueprints/1",
        body: validRefinePayload,
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
    });
  });
});
