/**
 * BlueprintFabricationService Test Suite
 *
 * Critical Business Logic Testing:
 * - Blueprint caching with pattern-based TTL
 * - Cache retrieval with pattern-aware keys
 * - User statistics with caching fallback
 * - Pattern detection integration
 * - Cache invalidation strategy
 * - Error handling (graceful degradation)
 * - Blueprint type extraction logic
 * - TTL calculation based on AI patterns
 */

import {
  blueprintFabricationService,
  type BlueprintCachingRequest,
  type UserStatsRequest,
  type UserStatsResponse,
  type CachedBlueprintResponse,
} from "@/lib/services/blueprint-fabrication-service";
import type { BlueprintData } from "@/lib/services/blueprint-generation-service";
import type { ResearchResult } from "@/lib/services/ai-service";
import type { AIPattern } from "@/lib/services/ai-pattern-detector";

jest.mock("@/lib/services/cache-orchestrator", () => ({
  UnifiedCacheManager: {
    setData: jest.fn(),
    getData: jest.fn(),
  },
}));

jest.mock("@/lib/services/ai-pattern-detector", () => ({
  AIPatternDetector: {
    detectPattern: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

let mockDbInstance: any = null;
jest.mock("../../lib/db", () => ({
  db: jest.fn().mockImplementation(() => mockDbInstance),
}));

import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { AIPatternDetector } from "@/lib/services/ai-pattern-detector";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

const createMockBlueprint = (overrides?: Partial<BlueprintData>): BlueprintData => ({
  projectName: "Test Marketplace",
  description: "A test marketplace for sneakers",
  techStack: {
    framework: "Next.js",
    database: "PostgreSQL",
    language: "TypeScript",
  },
  features: [
    "User authentication",
    "Product listings",
    "Marketplace functionality",
    "Payment processing",
  ],
  architecture: {
    type: "microservices",
    style: "event-driven",
  },
  monetization: {
    model: "commission",
    revenueModel: "5% commission per transaction",
  },
  deployment: {
    platform: "Vercel",
    hosting: "Serverless",
  },
  ...overrides,
});

const createMockResearch = (overrides?: Partial<ResearchResult>): ResearchResult => ({
  searchQuery: "sneaker marketplace",
  searchResults: [],
  marketGap: "Missing niche marketplace",
  summary: "Research summary",
  ...overrides,
});

const createMockDb = () => {
  const mockWhere = jest.fn().mockResolvedValue([
    {
      id: "project-1",
      status: "completed",
      createdAt: new Date("2024-01-01T10:00:00Z"),
    },
    {
      id: "project-2",
      status: "generating",
      createdAt: new Date("2024-01-02T10:00:00Z"),
    },
    {
      id: "project-3",
      status: "draft",
      createdAt: new Date("2024-01-03T10:00:00Z"),
    },
  ]);

  const mockFrom = jest.fn().mockReturnValue({
    where: mockWhere,
  });

  const mockSelect = jest.fn().mockReturnValue({
    from: mockFrom,
  });

  return {
    select: mockSelect,
  };
};

describe("BlueprintFabricationService - Critical Business Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("cacheBlueprint - Blueprint Caching", () => {
    it("should cache complete blueprint with pattern-based TTL", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          projectName: "E-commerce Platform",
          features: ["Payment processing", "Product listings"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "ecommerce",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.objectContaining({
          blueprint: request.blueprint,
          research: request.research,
          projectId: "project-123",
        }),
        expect.objectContaining({
          ttl: 8640, // 7200 * 1.2 (ecommerce multiplier)
          tags: expect.arrayContaining([
            "blueprint-complete",
            "project-project-123",
            "ecommerce",
          ]),
        }),
      );
    });

    it("should cache skeleton blueprint with longer TTL", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.85,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-skeleton:Test Marketplace:marketplace",
        expect.objectContaining({
          techStack: request.blueprint.techStack,
          features: request.blueprint.features,
          architecture: request.blueprint.architecture,
        }),
        expect.objectContaining({
          ttl: 14400, // 4 hours for skeleton cache
          tags: expect.arrayContaining(["blueprint-skeleton", "marketplace"]),
        }),
      );
    });

    it("should use default TTL when no pattern detected", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: null,
        confidence: 0,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 7200, // Default TTL
        }),
      );
    });

    it("should apply fintech pattern multiplier (2.0x)", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          projectName: "Banking Platform",
          features: ["Payments", "Transfers"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "fintech",
        confidence: 0.95,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 14400, // 7200 * 2.0 (fintech multiplier)
        }),
      );
    });

    it("should apply healthcare pattern multiplier (1.8x)", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          projectName: "Health Records",
          features: ["Patient data", "HIPAA compliance"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "healthcare",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 12960, // 7200 * 1.8 (healthcare multiplier)
        }),
      );
    });

    it("should apply dashboard pattern multiplier (0.8x)", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          projectName: "Analytics Dashboard",
          features: ["Charts", "Data visualization", "Analytics"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "dashboard",
        confidence: 0.8,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 5760, // 7200 * 0.8 (dashboard multiplier - shorter cache)
        }),
      );
    });

    it("should handle cache failures gracefully (non-critical)", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (UnifiedCacheManager.setData as jest.Mock).mockRejectedValue(
        new Error("Cache connection failed"),
      );

      // Act
      await expect(
        blueprintFabricationService.cacheBlueprint(request),
      ).resolves.not.toThrow();

      // Assert - should log debug message but not throw
      expect(logger.debug).toHaveBeenCalledWith(
        "Blueprint caching failed (non-critical)",
        expect.objectContaining({
          error: "Cache connection failed",
          projectId: "project-123",
        }),
      );
    });

    it("should log successful blueprint caching", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);
      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint cached for quick retrieval",
        expect.objectContaining({
          projectId: "project-123",
          projectName: "Test Marketplace",
          blueprintType: "marketplace",
        }),
      );
    });
  });

  describe("getCachedBlueprint - Cache Retrieval", () => {
    it("should retrieve cached blueprint successfully", async () => {
      // Arrange
      const projectId = "project-123";
      const cachedData = {
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
        projectId,
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(cachedData);

      // Act
      const result = await blueprintFabricationService.getCachedBlueprint(
        projectId,
      );

      // Assert
      expect(result).toEqual({
        blueprint: cachedData.blueprint,
        research: cachedData.research,
      });
      expect(UnifiedCacheManager.getData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.objectContaining({
          tags: expect.arrayContaining([
            "blueprint",
            "complete",
            "project-project-123",
          ]),
        }),
      );
    });

    it("should return null when cache miss occurs", async () => {
      // Arrange
      const projectId = "project-123";
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await blueprintFabricationService.getCachedBlueprint(
        projectId,
      );

      // Assert
      expect(result).toBeNull();
    });

    it("should handle cache retrieval errors gracefully", async () => {
      // Arrange
      const projectId = "project-123";
      (UnifiedCacheManager.getData as jest.Mock).mockRejectedValue(
        new Error("Cache read error"),
      );

      // Act
      const result = await blueprintFabricationService.getCachedBlueprint(
        projectId,
      );

      // Assert
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to retrieve cached blueprint",
        expect.objectContaining({
          error: "Cache read error",
          projectId: "project-123",
        }),
      );
    });

    it("should log successful cache retrieval", async () => {
      // Arrange
      const projectId = "project-123";
      const cachedData = {
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
        projectId,
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(cachedData);

      // Act
      await blueprintFabricationService.getCachedBlueprint(projectId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint retrieved from enhanced cache",
        expect.objectContaining({
          projectId: "project-123",
          cacheType: "unified-cache",
        }),
      );
    });
  });

  describe("getUserBlueprintStats - User Statistics", () => {
    it("should return user statistics from cache when available", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const cachedStats: UserStatsResponse = {
        total: 10,
        completed: 7,
        generating: 2,
        avgGenerationTime: 45.5,
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(cachedStats);

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert
      expect(result).toEqual(cachedStats);
      expect(logger.debug).toHaveBeenCalledWith(
        "User blueprint stats from cache",
        { userId: 123 },
      );
    });

    it("should query database when cache miss occurs", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert - Database returns 3 results
      expect(result).toEqual({
        total: 3,
        completed: 1,
        generating: 1,
        avgGenerationTime: 0,
      });
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "user-blueprint-stats:123",
        expect.objectContaining({
          total: 3,
          completed: 1,
          generating: 1,
          avgGenerationTime: 0,
        }),
        expect.objectContaining({
          ttl: 600, // 10 minutes TTL
          tags: expect.arrayContaining([
            "user-stats",
            "user-123",
            "stats-cache",
          ]),
        }),
      );
    });

    it("should cache database query results", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      await blueprintFabricationService.getUserBlueprintStats(request);

      // Assert - Database returns 3 results, cache stores the stats
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "user-blueprint-stats:123",
        expect.objectContaining({
          total: 3,
          completed: 1,
          generating: 1,
          avgGenerationTime: 0,
        }),
        expect.any(Object),
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = null;

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert
      expect(result).toEqual({
        total: 0,
        completed: 0,
        generating: 0,
        avgGenerationTime: 0,
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get user blueprint stats",
        expect.objectContaining({
          error: "Cannot read properties of null (reading 'select')",
          userId: 123,
        }),
      );
    });

    it("should return default stats on database query failure", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockRejectedValue(new Error("Query failed")),
          }),
        }),
      };

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert
      expect(result).toEqual({
        total: 0,
        completed: 0,
        generating: 0,
        avgGenerationTime: 0,
      });
    });

    it("should correctly count completed projects", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert - Database returns 1 completed project
      expect(result.completed).toBe(1);
      expect(result.total).toBe(3);
    });

    it("should correctly count generating projects", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert - Database returns 1 generating project
      expect(result.generating).toBe(1);
    });
  });

  describe("Blueprint Type Extraction (via cacheBlueprint behavior)", () => {
    it("should extract marketplace type from features", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Marketplace functionality", "Seller accounts"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["marketplace"]),
        }),
      );
    });

    it("should extract ecommerce type from features", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Ecommerce features", "Payment gateway"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "ecommerce",
        confidence: 0.9,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["ecommerce"]),
        }),
      );
    });

    it("should extract social type from features", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Social features", "Community building"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "social",
        confidence: 0.9,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["social"]),
        }),
      );
    });

    it("should extract dashboard type from features", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Dashboard analytics", "Data visualization"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "dashboard",
        confidence: 0.9,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["dashboard"]),
        }),
      );
    });

    it("should extract api-service type from features", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          techStack: { ...createMockBlueprint().techStack, framework: "REST API" },
          features: ["API endpoints", "Webhooks"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "api-service",
        confidence: 0.9,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["api-service"]),
        }),
      );
    });

    it("should default to web-app type when no specific pattern matches", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Custom features", "Unique functionality"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: null,
        confidence: 0,
      });
      (UnifiedCacheManager.setData as jest.Mock).mockResolvedValue(undefined);

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.stringContaining("blueprint-skeleton"),
        expect.any(Object),
        expect.objectContaining({
          tags: expect.arrayContaining(["web-app"]),
        }),
      );
    });
  });

  describe("Pattern-Based TTL Calculation (via cacheBlueprint behavior)", () => {
    it("should calculate correct TTL for marketplace pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 10800, // 7200 * 1.5
        }),
      );
    });

    it("should calculate correct TTL for ecommerce pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "ecommerce",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 8640, // 7200 * 1.2
        }),
      );
    });

    it("should calculate correct TTL for social pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "social",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 9360, // 7200 * 1.3
        }),
      );
    });

    it("should calculate correct TTL for dashboard pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "dashboard",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 5760, // 7200 * 0.8
        }),
      );
    });

    it("should calculate correct TTL for api-service pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "api-service",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 7200, // 7200 * 1.0
        }),
      );
    });

    it("should calculate correct TTL for mobile-app pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "mobile-app",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 7920, // 7200 * 1.1
        }),
      );
    });

    it("should calculate correct TTL for fintech pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "fintech",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 14400, // 7200 * 2.0
        }),
      );
    });

    it("should calculate correct TTL for healthcare pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "healthcare",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 12960, // 7200 * 1.8
        }),
      );
    });

    it("should calculate correct TTL for edtech pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "edtech",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 10080, // 7200 * 1.4
        }),
      );
    });

    it("should calculate correct TTL for realestate pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "realestate",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 11520, // 7200 * 1.6
        }),
      );
    });

    it("should calculate correct TTL for logistics pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "logistics",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 9360, // 7200 * 1.3
        }),
      );
    });

    it("should calculate correct TTL for saas pattern", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "saas",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.objectContaining({
          ttl: 7200, // 7200 * 1.0
        }),
      );
    });
  });

  describe("Cache Key Generation", () => {
    it("should generate correct cache key for complete blueprint", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should generate correct cache key for skeleton blueprint", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          projectName: "E-Commerce Platform",
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "ecommerce",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert - extractBlueprintType returns "marketplace" based on features
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-skeleton:E-Commerce Platform:marketplace",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should generate correct cache key for user stats", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      await blueprintFabricationService.getUserBlueprintStats(request);

      // Assert - Cache key generated and cache is set with stats
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "user-blueprint-stats:123",
        expect.objectContaining({
          total: 3,
          completed: 1,
          generating: 1,
          avgGenerationTime: 0,
        }),
        expect.any(Object),
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete caching workflow with pattern detection", async () => {
      // Arrange
      const request: BlueprintCachingRequest = {
        projectId: "project-123",
        blueprint: createMockBlueprint({
          features: ["Marketplace", "Payment processing"],
        }),
        research: createMockResearch(),
      };

      (AIPatternDetector.detectPattern as jest.Mock).mockReturnValue({
        pattern: "marketplace",
        confidence: 0.9,
      });

      // Act
      await blueprintFabricationService.cacheBlueprint(request);

      // Assert - Complete blueprint cached
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-complete:project-123",
        expect.objectContaining({
          blueprint: request.blueprint,
          research: request.research,
          projectId: "project-123",
          cachedAt: expect.any(String),
        }),
        expect.objectContaining({
          ttl: 10800,
          tags: expect.arrayContaining(["blueprint-complete", "marketplace"]),
        }),
      );

      // Assert - Skeleton blueprint cached
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "blueprint-skeleton:Test Marketplace:marketplace",
        expect.objectContaining({
          techStack: request.blueprint.techStack,
          features: request.blueprint.features,
          architecture: request.blueprint.architecture,
        }),
        expect.objectContaining({
          ttl: 14400,
          tags: expect.arrayContaining(["blueprint-skeleton", "marketplace"]),
        }),
      );
    });

    it("should handle cache hit and miss scenarios correctly", async () => {
      // Arrange - Cache hit
      const cachedData = {
        blueprint: createMockBlueprint(),
        research: createMockResearch(),
      };
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(cachedData);

      // Act - Cache hit
      const result1 = await blueprintFabricationService.getCachedBlueprint(
        "project-123",
      );

      // Assert
      expect(result1).not.toBeNull();

      // Arrange - Cache miss
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);

      // Act - Cache miss
      const result2 = await blueprintFabricationService.getCachedBlueprint(
        "project-456",
      );

      // Assert
      expect(result2).toBeNull();
    });

    it("should handle user stats with cache miss and database query", async () => {
      // Arrange
      const request: UserStatsRequest = { userId: 123 };
      const mockDb = createMockDb();

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      mockDbInstance = mockDb;

      // Act
      const result = await blueprintFabricationService.getUserBlueprintStats(
        request,
      );

      // Assert - Database queried successfully
      expect(mockDb.select).toHaveBeenCalled();

      // Assert - Results cached with actual values
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "user-blueprint-stats:123",
        expect.objectContaining({
          total: 3,
          completed: 1,
          generating: 1,
          avgGenerationTime: 0,
        }),
        expect.objectContaining({
          ttl: 600,
        }),
      );

      // Assert - Stats returned with correct values
      expect(result.total).toBe(3);
      expect(result.completed).toBe(1);
      expect(result.generating).toBe(1);
    });
  });
});
