import { jest } from "@jest/globals";
import { POST, GET } from "@/app/api/deploy/[id]/route";
import { mockUser, mockDbResponse, createTestRequest } from "./helpers";

// Mock GitHub service properly
jest.mock("@/lib/services/github-service", () => ({
  githubService: {
    createRepository: jest.fn(),
  },
  GitHubServiceError: class extends Error {
    constructor(message: string, statusCode?: number, response?: any) {
      super(message);
      this.name = "GitHubServiceError";
    }
  },
}));

import {
  githubService,
  GitHubServiceError,
} from "@/lib/services/github-service";

// Get reference to the mocked method
const mockCreateRepository = githubService.createRepository as jest.Mock;

describe("Deployment API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (
      require("@clerk/nextjs/server").currentUser as jest.Mock
    ).mockResolvedValue(mockUser);

    // Properly mock the createRepository method
    mockCreateRepository.mockResolvedValue({
      id: 12345,
      name: "test-repo",
      full_name: "test-org/test-repo",
      html_url: "https://github.com/test-org/test-repo",
      clone_url: "https://github.com/test-org/test-repo.git",
      private: false,
      created_at: "2024-01-01T00:00:00Z",
    });
  });

  describe("POST /api/deploy/[id]", () => {
    const validPayload = {
      githubOrg: "test-org",
      repoName: "test-repo",
      isPrivate: false,
    };

    it("should deploy repository successfully with valid project", async () => {
      // Arrange
      const projectId = "project-123";
      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        description: "Marketplace for rare sneakers",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockBlueprint = {
        id: "blueprint-123",
        projectId,
        version: 1,
        contentMarkdown:
          "# Blueprint Content\\n\\nThis is a generated blueprint.",
        structuredData: {},
        marketResearch: {},
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock the project ownership verification query
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock blueprint query
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([mockBlueprint]));

      // Mock project update operations
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockReturnValue(
        Promise.resolve([
          {
            ...mockProject,
            status: "deployed",
            repoUrl: "https://github.com/test-org/test-repo",
          },
        ]),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        projectId,
        repoUrl: "https://github.com/test-org/test-repo",
        status: "deployed",
        message: "Repository deployment successful",
        deploymentDetails: {
          repositoryId: 12345,
          fullName: "test-org/test-repo",
          cloneUrl: "https://github.com/test-org/test-repo.git",
          organization: "test-org",
          repository: "test-repo",
          visibility: "public",
          blueprintVersion: 1,
        },
      });

      // Verify GitHub service was called correctly
      expect(githubService.createRepository).toHaveBeenCalledWith({
        org: "test-org",
        name: "test-repo",
        description: mockProject.description,
        isPrivate: false,
        blueprintContent: mockBlueprint.contentMarkdown,
      });
    });

    it("should reject deployment for projects not owned by user", async () => {
      // Arrange
      const projectId = "project-999";
      const mockDb = mockDbResponse([]);

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("Project not found or access denied");

      // Verify GitHub service was not called
      expect(githubService.createRepository).not.toHaveBeenCalled();
    });

    it("should reject deployment for already deployed projects", async () => {
      // Arrange
      const projectId = "project-123";
      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        status: "deployed", // Already deployed
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("Project is already deployed");

      // Verify GitHub service was not called
      expect(githubService.createRepository).not.toHaveBeenCalled();
    });

    it("should reject deployment for projects with no blueprint", async () => {
      // Arrange
      const projectId = "project-123";
      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock the project ownership verification query
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock empty blueprint query
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("No blueprint found");

      // Verify GitHub service was not called
      expect(githubService.createRepository).not.toHaveBeenCalled();
    });

    it("should handle GitHub service errors and reset project status", async () => {
      // Arrange
      const projectId = "project-123";
      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockBlueprint = {
        id: "blueprint-123",
        projectId,
        version: 1,
        contentMarkdown: "# Blueprint Content",
        structuredData: {},
        marketResearch: {},
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock project verification
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock blueprint query
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([mockBlueprint]));

      // Mock project updates
      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockReturnValue(
        Promise.resolve([
          {
            ...mockProject,
            status: "completed",
          },
        ]),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Mock GitHub service error
      const githubError = new GitHubServiceError(
        "Repository already exists",
        422,
      );
      mockCreateRepository.mockRejectedValue(githubError);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain(
        "GitHub deployment failed: Repository already exists",
      );

      // Verify project status was reset to "completed" (not left as "generating")
      expect(mockDb.update).toHaveBeenCalledTimes(2); // Once for "generating", once for reset
    });

    it("should validate payload and reject invalid inputs", async () => {
      // Arrange
      const projectId = "project-123";
      const invalidPayload = {
        githubOrg: "ab", // Too short
        repoName: "ab", // Too short
        isPrivate: "not-a-boolean", // Wrong type
      };

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        invalidPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();

      // Verify GitHub service was not called
      expect(githubService.createRepository).not.toHaveBeenCalled();
    });

    it("should support private repository deployment", async () => {
      // Arrange
      const projectId = "project-123";
      const privatePayload = {
        ...validPayload,
        isPrivate: true,
      };

      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockBlueprint = {
        id: "blueprint-123",
        projectId,
        version: 1,
        contentMarkdown: "# Blueprint Content",
        structuredData: {},
        marketResearch: {},
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock the queries (simplified for this test)
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );
      mockQuery.orderBy.mockReturnValue(Promise.resolve([mockBlueprint]));

      mockDb.update.mockReturnValue(mockDb);
      mockDb.set.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.returning.mockReturnValue(
        Promise.resolve([
          {
            ...mockProject,
            status: "deployed",
            repoUrl: "https://github.com/test-org/test-repo",
          },
        ]),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        privatePayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.deploymentDetails.visibility).toBe("private");

      // Verify GitHub service was called with isPrivate: true
      expect(githubService.createRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          isPrivate: true,
        }),
      );
    });
  });

  describe("GET /api/deploy/[id]", () => {
    it("should fetch project deployment status", async () => {
      // Arrange
      const projectId = "project-123";
      const mockProject = {
        id: projectId,
        name: "SneakerMarket",
        description: "Marketplace for rare sneakers",
        status: "deployed",
        repoUrl: "https://github.com/test-org/sneaker-market",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          project: mockProject,
          user: mockUser,
        },
      ]);

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", `/api/deploy/${projectId}`);

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        projectId,
        name: "SneakerMarket",
        description: mockProject.description,
        status: "deployed",
        repoUrl: mockProject.repoUrl,
        isDeployed: true,
        canDeploy: false, // Already deployed
        deploymentNotes: "Repository deployment successful",
      });
    });

    it("should handle project not found", async () => {
      // Arrange
      const projectId = "project-999";
      const mockDb = mockDbResponse([]);

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", `/api/deploy/${projectId}`);

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("Project not found or access denied");
    });

    it("should handle different project statuses correctly", async () => {
      // Arrange
      const statuses = ["draft", "generating", "completed"];

      for (const status of statuses) {
        const projectId = "project-123";
        const mockProject = {
          id: projectId,
          name: "TestProject",
          status,
          repoUrl:
            status === "deployed" ? "https://github.com/test/repo" : null,
          ownerId: 1,
          createdAt: new Date(),
        };

        const mockDb = mockDbResponse([
          {
            project: mockProject,
            user: mockUser,
          },
        ]);

        const mockQuery = mockDb.select.mockReturnValue(mockDb);
        mockQuery.from.mockReturnValue(mockDb);
        mockQuery.innerJoin.mockReturnValue(mockDb);
        mockQuery.where.mockReturnValue(mockDb);
        mockQuery.limit.mockReturnValue(
          Promise.resolve([
            {
              project: mockProject,
              user: mockUser,
            },
          ]),
        );

        (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

        const request = createTestRequest("GET", `/api/deploy/${projectId}`);

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.status).toBe(status);
        expect(data.isDeployed).toBe(status === "deployed");

        if (status === "generating") {
          expect(data.canDeploy).toBe(false);
          expect(data.deploymentNotes).toBe(
            "Repository deployment in progress",
          );
        } else if (status === "deployed") {
          expect(data.canDeploy).toBe(false);
        } else {
          expect(data.canDeploy).toBe(status !== "completed");
        }
      }
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated POST requests", async () => {
      // Arrange
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const projectId = "project-123";
      const request = createTestRequest("POST", `/api/deploy/${projectId}`, {
        githubOrg: "test-org",
        repoName: "test-repo",
        isPrivate: false,
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated GET requests", async () => {
      // Arrange
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const projectId = "project-123";
      const request = createTestRequest("GET", `/api/deploy/${projectId}`);

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
