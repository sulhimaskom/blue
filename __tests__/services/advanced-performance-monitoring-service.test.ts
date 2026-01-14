import { advancedPerformanceMonitoringService } from "@/lib/services/advanced-performance-monitoring-service";
import { logger } from "@/lib/logger";
import { performanceOptimizationService } from "@/lib/services/performance-optimization-service";

describe("AdvancedPerformanceMonitoringService", () => {
  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      // Arrange
      const instance1 = advancedPerformanceMonitoringService;
      const instance2 = advancedPerformanceMonitoringService;

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe("getCurrentMetrics", () => {
    it("should return performance metrics with all required fields", () => {
      // Act
      const metrics = advancedPerformanceMonitoringService.getCurrentMetrics();

      // Assert
      expect(metrics).toHaveProperty("buildTime");
      expect(metrics).toHaveProperty("bundleSize");
      expect(metrics).toHaveProperty("firstLoadJS");
      expect(metrics).toHaveProperty("cacheHitRate");
      expect(metrics).toHaveProperty("responseTime");
    });

    it("should return numeric values for all metrics", () => {
      // Act
      const metrics = advancedPerformanceMonitoringService.getCurrentMetrics();

      // Assert
      expect(typeof metrics.buildTime).toBe("number");
      expect(typeof metrics.bundleSize).toBe("number");
      expect(typeof metrics.firstLoadJS).toBe("number");
      expect(typeof metrics.cacheHitRate).toBe("number");
      expect(typeof metrics.responseTime).toBe("number");
    });

    it("should return metrics within reasonable ranges", () => {
      // Act
      const metrics = advancedPerformanceMonitoringService.getCurrentMetrics();

      // Assert
      expect(metrics.buildTime).toBeGreaterThan(0);
      expect(metrics.bundleSize).toBeGreaterThan(0);
      expect(metrics.firstLoadJS).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(100);
      expect(metrics.responseTime).toBeGreaterThan(0);
    });
  });

  describe("getComprehensiveReport", () => {
    let loggerInfoSpy: jest.SpyInstance;
    let getQuickWinsSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
      getQuickWinsSpy = jest.spyOn(
        performanceOptimizationService,
        "getQuickWins",
      ).mockReturnValue([
        "Optimization 1",
        "Optimization 2",
        "Optimization 3",
      ]);
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
      getQuickWinsSpy.mockRestore();
    });

    it("should return comprehensive report with all required fields", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(report).toHaveProperty("performanceMetrics");
      expect(report).toHaveProperty("improvementMetrics");
      expect(report).toHaveProperty("score");
      expect(report).toHaveProperty("status");
      expect(report).toHaveProperty("industryComparison");
      expect(report).toHaveProperty("optimizations");
    });

    it("should include performance metrics in report", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(report.performanceMetrics).toHaveProperty("buildTime");
      expect(report.performanceMetrics).toHaveProperty("bundleSize");
      expect(report.performanceMetrics).toHaveProperty("firstLoadJS");
      expect(report.performanceMetrics).toHaveProperty("cacheHitRate");
      expect(report.performanceMetrics).toHaveProperty("responseTime");
    });

    it("should include improvement metrics with build time and speed score", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(report.improvementMetrics).toHaveProperty("buildTimeImprovement");
      expect(report.improvementMetrics).toHaveProperty("speedScore");
      expect(report.improvementMetrics).toHaveProperty("recommendations");
    });

    it("should include industry comparison for all metrics", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(report.industryComparison).toHaveProperty("buildTime");
      expect(report.industryComparison).toHaveProperty("bundleSize");
      expect(report.industryComparison).toHaveProperty("cacheHitRate");
      expect(report.industryComparison).toHaveProperty("responseTime");
    });

    it("should set appropriate status based on score", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(["excellent", "good", "fair", "poor"]).toContain(report.status);
    });

    it("should call performanceOptimizationService for optimizations", () => {
      // Act
      advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(getQuickWinsSpy).toHaveBeenCalledTimes(1);
    });

    it("should log report generation with score and build time", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Comprehensive performance report generated",
        expect.objectContaining({
          score: report.score,
          buildTime: report.performanceMetrics.buildTime,
        }),
      );
    });

    it("should include array of optimizations", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();

      // Assert
      expect(Array.isArray(report.optimizations)).toBe(true);
      expect(report.optimizations.length).toBeGreaterThan(0);
    });
  });

  describe("getPerformanceSummary", () => {
    let loggerInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it("should return performance summary with all required fields", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(summary).toHaveProperty("score");
      expect(summary).toHaveProperty("status");
      expect(summary).toHaveProperty("buildTime");
      expect(summary).toHaveProperty("bundleSize");
      expect(summary).toHaveProperty("cacheHitRate");
      expect(summary).toHaveProperty("responseTime");
      expect(summary).toHaveProperty("summary");
    });

    it("should include metric targets for all metrics", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(summary.buildTime).toHaveProperty("current");
      expect(summary.buildTime).toHaveProperty("target");
      expect(summary.buildTime).toHaveProperty("unit");
      expect(summary.buildTime).toHaveProperty("status");

      expect(summary.bundleSize).toHaveProperty("current");
      expect(summary.bundleSize).toHaveProperty("target");
      expect(summary.bundleSize).toHaveProperty("unit");
      expect(summary.bundleSize).toHaveProperty("status");

      expect(summary.cacheHitRate).toHaveProperty("current");
      expect(summary.cacheHitRate).toHaveProperty("target");
      expect(summary.cacheHitRate).toHaveProperty("unit");
      expect(summary.cacheHitRate).toHaveProperty("status");

      expect(summary.responseTime).toHaveProperty("current");
      expect(summary.responseTime).toHaveProperty("target");
      expect(summary.responseTime).toHaveProperty("unit");
      expect(summary.responseTime).toHaveProperty("status");
    });

    it("should set appropriate status for each metric based on target", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(["optimal", "good", "needs-attention"]).toContain(
        summary.buildTime.status,
      );
      expect(["optimal", "good", "needs-attention"]).toContain(
        summary.bundleSize.status,
      );
      expect(["optimal", "good", "needs-attention"]).toContain(
        summary.cacheHitRate.status,
      );
      expect(["optimal", "good", "needs-attention"]).toContain(
        summary.responseTime.status,
      );
    });

    it("should include units for all metrics", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(summary.buildTime.unit).toBe("seconds");
      expect(summary.bundleSize.unit).toBe("KB");
      expect(summary.cacheHitRate.unit).toBe("%");
      expect(summary.responseTime.unit).toBe("ms");
    });

    it("should log summary generation with score", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Performance summary generated",
        expect.objectContaining({
          score: summary.score,
        }),
      );
    });

    it("should include descriptive summary string", () => {
      // Act
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(typeof summary.summary).toBe("string");
      expect(summary.summary.length).toBeGreaterThan(0);
    });
  });

  describe("getOptimizationRecommendations", () => {
    let loggerInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it("should return recommendations array", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      expect(result).toHaveProperty("recommendations");
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should return recommendations with all required fields", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      if (result.recommendations.length > 0) {
        result.recommendations.forEach((rec) => {
          expect(rec).toHaveProperty("category");
          expect(rec).toHaveProperty("priority");
          expect(rec).toHaveProperty("title");
          expect(rec).toHaveProperty("description");
          expect(rec).toHaveProperty("implementation");
          expect(rec).toHaveProperty("expectedImprovement");
        });
      }
    });

    it("should have valid priority levels", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      result.recommendations.forEach((rec) => {
        expect(["low", "medium", "high"]).toContain(rec.priority);
      });
    });

    it("should include recommendations for different categories", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      const categories = result.recommendations.map((rec) => rec.category);
      expect(categories.length).toBeGreaterThan(0);
    });

    it("should have non-empty string fields", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      result.recommendations.forEach((rec) => {
        expect(rec.category).toBeTruthy();
        expect(rec.title).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(rec.implementation).toBeTruthy();
        expect(rec.expectedImprovement).toBeTruthy();
      });
    });

    it("should log recommendation generation with count", () => {
      // Act
      const result =
        advancedPerformanceMonitoringService.getOptimizationRecommendations();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Optimization recommendations generated",
        expect.objectContaining({
          count: result.recommendations.length,
        }),
      );
    });
  });

  describe("getBuildOptimizations", () => {
    let loggerInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it("should return build optimizations with all required fields", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      expect(optimizations).toHaveProperty("optimizations");
      expect(optimizations).toHaveProperty("nextSteps");
    });

    it("should return array of optimizations", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      expect(Array.isArray(optimizations.optimizations)).toBe(true);
    });

    it("should return optimizations with all required fields", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      if (optimizations.optimizations.length > 0) {
        optimizations.optimizations.forEach((opt) => {
          expect(opt).toHaveProperty("category");
          expect(opt).toHaveProperty("title");
          expect(opt).toHaveProperty("status");
          expect(opt).toHaveProperty("impact");
        });
      }
    });

    it("should have valid status values", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      optimizations.optimizations.forEach((opt) => {
        expect(["implemented", "planned", "recommended"]).toContain(opt.status);
      });
    });

    it("should return array of next steps", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      expect(Array.isArray(optimizations.nextSteps)).toBe(true);
    });

    it("should have non-empty string fields", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      optimizations.optimizations.forEach((opt) => {
        expect(opt.category).toBeTruthy();
        expect(opt.title).toBeTruthy();
        expect(opt.status).toBeTruthy();
        expect(opt.impact).toBeTruthy();
      });

      optimizations.nextSteps.forEach((step) => {
        expect(step).toBeTruthy();
      });
    });

    it("should log retrieval with implemented count", () => {
      // Act
      const optimizations =
        advancedPerformanceMonitoringService.getBuildOptimizations();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Build optimizations retrieved",
        expect.objectContaining({
          implemented: optimizations.optimizations.filter(
            (o) => o.status === "implemented",
          ).length,
        }),
      );
    });
  });

  describe("analyzePerformance", () => {
    let loggerInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it("should return analysis with all required fields", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(analysis).toHaveProperty("score");
      expect(analysis).toHaveProperty("status");
      expect(analysis).toHaveProperty("analysis");
    });

    it("should return analysis with strengths and areas", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(analysis.analysis).toHaveProperty("strengths");
      expect(analysis.analysis).toHaveProperty("areas");
    });

    it("should return array of strengths", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(Array.isArray(analysis.analysis.strengths)).toBe(true);
    });

    it("should return array of areas for improvement", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(Array.isArray(analysis.analysis.areas)).toBe(true);
    });

    it("should include areas with all required fields", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      if (analysis.analysis.areas.length > 0) {
        analysis.analysis.areas.forEach((area) => {
          expect(area).toHaveProperty("metric");
          expect(area).toHaveProperty("current");
          expect(area).toHaveProperty("target");
          expect(area).toHaveProperty("status");
          expect(area).toHaveProperty("recommendation");
        });
      }
    });

    it("should have non-empty string fields", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      analysis.analysis.strengths.forEach((strength) => {
        expect(strength).toBeTruthy();
      });

      if (analysis.analysis.areas.length > 0) {
        analysis.analysis.areas.forEach((area) => {
          expect(area.metric).toBeTruthy();
          expect(area.status).toBeTruthy();
          expect(area.recommendation).toBeTruthy();
        });
      }
    });

    it("should log analysis completion with score and counts", () => {
      // Act
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Performance analysis completed",
        expect.objectContaining({
          score: analysis.score,
          strengthsCount: analysis.analysis.strengths.length,
          areasCount: analysis.analysis.areas.length,
        }),
      );
    });
  });

  describe("applyOptimizations", () => {
    let loggerInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      loggerInfoSpy.mockRestore();
    });

    it("should return optimization result with all required fields", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(result).toHaveProperty("applied");
      expect(result).toHaveProperty("optimizations");
      expect(result).toHaveProperty("expectedImprovements");
    });

    it("should mark optimizations as applied", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(result.applied).toBe(true);
    });

    it("should return array of applied optimizations", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(Array.isArray(result.optimizations)).toBe(true);
      expect(result.optimizations.length).toBeGreaterThan(0);
    });

    it("should have non-empty optimization descriptions", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      result.optimizations.forEach((opt) => {
        expect(opt).toBeTruthy();
      });
    });

    it("should return expected improvements for all metrics", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(result.expectedImprovements).toHaveProperty("buildTime");
      expect(result.expectedImprovements).toHaveProperty("cacheEfficiency");
      expect(result.expectedImprovements).toHaveProperty("bundleSize");
    });

    it("should have non-empty improvement descriptions", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(result.expectedImprovements.buildTime).toBeTruthy();
      expect(result.expectedImprovements.cacheEfficiency).toBeTruthy();
      expect(result.expectedImprovements.bundleSize).toBeTruthy();
    });

    it("should log optimization application with count", () => {
      // Act
      const result = advancedPerformanceMonitoringService.applyOptimizations();

      // Assert
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        "Optimizations applied",
        expect.objectContaining({
          optimizationsCount: result.optimizations.length,
        }),
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should return consistent metrics across different method calls", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();

      // Assert
      expect(report.performanceMetrics.buildTime).toBe(
        summary.buildTime.current,
      );
      expect(report.performanceMetrics.bundleSize).toBe(
        summary.bundleSize.current,
      );
      expect(report.performanceMetrics.cacheHitRate).toBe(
        summary.cacheHitRate.current,
      );
      expect(report.performanceMetrics.responseTime).toBe(
        summary.responseTime.current,
      );
    });

    it("should maintain consistent score across reports", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(report.score).toBe(summary.score);
      expect(report.score).toBe(analysis.score);
    });

    it("should return valid status values across all reports", () => {
      // Act
      const report =
        advancedPerformanceMonitoringService.getComprehensiveReport();
      const summary =
        advancedPerformanceMonitoringService.getPerformanceSummary();
      const analysis = advancedPerformanceMonitoringService.analyzePerformance();

      // Assert
      expect(["excellent", "good", "fair", "poor"]).toContain(report.status);
      expect(["excellent", "good", "fair", "poor"]).toContain(summary.status);
      expect(["excellent", "good", "fair", "poor"]).toContain(analysis.status);
    });
  });
});
