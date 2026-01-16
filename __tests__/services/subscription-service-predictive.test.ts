import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SubscriptionService - Predictive Analytics", () => {
  let subscriptionService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    subscriptionService = require("@/lib/services/subscription-service").subscriptionService;
  });

  describe("calculateDailyAverage", () => {
    it("should calculate correct daily average for non-empty data", () => {
      const data = [
        { date: "2024-01-01", value: 10 },
        { date: "2024-01-02", value: 20 },
        { date: "2024-01-03", value: 30 },
      ];

      const result = subscriptionService.calculateDailyAverage(data);
      expect(result).toBe(20);
    });

    it("should return 0 for empty data", () => {
      const result = subscriptionService.calculateDailyAverage([]);
      expect(result).toBe(0);
    });

    it("should handle floating point values correctly", () => {
      const data = [
        { date: "2024-01-01", value: 10.5 },
        { date: "2024-01-02", value: 20.5 },
        { date: "2024-01-03", value: 30 },
      ];

      const result = subscriptionService.calculateDailyAverage(data);
      expect(result).toBeCloseTo(20.33, 2);
    });
  });

  describe("calculateGrowthRate", () => {
    it("should calculate positive growth rate for increasing data", () => {
      const data = [
        { date: "2024-01-01", value: 10 },
        { date: "2024-01-02", value: 20 },
        { date: "2024-01-03", value: 30 },
      ];

      const result = subscriptionService.calculateGrowthRate(data);
      expect(result).toBeCloseTo(10, 2);
    });

    it("should calculate negative growth rate for decreasing data", () => {
      const data = [
        { date: "2024-01-01", value: 30 },
        { date: "2024-01-02", value: 20 },
        { date: "2024-01-03", value: 10 },
      ];

      const result = subscriptionService.calculateGrowthRate(data);
      expect(result).toBeCloseTo(-10, 2);
    });

    it("should return 0 for constant data", () => {
      const data = [
        { date: "2024-01-01", value: 20 },
        { date: "2024-01-02", value: 20 },
        { date: "2024-01-03", value: 20 },
      ];

      const result = subscriptionService.calculateGrowthRate(data);
      expect(result).toBe(0);
    });

    it("should return 0 for single data point", () => {
      const data = [{ date: "2024-01-01", value: 20 }];

      const result = subscriptionService.calculateGrowthRate(data);
      expect(result).toBe(0);
    });

    it("should return 0 for empty data", () => {
      const result = subscriptionService.calculateGrowthRate([]);
      expect(result).toBe(0);
    });
  });

  describe("predictExhaustionDate", () => {
    it("should predict correct exhaustion date for positive usage", () => {
      const currentCredits = 100;
      const remainingCredits = 50;
      const dailyAverage = 10;

      const result = subscriptionService.predictExhaustionDate(currentCredits, remainingCredits, dailyAverage);
      
      expect(result).toBeTruthy();
      const exhaustionDate = new Date(result!);
      const today = new Date();
      const expectedDays = Math.floor(remainingCredits / dailyAverage);
      
      const actualDays = Math.ceil((exhaustionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(Math.abs(actualDays - expectedDays)).toBeLessThanOrEqual(1);
    });

    it("should return null when remaining credits are -1 (unlimited)", () => {
      const result = subscriptionService.predictExhaustionDate(100, -1, 10);
      expect(result).toBeNull();
    });

    it("should return null when daily average is 0", () => {
      const result = subscriptionService.predictExhaustionDate(100, 50, 0);
      expect(result).toBeNull();
    });

    it("should return null when remaining credits are negative", () => {
      const result = subscriptionService.predictExhaustionDate(100, -10, 10);
      expect(result).toBeNull();
    });
  });

  describe("predictLimitHit", () => {
    it("should predict limit hit date with positive growth", () => {
      const currentProjects = 5;
      const maxProjects = 20;
      const historicalData = [
        { date: "2024-01-01", value: 5 },
        { date: "2024-01-02", value: 6 },
        { date: "2024-01-03", value: 7 },
      ];

      const result = subscriptionService.predictLimitHit(currentProjects, maxProjects, historicalData);
      
      expect(result).toBeTruthy();
      const limitDate = new Date(result!);
      expect(limitDate).toBeInstanceOf(Date);
    });

    it("should return null when maxProjects is -1 (unlimited)", () => {
      const result = subscriptionService.predictLimitHit(5, -1, []);
      expect(result).toBeNull();
    });

    it("should return today's date when current projects exceed limit", () => {
      const currentProjects = 25;
      const maxProjects = 20;
      const historicalData = [];

      const result = subscriptionService.predictLimitHit(currentProjects, maxProjects, historicalData);
      
      expect(result).toBeTruthy();
      const limitDate = new Date(result!);
      const today = new Date();
      expect(limitDate.toDateString()).toBe(today.toDateString());
    });

    it("should return null when growth rate is 0 or negative", () => {
      const result = subscriptionService.predictLimitHit(5, 20, [
        { date: "2024-01-01", value: 5 },
        { date: "2024-01-02", value: 4 },
        { date: "2024-01-03", value: 3 },
      ]);
      
      expect(result).toBeNull();
    });

    it("should return null for predictions beyond 365 days", () => {
      const currentProjects = 5;
      const maxProjects = 1000;
      const historicalData = [
        { date: "2024-01-01", value: 5 },
        { date: "2024-01-02", value: 5.1 },
        { date: "2024-01-03", value: 5.2 },
      ];

      const result = subscriptionService.predictLimitHit(currentProjects, maxProjects, historicalData);
      expect(result).toBeNull();
    });
  });

  describe("recommendTierForCredits", () => {
    it("should recommend immediate upgrade for exhaustion within 7 days", () => {
      const exhaustionDate = new Date();
      exhaustionDate.setDate(exhaustionDate.getDate() + 5);

      const result = subscriptionService.recommendTierForCredits(950, 1000, [], exhaustionDate.toISOString().split("T")[0]);
      
      expect(result.recommendedTier).toBe("pro");
      expect(result.urgency).toBe("immediate");
      expect(result.reason).toContain("5 days");
    });

    it("should recommend upcoming upgrade for exhaustion within 30 days", () => {
      const exhaustionDate = new Date();
      exhaustionDate.setDate(exhaustionDate.getDate() + 20);

      const result = subscriptionService.recommendTierForCredits(800, 1000, [], exhaustionDate.toISOString().split("T")[0]);
      
      expect(result.recommendedTier).toBe("pro");
      expect(result.urgency).toBe("upcoming");
      expect(result.reason).toContain("20 days");
    });

    it("should recommend upgrade for usage > 80%", () => {
      const result = subscriptionService.recommendTierForCredits(850, 1000, [], null);
      
      expect(result.recommendedTier).toBe("pro");
      expect(result.urgency).toBe("upcoming");
      expect(result.reason).toContain("85%");
    });

    it("should recommend current tier for healthy usage", () => {
      const result = subscriptionService.recommendTierForCredits(300, 1000, [], null);
      
      expect(result.recommendedTier).toBe("current");
      expect(result.urgency).toBe("none");
      expect(result.reason).toContain("meets your usage needs");
    });

    it("should recommend current tier when no exhaustion date available", () => {
      const result = subscriptionService.recommendTierForCredits(400, 1000, [], null);
      
      expect(result.recommendedTier).toBe("current");
      expect(result.urgency).toBe("none");
    });
  });

  describe("projectMonthlyUsage", () => {
    it("should project monthly usage based on historical data", () => {
      const historicalData = [
        { date: "2024-01-01", value: 10 },
        { date: "2024-01-02", value: 11 },
        { date: "2024-01-03", value: 12 },
      ];

      const result = subscriptionService.projectMonthlyUsage(historicalData);
      
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should return 0 for empty data", () => {
      const result = subscriptionService.projectMonthlyUsage([]);
      expect(result).toBe(0);
    });

    it("should account for growth rate in projection", () => {
      const increasingData = [
        { date: "2024-01-01", value: 10 },
        { date: "2024-01-02", value: 15 },
        { date: "2024-01-03", value: 20 },
      ];

      const increasingResult = subscriptionService.projectMonthlyUsage(increasingData);
      
      const flatData = [
        { date: "2024-01-01", value: 15 },
        { date: "2024-01-02", value: 15 },
        { date: "2024-01-03", value: 15 },
      ];

      const flatResult = subscriptionService.projectMonthlyUsage(flatData);
      
      expect(increasingResult).toBeGreaterThanOrEqual(flatResult);
    });
  });

  describe("getPredictiveAnalytics integration", () => {
    it("should return complete prediction metrics", async () => {
      const { db } = require("@/lib/db");
      
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const mockUsage = {
        success: true,
        data: {
          currentUsage: { credits: 500, projects: 3, teams: 1, webhooks: 2, apiRequests: 100 },
          remaining: { credits: 500, projects: 7, teams: 9, webhooks: 8 },
          percentageUsed: { credits: 50, projects: 30, teams: 10, webhooks: 20 },
          limits: {
            maxCredits: 1000,
            maxProjects: 10,
            maxTeams: 10,
            maxWebhooks: 10,
            monthlyCreditAllowance: 1000,
            apiRateLimitMultiplier: 1,
            maxBlueprintVersions: 10,
            maxDeploymentsPerDay: 5,
          },
        },
      };

      const mockHistorical = {
        success: true,
        data: {
          credits: [
            { date: "2024-01-01", value: 10 },
            { date: "2024-01-02", value: 11 },
            { date: "2024-01-03", value: 12 },
          ],
          projects: [
            { date: "2024-01-01", value: 0 },
            { date: "2024-01-02", value: 1 },
            { date: "2024-01-03", value: 0 },
          ],
          deployments: [
            { date: "2024-01-01", value: 1 },
            { date: "2024-01-02", value: 2 },
            { date: "2024-01-03", value: 1 },
          ],
          apiRequests: [
            { date: "2024-01-01", value: 10 },
            { date: "2024-01-02", value: 11 },
            { date: "2024-01-03", value: 12 },
          ],
        },
      };

      jest.spyOn(subscriptionService, "getUserUsage").mockResolvedValue(mockUsage);
      jest.spyOn(subscriptionService, "getHistoricalUsage").mockResolvedValue(mockHistorical);

      const result = await subscriptionService.getPredictiveAnalytics(1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.credits).toBeDefined();
      expect(result.data.projects).toBeDefined();
      expect(result.data.deployments).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
    });

    it("should return error when getUserUsage fails", async () => {
      jest.spyOn(subscriptionService, "getUserUsage").mockResolvedValue({
        success: false,
        error: "Failed to get usage",
      });

      const result = await subscriptionService.getPredictiveAnalytics(1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when getHistoricalUsage fails", async () => {
      jest.spyOn(subscriptionService, "getUserUsage").mockResolvedValue({
        success: true,
        data: { currentUsage: {}, remaining: {}, percentageUsed: {}, limits: {} },
      });

      jest.spyOn(subscriptionService, "getHistoricalUsage").mockResolvedValue({
        success: false,
        error: "Failed to get historical data",
      });

      const result = await subscriptionService.getPredictiveAnalytics(1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
