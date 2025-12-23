import { jest } from "@jest/globals";
import { PUT, GET } from "@/app/api/blueprints/[id]/route";
import { mockUser, mockDbResponse, createTestRequest } from "./helpers";

// Mock blueprint engine
jest.mock("@/lib/services/blueprint-engine");
import { blueprintEngine } from "@/lib/services/blueprint-engine";

const mockBlueprintEngine = blueprintEngine as jest.Mocked<
  typeof blueprintEngine
>;

describe("Blueprint [id] API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (
      require("@clerk/nextjs/server").currentUser as jest.Mock
    ).mockResolvedValue(mockUser);

    mockBlueprintEngine.refineBlueprint.mockResolvedValue({
      success: true,
      blueprintId: "test-blueprint-456",
      version: 2,
    });
  });

  describe("PUT /api/blueprints/[id]", () => {
    const validPayload = {
      feedback:
        "Please add mobile app support and improve the monetization strategy",
      updateType: "feature" as const,
    };

    it("should refine blueprint successfully with valid feedback", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const mockBlueprint = {
        id: blueprintId,
        projectId: "project-123",
        version: 1,
        contentMarkdown: "Initial blueprint content",
        structuredData: {},
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-123",
        name: "SneakerMarket",
        description: "Marketplace for rare sneakers",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          blueprint: mockBlueprint,
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock the initial query to check ownership
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            blueprint: mockBlueprint,
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock the refined blueprint query
      const refinedBlueprint = { ...mockBlueprint, version: 2 };
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([refinedBlueprint]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validPayload,
      );

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        blueprint: refinedBlueprint,
        project: mockProject,
        blueprintId: refinedBlueprint.id,
        version: 2,
        message: expect.stringContaining("refined successfully"),
      });

      // Verify blueprint engine was called
      expect(mockBlueprintEngine.refineBlueprint).toHaveBeenCalledWith({
        blueprintId,
        feedback: validPayload.feedback,
        updateType: validPayload.updateType,
      });
    });

    it("should reject requests for blueprints not owned by user", async () => {
      // Arrange
      const blueprintId = "blueprint-999";
      const mockDb = mockDbResponse([]); // Empty result = not found

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validPayload,
      );

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("Blueprint not found or access denied");

      // Verify blueprint engine was not called
      expect(mockBlueprintEngine.refineBlueprint).not.toHaveBeenCalled();
    });

    it("should reject invalid feedback payload", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const invalidPayload = {
        feedback: "short", // Too short (< 10 chars)
        updateType: "invalid" as any, // Invalid enum value
      };

      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        invalidPayload,
      );

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.validationErrors).toBeDefined();
    });

    it("should handle blueprint engine failures gracefully", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const mockBlueprint = {
        id: blueprintId,
        projectId: "project-123",
        version: 1,
        contentMarkdown: "Initial blueprint content",
        structuredData: {},
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-123",
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          blueprint: mockBlueprint,
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
            blueprint: mockBlueprint,
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock blueprint engine failure
      mockBlueprintEngine.refineBlueprint.mockRejectedValue(
        new Error("AI service unavailable"),
      );

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        validPayload,
      );

      // Act
      const response = await PUT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should accept all valid update types", async () => {
      const validUpdateTypes = [
        "feature",
        "tech",
        "architecture",
        "monetization",
      ] as const;

      // Arrange
      const blueprintId = "blueprint-123";
      const mockBlueprint = {
        id: blueprintId,
        projectId: "project-123",
        version: 1,
        contentMarkdown: "Initial blueprint content",
        structuredData: {},
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-123",
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb({}));

      // Test each update type
      for (const updateType of validUpdateTypes) {
        jest.clearAllMocks();

        const payload = {
          feedback:
            "This is valid feedback that is long enough to pass validation",
          updateType,
        };

        const mockDb = mockDbResponse([
          {
            blueprint: mockBlueprint,
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
              blueprint: mockBlueprint,
              project: mockProject,
              user: mockUser,
            },
          ]),
        );

        const refinedBlueprint = { ...mockBlueprint, version: 2 };
        mockDb.select.mockReturnValue(mockDb);
        mockDb.from.mockReturnValue(mockDb);
        mockDb.where.mockReturnValue(mockDb);
        mockDb.orderBy.mockReturnValue(Promise.resolve([refinedBlueprint]));

        (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

        const request = createTestRequest(
          "PUT",
          `/api/blueprints/${blueprintId}`,
          payload,
        );

        // Act
        const response = await PUT(request);

        // Assert
        expect(response.status).toBe(200);
        expect(mockBlueprintEngine.refineBlueprint).toHaveBeenCalledWith({
          blueprintId,
          feedback: payload.feedback,
          updateType,
        });
      }
    });
  });

  describe("GET /api/blueprints/[id]", () => {
    it("should fetch blueprint details with all versions", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const mockBlueprint = {
        id: blueprintId,
        projectId: "project-123",
        version: 2,
        contentMarkdown: "Latest blueprint content",
        structuredData: { tech: ["React", "Node.js"] },
        marketResearch: { marketSize: "Large" },
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-123",
        name: "SneakerMarket",
        description: "Marketplace for rare sneakers",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const allVersions = [
        { ...mockBlueprint, version: 1, contentMarkdown: "Initial content" },
        { ...mockBlueprint, version: 2, contentMarkdown: "Updated content" },
      ];

      const mockDb = mockDbResponse([
        {
          blueprint: mockBlueprint,
          project: mockProject,
          user: mockUser,
        },
      ]);

      // Mock the main query
      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(
        Promise.resolve([
          {
            blueprint: mockBlueprint,
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock the versions query
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve(allVersions));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        blueprint: mockBlueprint,
        project: mockProject,
        allVersions: allVersions,
        message: expect.stringContaining("retrieved successfully"),
      });
    });

    it("should reject requests for blueprints not owned by user", async () => {
      // Arrange
      const blueprintId = "blueprint-999";
      const mockDb = mockDbResponse([]);

      const mockQuery = mockDb.select.mockReturnValue(mockDb);
      mockQuery.from.mockReturnValue(mockDb);
      mockQuery.innerJoin.mockReturnValue(mockDb);
      mockQuery.where.mockReturnValue(mockDb);
      mockQuery.limit.mockReturnValue(Promise.resolve([]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain("Blueprint not found or access denied");
    });

    it("should handle blueprint with no versions history", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const mockBlueprint = {
        id: blueprintId,
        projectId: "project-123",
        version: 1,
        contentMarkdown: "Initial blueprint content",
        structuredData: {},
        marketResearch: {},
        createdAt: new Date(),
      };

      const mockProject = {
        id: "project-123",
        name: "SneakerMarket",
        status: "completed",
        ownerId: 1,
        createdAt: new Date(),
      };

      const mockDb = mockDbResponse([
        {
          blueprint: mockBlueprint,
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
            blueprint: mockBlueprint,
            project: mockProject,
            user: mockUser,
          },
        ]),
      );

      // Mock versions query to return only current version
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(Promise.resolve([mockBlueprint]));

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.allVersions).toHaveLength(1);
      expect(data.allVersions[0].id).toBe(blueprintId);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const blueprintId = "blueprint-123";
      const mockDb = mockDbResponse([]);

      const mockQuery = mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      (require("@/lib/db").db as jest.Mock).mockReturnValue(mockDb);

      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      );

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("Authentication & Authorization", () => {
    it("should reject unauthenticated PUT requests", async () => {
      // Arrange
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const blueprintId = "blueprint-123";
      const request = createTestRequest(
        "PUT",
        `/api/blueprints/${blueprintId}`,
        {
          feedback: "This is valid feedback that is long enough",
          updateType: "feature" as const,
        },
      );

      // Act
      const response = await PUT(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it("should reject unauthenticated GET requests", async () => {
      // Arrange
      const { currentUser } = require("@clerk/nextjs/server");
      currentUser.mockResolvedValue(null);

      const blueprintId = "blueprint-123";
      const request = createTestRequest(
        "GET",
        `/api/blueprints/${blueprintId}`,
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
