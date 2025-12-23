import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/blueprints/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { validateRequest, ValidationError } from "@/lib/api-utils";
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

describe("/api/blueprints", () => {
  describe("POST - Blueprint Generation", () => {
    const validBlueprintData = {
      input: "Create a marketplace for rare sneakers",
      projectName: "SneakerMarketplace",
    };

    it("should successfully create a blueprint with valid data and sufficient credits", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validBlueprintData,
      });

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 5,
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-uuid",
        ownerId: 1,
        name: validBlueprintData.projectName,
        description: `AI-generated blueprint: ${validBlueprintData.input.substring(0, 100)}...`,
        status: "generating",
        createdAt: new Date(),
      };

      const mockBlueprint = {
        id: "blueprint-uuid",
        projectId: mockProject.id,
        version: 1,
        contentMarkdown: `# Placeholder Blueprint\n\nProject: ${validBlueprintData.projectName}\nInput: ${validBlueprintData.input}\n\n*This blueprint will be enhanced with AI-generated content in Phase 3.*`,
        structuredData: {
          status: "placeholder",
          projectName: validBlueprintData.projectName,
          userInput: validBlueprintData.input,
          phase: "pre-ai-integration",
        },
        marketResearch: null,
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.insert.mockReturnValue(mockDatabase as any);
      mockDatabase.update.mockReturnValue(mockDatabase as any);
      mockDb.mockReturnValue(mockDatabase);

      // Mock the chained calls
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.returning
        .mockResolvedValueOnce([mockProject]) // For project creation
        .mockResolvedValueOnce([mockBlueprint]); // For blueprint creation

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validBlueprintData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        projectId: mockProject.id,
        blueprintId: mockBlueprint.id,
        status: "generating",
      });
      expect(mockCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockValidateRequest).toHaveBeenCalledTimes(1);
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validBlueprintData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Authentication required");
    });

    it("should return 429 when rate limit is exceeded", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validBlueprintData,
      });

      // Mock rate limiter to reject
      const { RateLimiter } = require("@/lib/api-utils");
      const mockRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });
      RateLimiter.mockReturnValue(mockRateLimit);

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validBlueprintData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Rate limit exceeded");
    });

    it("should return 400 when input validation fails", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: false,
        error: "Input must be at least 10 characters",
      });

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it("should return 400 when user has insufficient credits", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validBlueprintData,
      });

      const mockUserRecord = {
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 0, // No credits
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validBlueprintData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("Insufficient credits");
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);
      mockValidateRequest.mockResolvedValue({
        success: true,
        data: validBlueprintData,
      });

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validBlueprintData,
      ) as NextRequest;

      // Act
      const response = await POST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });
  });

  describe("GET - Fetch User Projects", () => {
    it("should successfully fetch user projects", async () => {
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

      const mockProjects = [
        {
          id: "project-1",
          ownerId: 1,
          name: "Project 1",
          description: "Description 1",
          status: "completed",
          createdAt: new Date(),
        },
        {
          id: "project-2",
          ownerId: 1,
          name: "Project 2",
          description: "Description 2",
          status: "draft",
          createdAt: new Date(),
        },
      ];

      const mockDatabase = mockDbResponse(mockUserRecord);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([mockUserRecord]);
      mockDatabase.orderBy.mockResolvedValue(mockProjects);
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "GET",
        "/api/blueprints",
      ) as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.projects).toHaveLength(2);
      expect(responseData.data.credits).toBe(5);
    });

    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);
      const request = createTestRequest(
        "GET",
        "/api/blueprints",
      ) as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
    });

    it("should return 401 when user record not found", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const mockDatabase = mockDbResponse(null);
      mockDatabase.select.mockReturnValue(mockDatabase as any);
      mockDatabase.limit.mockResolvedValue([]); // Empty result
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "GET",
        "/api/blueprints",
      ) as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain("User not found");
    });

    it("should handle empty projects list", async () => {
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
      mockDatabase.orderBy.mockResolvedValue([]); // Empty projects
      mockDb.mockReturnValue(mockDatabase);

      const request = createTestRequest(
        "GET",
        "/api/blueprints",
      ) as NextRequest;

      // Act
      const response = await GET(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.projects).toHaveLength(0);
    });
  });
});
