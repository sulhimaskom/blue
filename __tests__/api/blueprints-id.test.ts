import { NextRequest } from "next/server";
import { PUT, GET } from "@/app/api/blueprints/[id]/route";
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

describe("/api/blueprints/[id]", () => {
  const blueprintId = "blueprint-uuid-123";

  describe("PUT - Refine Blueprint", () => {
    const validRefineData = {
      feedback: "Please add more details about the authentication system",
      updateType: "minor" as const,
    };

    const mockBlueprintDetails = {
      blueprint: {
        id: blueprintId,
        projectId: "project-uuid-456",
        version: 1,
        contentMarkdown: "# Sample Blueprint\n\nBasic project structure",
        structuredData: {
          status: "placeholder",
          projectName: "Test Project",
          userInput: "Create a test app",
        },
        marketResearch: null,
        createdAt: new Date(),
      },
      project: {
        id: "project-uuid-456",
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

    it("should successfully refine a blueprint with valid data", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validRefineData,
      });

      const mockDatabase = mockDbResponse(mockBlueprintDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.orderBy.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockBlueprintDetails]);
      mockDatabase.returning.mockResolvedValue([
        {
          id: "new-blueprint-uuid",
          projectId: mockBlueprintDetails.blueprint.projectId,
          version: 2,
          contentMarkdown: expect.stringContaining("## Refinement (Version 2)"),
          structuredData: expect.objectContaining({
            version: 2,
            lastRefinement: validRefineData.feedback,
            refinementType: validRefineData.updateType,
          }),
          marketResearch: null,
          createdAt: new Date(),
        },
      ]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validRefineData,
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        blueprintId: expect.any(String),
        version: 2,
        message: expect.stringContaining("refined successfully"),
      });
      expect(responseData.data.allVersions).toBeDefined();
    });

    it("should handle major update type refinement", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: { ...validRefineData, updateType: "major" as const },
      });

      const mockDatabase = mockDbResponse(mockBlueprintDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockBlueprintDetails]);
      mockDatabase.returning.mockResolvedValue([
        {
          id: "new-blueprint-uuid",
          projectId: mockBlueprintDetails.blueprint.projectId,
          version: 2,
          contentMarkdown: expect.stringContaining("**Type**: major"),
          structuredData: expect.objectContaining({
            refinementType: "major",
          }),
          marketResearch: null,
          createdAt: new Date(),
        },
      ]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        { ...validRefineData, updateType: "major" },
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.blueprint.structuredData.refinementType).toBe(
        "major",
      );
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validRefineData,
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
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
        error: "Feedback must be at least 10 characters",
      });

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        { feedback: "short", updateType: "minor" },
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it("should return 401 when blueprint not found or user lacks access", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validRefineData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // No blueprint found
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validRefineData,
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        "Blueprint not found or access denied",
      );
    });

    it("should handle database errors during refinement", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validRefineData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validRefineData,
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should increment version number correctly", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validRefineData,
      });

      const higherVersionDetails = {
        ...mockBlueprintDetails,
        blueprint: {
          ...mockBlueprintDetails.blueprint,
          version: 5, // Higher version number
        },
      };

      const mockDatabase = mockDbResponse(higherVersionDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([higherVersionDetails]);
      mockDatabase.returning.mockResolvedValue([
        {
          id: "new-blueprint-uuid",
          projectId: higherVersionDetails.blueprint.projectId,
          version: 6, // Should be version + 1
          contentMarkdown: expect.stringContaining("## Refinement (Version 6)"),
          structuredData: { version: 6 },
          marketResearch: null,
          createdAt: new Date(),
        },
      ]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validRefineData,
      ) as NextRequest;

      // Act
      const response = await PUT(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.data.allVersions).toBeDefined();
      expect(
        responseData.data.allVersions.data.structuredData.version,
      ).toBeGreaterThanOrEqual(6);
    });
  });

  describe("GET - Fetch Blueprint Details", () => {
    const mockBlueprintDetails = {
      blueprint: {
        id: blueprintId,
        projectId: "project-uuid-456",
        version: 2,
        contentMarkdown: "# Sample Blueprint\n\nDetailed project structure",
        structuredData: {
          status: "refined",
          projectName: "Test Project",
          userInput: "Create a test app",
        },
        marketResearch: null,
        createdAt: new Date(),
      },
      project: {
        id: "project-uuid-456",
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

    const allVersions = [
      {
        id: "blueprint-v1",
        projectId: "project-uuid-456",
        version: 1,
        contentMarkdown: "# Original Blueprint",
        structuredData: { version: 1 },
        marketResearch: null,
        createdAt: new Date(Date.now() - 86400000), // Yesterday
      },
      {
        id: blueprintId,
        projectId: "project-uuid-456",
        version: 2,
        contentMarkdown: "# Sample Blueprint",
        structuredData: { version: 2 },
        marketResearch: null,
        createdAt: new Date(),
      },
    ];

    it("should successfully fetch blueprint details with all versions", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(mockBlueprintDetails);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.orderBy.mockReturnValue(mockDatabase as any);
      mockDatabase.limit
        .mockResolvedValueOnce([mockBlueprintDetails]) // For blueprint details
        .mockResolvedValueOnce(allVersions); // For all versions
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        blueprint: {
          id: blueprintId,
          version: 2,
        },
        project: {
          id: "project-uuid-456",
          name: "Test Project",
        },
        message: "Blueprint details retrieved successfully",
      });
      expect(responseData.data.allVersions).toHaveLength(2);
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Authentication required");
    });

    it("should return 401 when blueprint not found or user lacks access", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // No blueprint found
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain(
        "Blueprint not found or access denied",
      );
    });

    it("should handle database errors during fetch", async () => {
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

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it("should handle blueprint with market research data", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const blueprintWithResearch = {
        ...mockBlueprintDetails,
        blueprint: {
          ...mockBlueprintDetails.blueprint,
          marketResearch: {
            trends: ["AI integration", "Cloud-native"],
            competition: ["Existing solutions"],
            gaps: ["Mobile support"],
          },
        },
      };

      const mockDatabase = mockDbResponse(blueprintWithResearch);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.orderBy.mockReturnValue(mockDatabase as any);
      mockDatabase.limit
        .mockResolvedValueOnce([blueprintWithResearch])
        .mockResolvedValueOnce([blueprintWithResearch.blueprint]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.blueprint.marketResearch).toBeDefined();
      expect(responseData.data.blueprint.marketResearch.trends).toContain(
        "AI integration",
      );
    });

    it("should handle fetching blueprint with structured data", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const blueprintWithComplexData = {
        ...mockBlueprintDetails,
        blueprint: {
          ...mockBlueprintDetails.blueprint,
          structuredData: {
            status: "refined",
            projectName: "Complex App",
            userInput: "Create a complex application",
            features: ["Authentication", "Database", "API"],
            techStack: ["Next.js", "PostgreSQL", "Redis"],
            version: 2,
          },
        },
      };

      const mockDatabase = mockDbResponse(blueprintWithComplexData);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.innerJoin.mockReturnValue(mockDatabase as any);
      mockDatabase.where.mockReturnValue(mockDatabase as any);
      mockDatabase.orderBy.mockReturnValue(mockDatabase as any);
      mockDatabase.limit
        .mockResolvedValueOnce([blueprintWithComplexData])
        .mockResolvedValueOnce([blueprintWithComplexData.blueprint]);
      mockDb.mockReturnValue(mockDatabase);

      const mockParams = Promise.resolve({ id: blueprintId });
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      ) as NextRequest;

      // Act
      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.blueprint.structuredData.features).toHaveLength(
        3,
      );
      expect(responseData.data.blueprint.structuredData.techStack).toContain(
        "Next.js",
      );
    });
  });
});
