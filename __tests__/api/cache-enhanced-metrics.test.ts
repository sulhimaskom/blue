import { GET } from "@/app/api/cache/enhanced-metrics/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Enhanced Cache Metrics API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Enhanced cache metrics don't require auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("GET /api/cache/enhanced-metrics", () => {
    it("should return enhanced comprehensive cache analytics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("executiveSummary");
      expect(data.data).toHaveProperty("deepAnalytics");
      expect(data.data).toHaveProperty("predictiveMetrics");
      expect(data.data).toHaveProperty("optimizationRecommendations");
      expect(data.data).toHaveProperty("realTimeInsights");
    });

    it("should provide executive summary for business stakeholders", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const summary = data.data.executiveSummary;
      expect(summary).toHaveProperty("overallHealthScore");
      expect(summary).toHaveProperty("costSavings");
      expect(summary).toHaveProperty("performanceImpact");
      expect(summary).toHaveProperty("reliabilityMetrics");
      expect(summary).toHaveProperty("businessKeyMetrics");
    });

    it("should include cost savings calculations", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const costSavings = data.data.executiveSummary.costSavings;
      expect(costSavings).toHaveProperty("apiCallsSaved");
      expect(costSavings).toHaveProperty("estimatedCostSavings");
      expect(costSavings).toHaveProperty("computeResourcesSaved");
      expect(costSavings).toHaveProperty("bandwidthSaved");
    });

    it("should provide deep analytics with advanced metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const deepAnalytics = data.data.deepAnalytics;
      expect(deepAnalytics).toHaveProperty("behavioralPatterns");
      expect(deepAnalytics).toHaveProperty("heatMapData");
      expect(deepAnalytics).toHaveProperty("correlationAnalysis");
      expect(deepAnalytics).toHaveProperty("anomalyDetection");
    });

    it("should analyze behavioral patterns", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const patterns = data.data.deepAnalytics.behavioralPatterns;
      expect(patterns).toHaveProperty("accessPatterns");
      expect(patterns).toHaveProperty("temporalPatterns");
      expect(patterns).toHaveProperty("contentPatterns");
      expect(patterns).toHaveProperty("userBehaviorInsights");
    });

    it("should provide heat map analysis", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const heatMapData = data.data.deepAnalytics.heatMapData;
      expect(heatMapData).toHaveProperty("hotKeys");
      expect(heatMapData).toHaveProperty("coldKeys");
      expect(heatMapData).toHaveProperty("accessDistribution");
      expect(heatMapData).toHaveProperty("memoryHotspots");
    });

    it("should include predictive metrics and forecasting", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const predictiveMetrics = data.data.predictiveMetrics;
      expect(predictiveMetrics).toHaveProperty("capacityForecasting");
      expect(predictiveMetrics).toHaveProperty("performanceTrends");
      expect(predictiveMetrics).toHaveProperty("failurePrediction");
      expect(predictiveMetrics).toHaveProperty("optimizationOpportunities");
    });

    it("should provide optimization recommendations", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const recommendations = data.data.optimizationRecommendations;
      expect(recommendations).toHaveProperty("immediateActions");
      expect(recommendations).toHaveProperty("shortTermImprovements");
      expect(recommendations).toHaveProperty("longTermStrategy");
      expect(recommendations).toHaveProperty("priorityMatrix");
      expect(Array.isArray(recommendations.immediateActions)).toBe(true);
    });

    it("should include real-time insights", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const realTimeInsights = data.data.realTimeInsights;
      expect(realTimeInsights).toHaveProperty("currentLoad");
      expect(realTimeInsights).toHaveProperty("activeOperations");
      expect(realTimeInsights).toHaveProperty("systemHealth");
      expect(realTimeInsights).toHaveProperty("alerts");
    });

    it("should support filtering by analysis depth", async () => {
      const depths = ["basic", "standard", "comprehensive", "deep"];

      for (const depth of depths) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/enhanced-metrics?depth=${depth}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.analysisDepth).toBe(depth);
      }
    });

    it("should validate analysis depth parameter", async () => {
      const invalidDepths = ["invalid", "minimal", "maximum", "123"];

      for (const invalidDepth of invalidDepths) {
        const request = testHelper.createRequest({
          method: "GET",
          path: `/api/cache/enhanced-metrics?depth=${invalidDepth}`,
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain("analysis depth");
      }
    });

    it("should support business impact analysis", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?businessImpact=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("businessMetrics");
      expect(data.data.businessMetrics).toHaveProperty("userExperienceImpact");
      expect(data.data.businessMetrics).toHaveProperty("revenueProtection");
      expect(data.data.businessMetrics).toHaveProperty("operationalEfficiency");
    });

    it("should provide capacity planning insights", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?capacityPlanning=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("capacityAnalysis");
      expect(data.data.capacityAnalysis).toHaveProperty("currentUtilization");
      expect(data.data.capacityAnalysis).toHaveProperty("projectedGrowth");
      expect(data.data.capacityAnalysis).toHaveProperty(
        "scalingRecommendations",
      );
    });

    it("should include security and compliance metrics", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?security=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("securityMetrics");
      expect(data.data.securityMetrics).toHaveProperty("dataPrivacy");
      expect(data.data.securityMetrics).toHaveProperty("accessControls");
      expect(data.data.securityMetrics).toHaveProperty("auditCompliance");
    });

    it("should handle historical trend analysis", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?historical=true&period=30d",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("historicalAnalysis");
      expect(data.data.historicalAnalysis).toHaveProperty("trends");
      expect(data.data.historicalAnalysis).toHaveProperty("seasonalPatterns");
      expect(data.data.historicalAnalysis).toHaveProperty("growthMetrics");
    });

    it("should support anomaly detection alerts", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?anomalies=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("anomalyDetection");
      expect(data.data.anomalyDetection).toHaveProperty("detectedAnomalies");
      expect(data.data.anomalyDetection).toHaveProperty("severityLevels");
      expect(data.data.anomalyDetection).toHaveProperty("recommendedActions");
    });

    it("should provide competitive benchmarking", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?benchmark=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("benchmarkAnalysis");
      expect(data.data.benchmarkAnalysis).toHaveProperty("industryComparison");
      expect(data.data.benchmarkAnalysis).toHaveProperty(
        "performancePercentiles",
      );
      expect(data.data.benchmarkAnalysis).toHaveProperty("competitorInsights");
    });

    it("should validate complex parameter combinations", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?depth=comprehensive&businessImpact=true&capacityPlanning=true&security=true&historical=true&period=7d&anomalies=true&benchmark=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.analysisDepth).toBe("comprehensive");
      expect(data.data.businessMetrics).toBeDefined();
      expect(data.data.capacityAnalysis).toBeDefined();
      expect(data.data.securityMetrics).toBeDefined();
    });

    it("should provide actionable executive summary", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const summary = data.data.executiveSummary;
      expect(summary.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallHealthScore).toBeLessThanOrEqual(100);

      // Business metrics should be formatted for executive consumption
      if (summary.costSavings) {
        expect(typeof summary.costSavings.estimatedCostSavings).toBe("string");
        expect(summary.costSavings.estimatedCostSavings).toMatch(/\$/);
      }
    });

    it("should handle service errors gracefully", async () => {
      // Mock enhanced cache service failure
      const mockCacheService = testHelper.getMock("cacheService");
      if (mockCacheService) {
        mockCacheService.getEnhancedMetrics.mockRejectedValue(
          new Error("Enhanced cache service unavailable"),
        );
      }

      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("enhanced cache service");
    });

    it("should include appropriate caching headers", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics",
      });

      const response = await GET(request);

      expect(response.headers.get("cache-control")).toBeDefined();
      expect(response.headers.get("etag")).toBeDefined();

      // Enhanced metrics should have shorter cache due to real-time nature
      const cacheControl = response.headers.get("cache-control");
      expect(cacheControl).toContain("max-age=5"); // 5 seconds for enhanced data
    });

    it("should provide comprehensive alerting system", async () => {
      const request = testHelper.createRequest({
        method: "GET",
        path: "/api/cache/enhanced-metrics?alerts=true",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(data.data).toHaveProperty("alertSystem");
      expect(data.data.alertSystem).toHaveProperty("activeAlerts");
      expect(data.data.alertSystem).toHaveProperty("alertHistory");
      expect(data.data.alertSystem).toHaveProperty("suppressionRules");
      expect(data.data.alertSystem).toHaveProperty("escalationPolicies");
    });
  });
});
