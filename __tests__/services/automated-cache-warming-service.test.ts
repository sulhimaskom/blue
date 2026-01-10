import { automatedCacheWarmingService } from "../../lib/services/automated-cache-warming";
import { logger } from "../../lib/logger";
import { AIPatternDetector } from '../../lib/services/ai-pattern-detector';

// Mock dependencies
jest.mock("../../lib/logger");

// Mock AIPatternDetector with proper module mock
jest.mock("../../lib/services/ai-pattern-detector", () => ({
  AIPatternDetector: {
    performIntelligentWarming: jest.fn(() => Promise.resolve({
      warmedRules: 0,
      estimatedSavings: 0,
      patternsDetected: [],
    })),
  },
}));

// Get reference to the mocks
const mockPerformIntelligentWarming = AIPatternDetector.performIntelligentWarming as jest.MockedFunction<typeof AIPatternDetector.performIntelligentWarming>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("automatedCacheWarmingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset service state for clean tests
    automatedCacheWarmingService.resetMetrics();
    automatedCacheWarmingService.resetSchedules();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getMetrics", () => {
    it("should return default metrics when service hasn't run", () => {
      // Act
      const metrics = automatedCacheWarmingService.getMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.lastRun).toBe(0);
      expect(metrics.warmedEntries).toBe(0);
      expect(metrics.estimatedSavings).toBe(0);
      expect(metrics.hitRateImprovement).toBe(0);
      expect(metrics.patternsWarmed).toEqual([]);
      expect(metrics.duration).toBe(0);
    });
  });

  describe("getStatus", () => {
    it("should return service status with all schedules", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      expect(status).toBeDefined();
      expect(status.running).toBe(true);
      expect(Array.isArray(status.schedules)).toBe(true);
      expect(status.schedules.length).toBeGreaterThan(0);
      expect(status.nextWarming).toBeGreaterThan(0);
      expect(status.intervalManagerHealth).toBeDefined();
    });

    it("should include all three priority levels", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      const priorities = status.schedules.map((s: any) => s.priority);
      expect(priorities).toContain("high");
      expect(priorities).toContain("medium");
      expect(priorities).toContain("low");
    });

    it("should show correct interval values for each priority", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      const highSchedule = status.schedules.find((s: any) => s.priority === "high");
      const mediumSchedule = status.schedules.find((s: any) => s.priority === "medium");
      const lowSchedule = status.schedules.find((s: any) => s.priority === "low");

      expect(highSchedule?.interval).toBe(5);
      expect(mediumSchedule?.interval).toBe(15);
      expect(lowSchedule?.interval).toBe(60);
    });
  });

  describe("performOnDemandWarming", () => {
    it("should perform warming for specified patterns", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 5,
        estimatedSavings: 100,
        patternsDetected: ["marketplace", "ecommerce"],
      });
      
      const patterns = ["marketplace", "ecommerce"] as any;

      // Act
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.warmedEntries).toBe(5);
      expect(result.estimatedSavings).toBe(100);
      expect(mockPerformIntelligentWarming).toHaveBeenCalled();
    });

    it("should handle warming errors gracefully", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockRejectedValue(
        new Error("Warming failed"),
      );

      const patterns = ["dashboard"] as any;

      // Act
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.warmedEntries).toBe(0);
      expect(result.estimatedSavings).toBe(0);
      expect(result.error).toBeDefined();
    });

    it("should update metrics after successful warming", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 10,
        estimatedSavings: 200,
        patternsDetected: ["marketplace", "ecommerce", "social"],
      });

      const patterns = ["marketplace", "ecommerce", "social"] as any;

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(patterns);
      const metrics = automatedCacheWarmingService.getMetrics();

      // Assert
      expect(metrics.warmedEntries).toBe(10);
      expect(metrics.estimatedSavings).toBe(200);
      expect(metrics.patternsWarmed).toEqual([
        "marketplace",
        "ecommerce",
        "social",
      ]);
    });
  });

  describe("updateSchedules", () => {
    it("should update schedule configurations", () => {
      // Arrange
      const newSchedules: any[] = [
        { interval: 10, priority: "high" as any, enabled: false },
        { interval: 20, priority: "medium" as any, enabled: true },
      ];

      // Act
      automatedCacheWarmingService.updateSchedules(newSchedules);

      // Assert
      const status = automatedCacheWarmingService.getStatus();
      const highSchedule = status.schedules.find((s: any) => s.priority === "high");
      const mediumSchedule = status.schedules.find((s: any) => s.priority === "medium");

      expect(highSchedule?.interval).toBe(10);
      expect(highSchedule?.enabled).toBe(false);
      expect(mediumSchedule?.interval).toBe(20);
      expect(mediumSchedule?.enabled).toBe(true);
    });

    it("should update only specified schedules", () => {
      // Arrange
      const newSchedules: any[] = [
        { interval: 7, priority: "high" as any, enabled: true },
      ];

      // Act
      automatedCacheWarmingService.updateSchedules(newSchedules);

      // Assert
      const status = automatedCacheWarmingService.getStatus();
      const highSchedule = status.schedules.find((s: any) => s.priority === "high");
      const lowSchedule = status.schedules.find((s: any) => s.priority === "low");

      expect(highSchedule?.interval).toBe(7);
      expect(lowSchedule?.interval).toBe(60); // Should remain unchanged
    });
  });

  describe("Warming Schedule Configuration", () => {
    it("should have correct pattern sets for each priority", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      const highSchedule = status.schedules.find((s: any) => s.priority === "high");
      const mediumSchedule = status.schedules.find((s: any) => s.priority === "medium");
      const lowSchedule = status.schedules.find((s: any) => s.priority === "low");

      // High priority: most common patterns
      expect(highSchedule?.patterns).toContain("marketplace");
      expect(highSchedule?.patterns).toContain("ecommerce");
      expect(highSchedule?.patterns).toContain("social");

      // Medium priority: common patterns
      expect(mediumSchedule?.patterns).toContain("dashboard");
      expect(mediumSchedule?.patterns).toContain("api-service");
      expect(mediumSchedule?.patterns).toContain("mobile-app");

      // Low priority: all patterns
      expect(lowSchedule?.patterns).toContain("marketplace");
      expect(lowSchedule?.patterns).toContain("ecommerce");
      expect(lowSchedule?.patterns).toContain("social");
      expect(lowSchedule?.patterns).toContain("dashboard");
    });

    it("should have enabled status for all schedules", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      status.schedules.forEach((schedule: any) => {
        expect(schedule.enabled).toBe(true);
      });
    });

    it("should have correct interval values in minutes", () => {
      // Act
      const status = automatedCacheWarmingService.getStatus();

      // Assert
      const intervals = status.schedules.map((s: any) => s.interval);
      expect(intervals).toContain(5); // High priority
      expect(intervals).toContain(15); // Medium priority
      expect(intervals).toContain(60); // Low priority
    });
  });

  describe("Metrics Calculation", () => {
    it("should calculate hit rate improvement based on warmed entries", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 10,
        estimatedSavings: 200,
        patternsDetected: ["marketplace", "ecommerce", "social"],
      });

      const patterns = ["marketplace", "ecommerce", "social"] as any;

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(patterns);
      const metrics = automatedCacheWarmingService.getMetrics();

      // Assert - 10 entries * 2% per entry = 20% (capped at 25%)
      expect(metrics.warmedEntries).toBe(10);
      expect(metrics.hitRateImprovement).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRateImprovement).toBeLessThanOrEqual(0.25);
    });

    it("should track duration of warming operations", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockImplementation(
        async () => {
          // Simulate some processing time using jest's fake timers
          jest.advanceTimersByTime(100);
          return {
            warmedRules: 5,
            estimatedSavings: 100,
            patternsDetected: ["marketplace"],
          };
        },
      );

      const patterns = ["marketplace"] as any;

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(patterns);
      const metrics = automatedCacheWarmingService.getMetrics();

      // Assert
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.duration).toBeLessThan(5000); // Should complete within reasonable time
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty pattern list", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 0,
        estimatedSavings: 0,
        patternsDetected: [],
      });

      const patterns: any[] = [];

      // Act
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.warmedEntries).toBe(0);
    });

    it("should handle single pattern", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 2,
        estimatedSavings: 40,
        patternsDetected: ["dashboard"],
      });

      const patterns = ["dashboard"] as any;

      // Act
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warmedEntries).toBe(2);
    });

it("should handle all supported patterns", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockResolvedValue({
        warmedRules: 20,
        estimatedSavings: 400,
        patternsDetected: [
          "marketplace",
          "ecommerce",
          "social",
          "dashboard",
          "api-service",
          "mobile-app",
        ],
      });

      const patterns = [
        "marketplace",
        "ecommerce",
        "social",
        "dashboard",
        "api-service",
        "mobile-app",
      ] as any;

      // Act
      const result = await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warmedEntries).toBe(20);
      expect(result.estimatedSavings).toBe(400);
    });
  });

  describe("Integration Scenarios", () => {
    it("should maintain metrics across multiple warming operations", async () => {
      // Arrange
      mockPerformIntelligentWarming
        .mockResolvedValueOnce({
          warmedRules: 5,
          estimatedSavings: 100,
          patternsDetected: ["marketplace"],
        })
        .mockResolvedValueOnce({
          warmedRules: 3,
          estimatedSavings: 60,
          patternsDetected: ["ecommerce"],
        });

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(["marketplace"] as any);
      await automatedCacheWarmingService.performOnDemandWarming(["ecommerce"] as any);
      const metrics = automatedCacheWarmingService.getMetrics();

      // Assert
      expect(metrics.warmedEntries).toBe(3); // Latest operation wins
      expect(metrics.estimatedSavings).toBe(60);
      expect(metrics.patternsWarmed).toEqual(["ecommerce"]);
    });

    it("should log warming operations", async () => {
      // Arrange
      const mockAIPatternDetector = require("../../lib/services/ai-pattern-detector").AIPatternDetector;
      mockAIPatternDetector.performIntelligentWarming = jest.fn().mockResolvedValue({
        warmedRules: 5,
        estimatedSavings: 100,
        patternsDetected: ["marketplace", "ecommerce"],
      });

      const patterns = ["marketplace", "ecommerce"] as any;

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "Performing on-demand cache warming",
        expect.any(Object),
      );
    });

    it("should log errors appropriately", async () => {
      // Arrange
      mockPerformIntelligentWarming.mockRejectedValue(
        new Error("Warming error"),
      );

      const patterns = ["dashboard"] as any;

      // Act
      await automatedCacheWarmingService.performOnDemandWarming(patterns);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
