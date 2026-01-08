/**
 * Blueprint Engine Test Suite
 *
 * Critical Business Logic Testing:
 * - Blueprint generation pipeline (multi-phase AI reasoning)
 * - Market research and data collection
 * - Blueprint refinement and versioning
 * - Cache operations and intelligent TTL management
 * - Pattern detection and categorization
 * - Database operations and data persistence
 *
 * Test Design Principles Applied:
 * - AAA Pattern: Arrange-Act-Assert structure
 * - Test Behavior Not Implementation: Verifying WHAT engine does, not HOW
 * - Meaningful Coverage: Covers critical paths with realistic scenarios
 * - Descriptive Test Names: Clear test names indicating scenario and expectation
 * - One Assertion Focus: Each test has focused, single-purpose assertions
 *
 * Business Impact Validated:
 * - Production-ready blueprint generation
 * - AI reasoning and validation accuracy
 * - Cache optimization and performance
 * - Data integrity and versioning
 */

// Mock env module before importing services
jest.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost/test",
    IFLOW_API_KEY: "test-iflow-key",
    TAVILY_API_KEY: "test-tavily-key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-publishable",
    CLERK_SECRET_KEY: "test-clerk-secret",
    STRIPE_SECRET_KEY: "test-stripe-secret",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "test-stripe-publishable",
    GITHUB_ACCESS_TOKEN: "test-github-token",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

import {
  blueprintEngine,
  BlueprintGenerationRequest,
  BlueprintGenerationResponse,
  BlueprintData,
  BlueprintRefinementRequest,
} from "../lib/services/blueprint-engine";

jest.mock("../lib/services/ai-service", () => ({
  aiService: {
    conductResearch: jest.fn(),
    generateCompletion: jest.fn(),
    getModels: jest.fn(() => ({
      reasoning: "test-reasoning-model",
      generation: "test-generation-model",
    })),
  },
}));
jest.mock("../lib/db");
jest.mock("../lib/services/cache-orchestrator");
jest.mock("../lib/services/ai-pattern-detector");
jest.mock("../lib/services/database-cache-service");
jest.mock("../lib/logger");

import { aiService } from "../lib/services/ai-service";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { UnifiedCacheManager } from "../lib/services/cache-orchestrator";
import { AIPatternDetector } from "../lib/services/ai-pattern-detector";
import DatabaseQueryCache from "../lib/services/database-cache-service";

describe("BlueprintEngine - Critical Business Logic", () => {
  let mockDb: any;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;

  const mockResearchResult = {
    answer: "Market analysis completed successfully",
    results: [
      {
        title: "Freelance Platform Trends",
        url: "https://example.com/trends",
        snippet: "Growing demand for developer platforms",
      },
    ],
  };

  const mockBlueprintData: BlueprintData = {
    projectName: "DevMarket",
    projectDescription: "A platform connecting developers with clients",
    techStack: {
      runtime: "Node.js 20+",
      framework: "Next.js 15",
      database: "PostgreSQL 16",
      auth: "Clerk",
      deployment: "Vercel",
    },
    features: [
      "Developer profiles",
      "Project marketplace",
      "Payment processing",
      "Rating system",
      "Messaging system",
    ],
    monetizationStrategy: "Freemium with 10% commission on transactions",
    architecture: {
      type: "Microservices",
      scaling: "Horizontal scaling with Kubernetes",
      security: ["OWASP compliance", "GDPR compliance", "Encryption"],
    },
  };

  beforeEach(() => {
    mockInsert = jest.fn().mockImplementation(() => ({
      values: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      }),
    }));

    mockSelect = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    mockUpdate = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    mockDelete = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    });

    mockDb = {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    };

    (db as jest.Mock).mockReturnValue(mockDb);

    (logger.info as jest.Mock).mockImplementation();
    (logger.warn as jest.Mock).mockImplementation();
    (logger.error as jest.Mock).mockImplementation();
    (logger.debug as jest.Mock).mockImplementation();
    (logger.security as jest.Mock).mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateBlueprint - Main Pipeline", () => {
    const mockRequest: BlueprintGenerationRequest = {
      userId: 1,
      input: "Build a SaaS marketplace for freelance developers",
      projectName: "DevMarket",
      projectDescription: "A platform connecting developers with clients",
    };

    beforeEach(() => {
      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: JSON.stringify(mockBlueprintData),
        })
        .mockResolvedValueOnce({ content: "VALID" });

      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(true);
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (UnifiedCacheManager.warmupPatternCache as jest.Mock).mockResolvedValue(
        true,
      );
      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });
      (DatabaseQueryCache.invalidateUserCache as jest.Mock).mockResolvedValue(
        true,
      );
    });

    test("should successfully generate blueprint through full pipeline", async () => {
      // Arrange
      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result: BlueprintGenerationResponse =
        await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(result.status).toBe("completed");
      expect(result.projectId).toBeDefined();
      expect(result.blueprintId).toBeDefined();
      expect(result.estimatedDuration).toBeGreaterThan(0);

      // Verify pipeline phases executed
      expect(aiService.conductResearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining("Market analysis"),
          maxResults: 15,
        }),
      );

      expect(aiService.generateCompletion).toHaveBeenCalledTimes(2); // Generation + validation

      expect(mockInsert).toHaveBeenCalledTimes(2); // Project + Blueprint

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint generation pipeline completed",
        expect.objectContaining({
          status: "completed",
        }),
      );
    });

    test("should use cached blueprint if available", async () => {
      // Arrange
      const cachedBlueprint = {
        blueprint: mockBlueprintData,
        research: mockResearchResult,
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(
        cachedBlueprint,
      );

      // Act
      const cached = await blueprintEngine.getCachedBlueprint("proj-1");

      // Assert
      expect(cached).toEqual(cachedBlueprint);
      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint retrieved from enhanced cache",
        expect.objectContaining({
          projectId: "proj-1",
        }),
      );
    });

    test("should handle market research failure gracefully", async () => {
      // Arrange
      (aiService.conductResearch as jest.Mock).mockRejectedValue(
        new Error("Research API unavailable"),
      );

      // Act & Assert
      await expect(
        blueprintEngine.generateBlueprint(mockRequest),
      ).rejects.toThrow("Research API unavailable");

      expect(logger.error).toHaveBeenCalledWith(
        "Phase 1: Market research failed",
        expect.objectContaining({
          error: "Research API unavailable",
        }),
      );
    });

    test("should handle blueprint generation failure", async () => {
      // Arrange
      (aiService.generateCompletion as jest.Mock).mockRejectedValue(
        new Error("AI generation failed"),
      );

      // Act & Assert
      await expect(
        blueprintEngine.generateBlueprint(mockRequest),
      ).rejects.toThrow("AI generation failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Blueprint generation pipeline failed",
        expect.objectContaining({
          error: "AI generation failed",
        }),
      );
    });

    test("should handle validation failure", async () => {
      // Arrange
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: JSON.stringify(mockBlueprintData),
        })
        .mockResolvedValueOnce({
          content: "CRITICISM: Tech stack is not scalable",
        });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      // Act & Assert
      await expect(
        blueprintEngine.generateBlueprint(mockRequest),
      ).rejects.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        "Blueprint validation identified issues",
        expect.objectContaining({
          projectName: "DevMarket",
        }),
      );
    });

    test("should create project record with proper status", async () => {
      // Arrange
      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 1,
          name: "DevMarket",
          status: "generating",
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Project record created",
        expect.objectContaining({
          projectId: expect.any(String),
        }),
      );
    });

    test("should warm up cache during generation", async () => {
      // Arrange
      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(UnifiedCacheManager.warmupPatternCache).toHaveBeenCalledWith(
        expect.arrayContaining(["marketplace"]),
      );

      expect(logger.debug).toHaveBeenCalledWith(
        "Blueprint cache warmed up with enhanced patterns",
        expect.objectContaining({
          patternsIdentified: expect.any(Number),
        }),
      );
    });

    test("should cache generated blueprint with intelligent TTL", async () => {
      // Arrange
      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        `blueprint-complete:${expect.any(String)}`,
        expect.any(Object), // cacheData object (flexible due to cachedAt field)
        expect.objectContaining({
          ttl: expect.any(Number),
          tags: expect.arrayContaining(["blueprint-complete", "marketplace"]),
        }),
      );
    });

    test("should invalidate user cache after blueprint creation", async () => {
      // Arrange
      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(DatabaseQueryCache.invalidateUserCache).toHaveBeenCalledWith(1);
    });

    test("should update project status to completed on success", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([]);
      mockUpdate.mockReturnValue({ where: mockWhere });

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      await blueprintEngine.generateBlueprint(mockRequest);

      // Assert - Check that update was called
      expect(mockUpdate).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint generation pipeline completed",
        expect.objectContaining({
          status: "completed",
        }),
      );
    });

    test("should handle missing project name gracefully", async () => {
      // Arrange
      const requestWithoutName: BlueprintGenerationRequest = {
        userId: 1,
        input: "Build a simple app",
      };

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result =
        await blueprintEngine.generateBlueprint(requestWithoutName);

      // Assert
      expect(result.status).toBe("completed");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Untitled Project",
        }),
      );
    });
  });

  describe("refineBlueprint - Versioning and Updates", () => {
    const mockRefineRequest: BlueprintRefinementRequest = {
      blueprintId: "bp-123",
      feedback: "Add mobile app support",
      updateType: "feature",
    };

    const mockCurrentBlueprint = {
      id: "bp-123",
      projectId: 1,
      version: 1,
      structuredData: JSON.stringify({
        projectName: "DevMarket",
        projectDescription: "A platform connecting developers",
        techStack: {
          runtime: "Node.js 20+",
          framework: "Next.js 15",
          database: "PostgreSQL 16",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Developer profiles", "Project marketplace"],
        monetizationStrategy: "Freemium model",
        architecture: {
          type: "Microservices",
          scaling: "Horizontal",
          security: ["OWASP compliance"],
        },
      }),
      marketResearch: JSON.stringify(mockResearchResult),
    };

    const mockUpdatedBlueprint = {
      projectName: "DevMarket",
      projectDescription: "A platform connecting developers",
      techStack: {
        runtime: "Node.js 20+",
        framework: "Next.js 15",
        database: "PostgreSQL 16",
        auth: "Clerk",
        deployment: "Vercel",
      },
      features: ["Developer profiles", "Project marketplace", "Mobile app"],
      monetizationStrategy: "Freemium model",
      architecture: {
        type: "Microservices",
        scaling: "Horizontal",
        security: ["OWASP compliance"],
      },
    };

    beforeEach(() => {
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: JSON.stringify(mockUpdatedBlueprint),
        })
        .mockResolvedValueOnce({ content: "VALID" });

      (
        DatabaseQueryCache.invalidateBlueprintCache as jest.Mock
      ).mockResolvedValue(true);
      (UnifiedCacheManager.invalidateByTag as jest.Mock).mockResolvedValue(
        true,
      );
    });

    test("should successfully refine blueprint with new version", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-124" }]),
      });

      // Act
      await blueprintEngine.refineBlueprint(mockRefineRequest);

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 2, // Previous version + 1
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint refinement completed",
        expect.objectContaining({
          blueprintId: "bp-123",
          newVersion: 2,
          updateType: "feature",
        }),
      );
    });

    test("should throw error when blueprint not found", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([]);
      mockSelect.mockReturnValue({ where: mockWhere });

      // Act & Assert
      await expect(
        blueprintEngine.refineBlueprint(mockRefineRequest),
      ).rejects.toThrow("Blueprint not found");

      expect(logger.error).toHaveBeenCalledWith(
        "Blueprint refinement failed",
        expect.objectContaining({
          error: "Blueprint not found",
        }),
      );
    });

    test("should handle tech stack refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-124" }]),
      });

      const techRefineRequest: BlueprintRefinementRequest = {
        ...mockRefineRequest,
        updateType: "tech",
        feedback: "Switch to MongoDB",
      };

      // Act
      await blueprintEngine.refineBlueprint(techRefineRequest);

      // Assert
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Focus on updating the tech stack"),
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint refinement completed",
        expect.objectContaining({
          updateType: "tech",
        }),
      );
    });

    test("should handle architecture refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-124" }]),
      });

      const archRefineRequest: BlueprintRefinementRequest = {
        ...mockRefineRequest,
        updateType: "architecture",
        feedback: "Improve security",
      };

      // Act
      await blueprintEngine.refineBlueprint(archRefineRequest);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint refinement completed",
        expect.objectContaining({
          updateType: "architecture",
        }),
      );
    });

    test("should handle monetization refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-124" }]),
      });

      const monetizationRefineRequest: BlueprintRefinementRequest = {
        ...mockRefineRequest,
        updateType: "monetization",
        feedback: "Add subscription tier",
      };

      // Act
      await blueprintEngine.refineBlueprint(monetizationRefineRequest);

      // Assert
      expect(aiService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("monetization strategy"),
        }),
      );
    });

    test("should invalidate blueprint cache after refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-124" }]),
      });

      // Act
      await blueprintEngine.refineBlueprint(mockRefineRequest);

      // Assert
      expect(DatabaseQueryCache.invalidateBlueprintCache).toHaveBeenCalledWith(
        "bp-123",
      );

      expect(UnifiedCacheManager.invalidateByTag).toHaveBeenCalledWith(
        "web-app",
      );
    });

    test("should handle AI generation failure during refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      (aiService.generateCompletion as jest.Mock).mockRejectedValue(
        new Error("AI service unavailable"),
      );

      // Act & Assert
      await expect(
        blueprintEngine.refineBlueprint(mockRefineRequest),
      ).rejects.toThrow("AI service unavailable");

      expect(logger.error).toHaveBeenCalledWith(
        "Blueprint refinement failed",
        expect.objectContaining({
          error: "AI service unavailable",
        }),
      );
    });

    test("should handle validation failure during refinement", async () => {
      // Arrange
      const mockWhere = jest.fn().mockResolvedValue([mockCurrentBlueprint]);
      mockSelect.mockReturnValue({ where: mockWhere });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: JSON.stringify(mockUpdatedBlueprint),
        })
        .mockResolvedValueOnce({
          content: "CRITICISM: Changes break production readiness",
        });

      // Act & Assert
      await expect(
        blueprintEngine.refineBlueprint(mockRefineRequest),
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        "Blueprint refinement failed",
        expect.objectContaining({
          blueprintId: "bp-123",
        }),
      );
    });
  });

  describe("getUserBlueprintStats - Statistics Calculation", () => {
    test("should calculate user blueprint statistics correctly", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { id: 1, status: "completed", createdAt: new Date() },
          { id: 2, status: "completed", createdAt: new Date() },
          { id: 3, status: "generating", createdAt: new Date() },
        ]),
      });

      // Act
      const stats = await blueprintEngine.getUserBlueprintStats(1);

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.generating).toBe(1);
      expect(stats.avgGenerationTime).toBe(0);

      expect(logger.debug).toHaveBeenCalledWith(
        "User blueprint stats from cache",
        { userId: 1 },
      );
    });

    test("should use cached stats if available", async () => {
      // Arrange
      const cachedStats = {
        total: 5,
        completed: 4,
        generating: 1,
        avgGenerationTime: 1200,
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(cachedStats);

      // Act
      const stats = await blueprintEngine.getUserBlueprintStats(1);

      // Assert
      expect(stats).toEqual(cachedStats);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    test("should handle database error and return defaults", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      mockSelect.mockReturnValue({
        where: jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      });

      // Act
      const stats = await blueprintEngine.getUserBlueprintStats(1);

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.generating).toBe(0);
      expect(stats.avgGenerationTime).toBe(0);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get user blueprint stats",
        expect.objectContaining({
          error: "Database connection failed",
        }),
      );
    });

    test("should cache statistics after calculation", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      mockSelect.mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValue([
            { id: 1, status: "completed", createdAt: new Date() },
          ]),
      });

      // Act
      await blueprintEngine.getUserBlueprintStats(1);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        `user-blueprint-stats:1`,
        expect.objectContaining({
          total: 1,
          completed: 1,
        }),
        expect.objectContaining({
          ttl: 600,
          tags: expect.arrayContaining(["user-stats", "user-1"]),
        }),
      );
    });
  });

  describe("getCachedBlueprint - Cache Retrieval", () => {
    test("should return null when cache miss", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await blueprintEngine.getCachedBlueprint("nonexistent");

      // Assert
      expect(result).toBeNull();
    });

    test("should handle cache error gracefully", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockRejectedValue(
        new Error("Cache service unavailable"),
      );

      // Act
      const result = await blueprintEngine.getCachedBlueprint("bp-123");

      // Assert
      expect(result).toBeNull();

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to retrieve cached blueprint",
        expect.objectContaining({
          error: "Cache service unavailable",
        }),
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle empty input string", async () => {
      // Arrange
      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: "",
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({ content: JSON.stringify(mockBlueprintData) })
        .mockResolvedValueOnce({ content: "VALID" });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      // Act & Assert
      const result = await blueprintEngine.generateBlueprint(mockRequest);

      expect(result.status).toBe("completed");
    });

    test("should handle very long input", async () => {
      // Arrange
      const longInput = "Build " + "a platform ".repeat(100);

      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: longInput,
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({ content: JSON.stringify(mockBlueprintData) })
        .mockResolvedValueOnce({ content: "VALID" });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(result.status).toBe("completed");
    });

    test("should handle malformed JSON in AI response", async () => {
      // Arrange
      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: "Test",
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock).mockResolvedValue({
        content: "This is not JSON",
      });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      // Act & Assert
      await expect(
        blueprintEngine.generateBlueprint(mockRequest),
      ).rejects.toThrow();
    });

    test("should handle missing required fields in blueprint", async () => {
      // Arrange
      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: "Test",
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );

      const incompleteBlueprint = {
        projectName: "Test",
        // Missing required fields
      };

      (aiService.generateCompletion as jest.Mock).mockResolvedValue({
        content: JSON.stringify(incompleteBlueprint),
      });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      // Act & Assert
      await expect(
        blueprintEngine.generateBlueprint(mockRequest),
      ).rejects.toThrow();
    });

    test("should handle cache warmup failure gracefully", async () => {
      // Arrange
      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: "Test",
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({ content: JSON.stringify(mockBlueprintData) })
        .mockResolvedValueOnce({ content: "VALID" });

      (UnifiedCacheManager.warmupPatternCache as jest.Mock).mockRejectedValue(
        new Error("Cache warmup failed"),
      );

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await blueprintEngine.generateBlueprint(mockRequest);

      // Assert
      expect(result.status).toBe("completed");

      expect(logger.debug).toHaveBeenCalledWith(
        "Cache warmup failed (non-critical)",
        expect.objectContaining({
          error: "Cache warmup failed",
        }),
      );
    });
  });

  describe("Integration Tests - End-to-End Workflows", () => {
    test("should complete full blueprint generation and refinement workflow", async () => {
      // Arrange - Generate
      const mockRequest: BlueprintGenerationRequest = {
        userId: 1,
        input: "Build a SaaS platform",
        projectName: "SaaSify",
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(
        mockResearchResult,
      );
      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({ content: JSON.stringify(mockBlueprintData) })
        .mockResolvedValueOnce({ content: "VALID" });

      mockInsert.mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValue([
            { id: 1, projectId: "proj-1", blueprintId: "bp-1" },
          ]),
      });

      mockSelect.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      // Act - Generate
      const genResult = await blueprintEngine.generateBlueprint(mockRequest);

      // Assert - Generate
      expect(genResult.status).toBe("completed");

      // Arrange - Refine
      const mockWhere = jest.fn().mockResolvedValue([
        {
          id: "bp-1",
          projectId: 1,
          version: 1,
          structuredData: JSON.stringify(mockBlueprintData),
          marketResearch: JSON.stringify(mockResearchResult),
        },
      ]);

      mockSelect.mockReturnValue({ where: mockWhere });

      mockInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "bp-2" }]),
      });

      const refineRequest: BlueprintRefinementRequest = {
        blueprintId: "bp-1",
        feedback: "Add analytics feature",
        updateType: "feature",
      };

      // Act - Refine
      await blueprintEngine.refineBlueprint(refineRequest);

      // Assert - Refine
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 2,
        }),
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint refinement completed",
        expect.objectContaining({
          newVersion: 2,
        }),
      );
    });

    test("should maintain data integrity across cache operations", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue({
        blueprint: mockBlueprintData,
        research: mockResearchResult,
      });

      // Act
      const cached = await blueprintEngine.getCachedBlueprint("bp-1");

      // Assert
      expect(cached?.blueprint).toEqual(mockBlueprintData);
      expect(cached?.research).toEqual(mockResearchResult);

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint retrieved from enhanced cache",
        expect.objectContaining({
          cacheType: "unified-cache",
        }),
      );
    });
  });
});
