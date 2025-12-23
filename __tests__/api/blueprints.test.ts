import { jest } from "@jest/globals";
import { POST, GET } from "@/app/api/blueprints/route";
import { mockUser, mockDbResponse, createTestRequest } from "./helpers";

// Mock services
jest.mock("@/lib/services/user-service");
jest.mock("@/lib/services/blueprint-engine");

import { UserService } from "@/lib/services/user-service";
import { blueprintEngine } from "@/lib/services/blueprint-engine";

const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockBlueprintEngine = blueprintEngine as jest.Mocked<
  typeof blueprintEngine
>;

describe("Blueprint API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUserService.getUserByClerkId.mockResolvedValue({
      id: 1,
      clerkId: mockUser.id,
      email: mockUser.email,
      credits: 5,
      subscriptionTier: "free",
    });

    mockBlueprintEngine.generateBlueprint.mockResolvedValue({
      projectId: "test-project-123",
      blueprintId: "test-blueprint-456",
      status: "completed",
      estimatedDuration: 5000,
    });
  });

  describe("POST /api/blueprints", () => {
    const validPayload = {
      input: "I want to build a marketplace for rare sneakers",
      projectName: "SneakerMarket",
    };

    it("should generate blueprint successfully with valid input and sufficient credits", async () => {
      // Arrange
      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validPayload,
      );
      const mockDb = mockDbResponse([]);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        projectId: "test-project-123",
        blueprintId: "test-blueprint-456",
        status: "completed",
        estimatedDuration: 5000,
        message: expect.stringContaining("successfully generated"),
      });

      // Verify service interactions
      expect(mockUserService.getUserByClerkId).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockBlueprintEngine.generateBlueprint).toHaveBeenCalledWith({
        userId: 1,
        input: validPayload.input,
        projectName: validPayload.projectName,
        projectDescription: expect.stringContaining("AI-generated blueprint"),
      });
      expect(mockUserService.updateUserCredits).toHaveBeenCalledWith(
        1,
        -1,
        expect.any(Object),
      );
    });

    it("should reject requests with insufficient credits", async () => {
      // Arrange
      mockUserService.getUserByClerkId.mockResolvedValue({
        id: 1,
        clerkId: mockUser.id,
        email: mockUser.email,
        credits: 0,
        subscriptionTier: "free",
      });

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validPayload,
      );
      const mockDb = mockDbResponse([]);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(402);
      expect(data.error).toContain("Insufficient credits");
    });

    it("should reject invalid input payload", async () => {
      // Arrange
      const invalidPayload = {
        input: "short", // Too short (< 10 chars)
        projectName: "ab", // Too short (< 3 chars)
      };

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        invalidPayload,
      );

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    it("should handle blueprint engine failures gracefully", async () => {
      // Arrange
      mockBlueprintEngine.generateBlueprint.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validPayload,
      );
      const mockDb = mockDbResponse([]);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();

      // Verify credits were not deducted on failure
      expect(mockUserService.updateUserCredits).not.toHaveBeenCalled();
    });

    it("should enforce rate limiting", async () => {
      // Arrange
      const request = createTestRequest(
        "POST",
        "/api/blueprints",
        validPayload,
      );
      const mockDb = mockDbResponse([]);

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Mock rate limiter to exceed limit
      (require("@/lib/api-utils").RateLimiter as jest.Mock).mockReturnValue(
        jest.fn().mockResolvedValue(false), // Rate limited
      );

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(429);
    });
  });

  describe("GET /api/blueprints", () => {
    it("should fetch user projects with blueprint counts", async () => {
      // Arrange
      const mockProjects = [
        {
          id: "project-1",
          name: "SneakerMarket",
          description: "Marketplace for rare sneakers",
          status: "completed",
          ownerId: 1,
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "project-2",
          name: "FoodDelivery",
          description: "Local food delivery app",
          status: "draft",
          ownerId: 1,
          createdAt: new Date("2024-01-02"),
        },
      ];

      const mockDb = mockDbResponse(mockProjects);

      // Mock database queries
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve(mockProjects));

      // Mock blueprint count queries
      const mockCountQuery = mockDbResponse([{ count: 2 }, { count: 0 }]);
      mockDb.select.mockReturnValue(mockCountQuery);
      mockCountQuery.from.mockReturnValue(mockCountQuery);
      mockCountQuery.where.mockReturnValue(Promise.resolve([{ count: 2 }]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", "/api/blueprints");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        projects: expect.any(Array),
        credits: 5,
        subscriptionTier: "free",
      });
      expect(data.projects).toHaveLength(2);
    });

    it("should return empty array for users with no projects", async () => {
      // Arrange
      const mockDb = mockDbResponse([]);

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", "/api/blueprints");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.projects).toEqual([]);
      expect(data.credits).toBe(5);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const mockDb = mockDbResponse([]);
      mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest("GET", "/api/blueprints");

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated requests", async () => {
      // Arrange - Mock no authenticated user
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const request = createTestRequest("POST", "/api/blueprints", {
        input: "I want to build a marketplace",
        projectName: "TestProject",
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it("should allow authenticated requests with valid user", async () => {
      // Arrange - Mock authenticated user
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(mockUser);

      const request = createTestRequest("POST", "/api/blueprints", {
        input: "I want to build a marketplace for rare sneakers",
        projectName: "SneakerMarket",
      });

      const mockDb = mockDbResponse([]);
      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
