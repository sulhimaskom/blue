import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/deploy/[id]/route";
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

describe("/api/deploy/[id]", () => {
  const projectId = "project-uuid-123";

  describe("POST - Deploy Repository", () => {
    const validDeployData = {
      githubOrg: "my-org",
      repoName: "my-awesome-repo",
      isPrivate: false,
    };

    const mockProjectDetails = {
      project: {
        id: projectId,
        ownerId: 1,
        name: "Test Project",
        description: "A test project",
        status: "completed", // Ready for deployment
        repoUrl: null,
        createdAt: new Date(),
      },
      user: {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      },
    };

    it("should successfully deploy a repository with valid data", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validDeployData,
      });

      const mockDatabase = mockDbResponse(mockProjectDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockProjectDetails]);
      mockDatabase.returning.mockResolvedValue([
        {
          ...mockProjectDetails.project,
          status: "deployed",
          repoUrl: "https://github.com/my-org/my-awesome-repo",
        },
      ]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validDeployData,
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        projectId,
        status: "deployed",
        repoUrl: "https://github.com/my-org/my-awesome-repo",
      });
      expect(responseData.data.deploymentDetails).toEqual({
        organization: "my-org",
        repository: "my-awesome-repo",
        visibility: "public",
        simulatedAt: expect.any(String),
      });
    });

    it("should handle private repository deployment", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: { ...validDeployData, isPrivate: true },
      });

      const mockDatabase = mockDbResponse(mockProjectDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockProjectDetails]);
      mockDatabase.returning.mockResolvedValue([
        {
          ...mockProjectDetails.project,
          status: "deployed",
          repoUrl: "https://github.com/my-org/my-awesome-repo",
        },
      ]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest("POST", `/api/deploy/${projectId}`, {
        ...validDeployData,
        isPrivate: true,
      }) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.deploymentDetails.visibility).toBe("private");
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validDeployData,
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Authentication required");
    });

    it("should return 400 when validation fails", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: false,
        error: "Repository name must be at least 3 characters",
      });

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        { githubOrg: "a", repoName: "ab" }, // Invalid data
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it("should return 401 when project not found or user lacks access", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validDeployData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // No project found
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validDeployData,
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        "Project not found or access denied",
      );
    });

    it("should return 400 when project is already deployed", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validDeployData,
      });

      const alreadyDeployedProject = {
        ...mockProjectDetails,
        project: {
          ...mockProjectDetails.project,
          status: "deployed", // Already deployed
        },
      };

      const mockDatabase = mockDbResponse(alreadyDeployedProject);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([alreadyDeployedProject]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validDeployData,
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Project is already deployed");
    });

    it("should handle database errors during deployment", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validDeployData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "POST",
        `/api/deploy/${projectId}`,
        validDeployData,
      ) as NextRequest;

      // Act
      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });
  });

  describe("GET - Fetch Project Status", () => {
    const mockProjectDetails = {
      project: {
        id: projectId,
        ownerId: 1,
        name: "Test Project",
        description: "A test project",
        status: "completed",
        repoUrl: null,
        createdAt: new Date(),
      },
      user: {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      },
    };

    it("should successfully fetch project status", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(mockProjectDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockProjectDetails]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        projectId,
        name: "Test Project",
        status: "completed",
        isDeployed: false,
        canDeploy: true,
      });
      expect(responseData.data.deploymentNotes).toContain(
        "Ready for deployment",
      );
    });

    it("should return status for deployed project", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const deployedProjectDetails = {
        ...mockProjectDetails,
        project: {
          ...mockProjectDetails.project,
          status: "deployed",
          repoUrl: "https://github.com/my-org/my-repo",
        },
      };

      const mockDatabase = mockDbResponse(deployedProjectDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([deployedProjectDetails]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        isDeployed: true,
        canDeploy: false,
        repoUrl: "https://github.com/my-org/my-repo",
      });
      expect(responseData.data.deploymentNotes).toContain(
        "deployment successful",
      );
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Authentication required");
    });

    it("should return 401 when project not found or user lacks access", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // No project found
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        "Project not found or access denied",
      );
    });

    it("should handle database errors during status fetch", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should handle project in generating status", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const generatingProjectDetails = {
        ...mockProjectDetails,
        project: {
          ...mockProjectDetails.project,
          status: "generating", // Still generating
        },
      };

      const mockDatabase = mockDbResponse(generatingProjectDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([generatingProjectDetails]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: projectId });
      const request = createTestRequest(
        "GET",
        `/api/deploy/${projectId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        status: "generating",
        isDeployed: false,
        canDeploy: true, // Can deploy once generation is complete
      });
    });
  });
});
