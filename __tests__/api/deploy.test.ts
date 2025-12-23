import { jest } from "@jest/globals";
import { POST, GET } from "@/app/api/deploy/[id]/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Deployment API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: true,
    });

    // Setup successful service responses
    testHelper.withSuccessfulUserResponses().withSuccessfulGitHubResponses();
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/deploy/[id]", () => {
    const validPayload = {
      githubOrg: "test-org",
      repoName: "test-repo",
      isPrivate: false,
    };

    const mockProject = {
      id: 1,
      userId: "user_test_123",
      name: "Test Project",
      blueprint: {
        title: "Test Blueprint",
        description: "Test Description",
      },
      status: "ready",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should deploy repository successfully with valid project", async () => {
      // Mock database to return a valid project
      testHelper.withDbQuery([mockProject]);

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        projectId: 1,
        repository: {
          id: 12345,
          name: "test-repo",
          full_name: "test-org/test-repo",
          html_url: "https://github.com/test-org/test-repo",
          clone_url: "https://github.com/test-org/test-repo.git",
          private: false,
        },
      });
    });

    it("should reject deployment for projects not owned by user", async () => {
      // Mock database to return a project owned by different user
      const otherUserProject = {
        ...mockProject,
        userId: "other_user_456",
      };

      testHelper.withDbQuery([otherUserProject]);

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Unauthorized");
    });

    it("should reject deployment for already deployed projects", async () => {
      // Mock database to return an already deployed project
      const deployedProject = {
        ...mockProject,
        status: "deployed",
      };

      testHelper.withDbQuery([deployedProject]);

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("already been deployed");
    });

    it("should reject deployment for projects with no blueprint", async () => {
      // Mock database to return a project without blueprint
      const projectWithoutBlueprint = {
        ...mockProject,
        blueprint: null,
      };

      testHelper.withDbQuery([projectWithoutBlueprint]);

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("no blueprint");
    });

    it("should handle GitHub service errors and reset project status", async () => {
      // Mock GitHub service to throw an error
      const mockGitHub = testHelper.getMock("githubService");
      mockGitHub.createRepository.mockRejectedValue(
        new Error("GitHub API error"),
      );

      testHelper.withDbQuery([mockProject]);

      const request = testHelper.createRequest({
        method: "POST",
        body: validPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should validate payload and reject invalid inputs", async () => {
      const invalidPayload = {
        githubOrg: "", // Invalid: empty string
        repoName: "valid-repo-name",
        isPrivate: false,
      };

      testHelper.withDbQuery([mockProject]);

      const request = testHelper.createRequest({
        method: "POST",
        body: invalidPayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should support private repository deployment", async () => {
      const privatePayload = {
        ...validPayload,
        isPrivate: true,
      };

      testHelper.withDbQuery([mockProject]);

      // Mock GitHub service to return private repo
      const mockGitHub = testHelper.getMock("githubService");
      mockGitHub.createRepository.mockResolvedValue({
        id: 12345,
        name: "test-repo",
        full_name: "test-org/test-repo",
        html_url: "https://github.com/test-org/test-repo",
        clone_url: "https://github.com/test-org/test-repo.git",
        private: true,
        created_at: "2024-01-01T00:00:00Z",
      });

      const request = testHelper.createRequest({
        method: "POST",
        body: privatePayload,
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.repository.private).toBe(true);
    });
  });

  describe("GET /api/deploy/[id]", () => {
    it("should fetch project deployment status", async () => {
      const project = {
        id: 1,
        userId: "user_test_123",
        name: "Test Project",
        status: "ready",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      testHelper.withDbQuery([project]);

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("ready");
    });

    it("should handle project not found", async () => {
      testHelper.withDbQuery([]); // Empty result

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "999" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found");
    });

    it("should handle different project statuses correctly", async () => {
      const statuses = [
        "draft",
        "generating",
        "ready",
        "deploying",
        "deployed",
        "error",
      ];

      for (const status of statuses) {
        const project = {
          id: 1,
          userId: "user_test_123",
          name: "Test Project",
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        testHelper.withDbQuery([project]);

        const request = testHelper.createRequest({ method: "GET" });
        const response = await GET(request, {
          params: Promise.resolve({ id: "1" }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe(status);

        testHelper.resetAll();
      }
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated POST requests", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({
        method: "POST",
        body: { githubOrg: "test", repoName: "test" },
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated GET requests", async () => {
      testHelper.withoutAuth();

      const request = testHelper.createRequest({ method: "GET" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(401);
    });
  });
});
