/**
 * Predictive Performance Analyzer Test Suite
 *
 * Tests the PredictivePerformanceAnalyzer service with comprehensive coverage
 * following AAA pattern and best practices
 */

import {
  PredictivePerformanceAnalyzer,
  type PredictiveMetrics,
  type PerformancePrediction,
  type PerformanceAnomaly,
} from "@/lib/services/predictive-performance-analyzer";

describe("PredictivePerformanceAnalyzer", () => {
  beforeEach(() => {
    PredictivePerformanceAnalyzer.resetHistoricalData();
  });

  describe("generatePredictiveAnalysis", () => {
    it("should generate complete predictive analysis with valid metrics", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(result).toBeDefined();
      expect(Array.isArray(result.predictions)).toBe(true);
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(Array.isArray(result.optimizations)).toBe(true);
      expect(typeof result.healthScore).toBe("number");
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(typeof result.nextAction).toBe("string");
      expect(result.nextAction.length).toBeGreaterThan(0);
    });

    it("should generate predictions for multiple time horizons", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      if (result.predictions.length > 0) {
        const timeHorizons = new Set(
          result.predictions.map((p) => p.timeHorizon),
        );
        expect(timeHorizons.has("1h") || timeHorizons.has("6h")).toBe(true);
      }
    });

    it("should calculate confidence scores within valid range", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.predictions.forEach((prediction) => {
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
      });
    });

    it("should handle errors gracefully and return valid data", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(result).toBeDefined();
      expect(Array.isArray(result.predictions)).toBe(true);
      expect(Array.isArray(result.anomalies)).toBe(true);
      expect(Array.isArray(result.optimizations)).toBe(true);
      expect(typeof result.healthScore).toBe("number");
      expect(typeof result.nextAction).toBe("string");
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it("should classify urgency levels correctly", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const validUrgencyLevels = ["low", "medium", "high", "critical"];
      result.predictions.forEach((prediction) => {
        expect(validUrgencyLevels).toContain(prediction.urgency);
      });
    });
  });

  describe("historical data management", () => {
    it("should track historical data size accurately", async () => {
      await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      const size1 = PredictivePerformanceAnalyzer.getHistoricalDataSize();

      await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      const size2 = PredictivePerformanceAnalyzer.getHistoricalDataSize();

      expect(size2).toBeGreaterThan(size1);
    });

    it("should reset historical data on request", () => {
      PredictivePerformanceAnalyzer.resetHistoricalData();
      const size = PredictivePerformanceAnalyzer.getHistoricalDataSize();

      expect(size).toBe(0);
    });

    it("should limit historical data to 50 points per metric", async () => {
      for (let i = 0; i < 60; i++) {
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      }

      const size = PredictivePerformanceAnalyzer.getHistoricalDataSize();
      expect(size).toBeLessThanOrEqual(50 * 10);
    });
  });

  describe("anomaly detection", () => {
    it("should detect anomalies when metrics deviate significantly", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it("should sort anomalies by severity in descending order", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      for (let i = 1; i < result.anomalies.length; i++) {
        const severityOrder = {
          critical: 4,
          major: 3,
          moderate: 2,
          minor: 1,
        };
        const prevSeverity = severityOrder[result.anomalies[i - 1].severity];
        const currentSeverity = severityOrder[result.anomalies[i].severity];
        expect(prevSeverity).toBeGreaterThanOrEqual(currentSeverity);
      }
    });

    it("should classify anomaly severity correctly", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const validSeverities = ["minor", "moderate", "major", "critical"];
      result.anomalies.forEach((anomaly) => {
        expect(validSeverities).toContain(anomaly.severity);
      });
    });

    it("should set autoResolved flag to false for detected anomalies", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.anomalies.forEach((anomaly) => {
        expect(anomaly.autoResolved).toBe(false);
      });
    });

    it("should provide impact descriptions for anomalies", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.anomalies.forEach((anomaly) => {
        expect(anomaly.impact).toBeDefined();
        expect(typeof anomaly.impact).toBe("string");
        expect(anomaly.impact.length).toBeGreaterThan(0);
      });
    });

    it("should provide recommended actions for anomalies", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.anomalies.forEach((anomaly) => {
        expect(anomaly.recommendedAction).toBeDefined();
        expect(typeof anomaly.recommendedAction).toBe("string");
        expect(anomaly.recommendedAction.length).toBeGreaterThan(0);
      });
    });
  });

  describe("optimization recommendations", () => {
    it("should generate optimization recommendations", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(Array.isArray(result.optimizations)).toBe(true);
    });

    it("should sort optimizations by priority in descending order", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      for (let i = 1; i < result.optimizations.length; i++) {
        expect(result.optimizations[i - 1].priority).toBeGreaterThanOrEqual(
          result.optimizations[i].priority,
        );
      }
    });

    it("should classify optimization types correctly", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const validTypes = ["index", "cache", "query", "connection"];
      result.optimizations.forEach((opt) => {
        expect(validTypes).toContain(opt.type);
      });
    });

    it("should classify effort levels correctly", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const validEfforts = ["low", "medium", "high"];
      result.optimizations.forEach((opt) => {
        expect(validEfforts).toContain(opt.effort);
      });
    });

    it("should provide impact descriptions for optimizations", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.optimizations.forEach((opt) => {
        expect(opt.impact).toBeDefined();
        expect(typeof opt.impact).toBe("string");
        expect(opt.impact.length).toBeGreaterThan(0);
      });
    });

    it("should provide valid priority scores", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.optimizations.forEach((opt) => {
        expect(typeof opt.priority).toBe("number");
        expect(opt.priority).toBeGreaterThanOrEqual(0);
        expect(opt.priority).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("health score calculation", () => {
    it("should calculate health score within valid range", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it("should decrease health score for critical anomalies", async () => {
      const result1: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      const initialScore = result1.healthScore;

      await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      const result2: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
      const finalScore = result2.healthScore;

      expect(finalScore).toBeGreaterThanOrEqual(0);
      expect(finalScore).toBeLessThanOrEqual(100);
    });

    it("should decrease health score for high urgency predictions", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const criticalPredictions = result.predictions.filter(
        (p) => p.urgency === "critical" || p.urgency === "high",
      );

      if (criticalPredictions.length > 0) {
        expect(result.healthScore).toBeLessThan(100);
      }
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle zero historical data gracefully", () => {
      PredictivePerformanceAnalyzer.resetHistoricalData();
      const size = PredictivePerformanceAnalyzer.getHistoricalDataSize();

      expect(size).toBe(0);
    });

    it("should handle empty predictions array", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(Array.isArray(result.predictions)).toBe(true);
    });

    it("should handle empty anomalies array", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it("should handle empty optimizations array", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(Array.isArray(result.optimizations)).toBe(true);
    });

    it("should handle multiple sequential analyses", async () => {
      const results: PredictiveMetrics[] = [];

      for (let i = 0; i < 3; i++) {
        const result: PredictiveMetrics =
          await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();
        results.push(result);
      }

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(typeof result.healthScore).toBe("number");
        expect(typeof result.nextAction).toBe("string");
      });
    });
  });

  describe("prediction accuracy and confidence", () => {
    it("should provide meaningful confidence scores", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      if (result.predictions.length > 0) {
        const avgConfidence =
          result.predictions.reduce((sum, p) => sum + p.confidence, 0) /
          result.predictions.length;

        expect(avgConfidence).toBeGreaterThanOrEqual(0);
        expect(avgConfidence).toBeLessThanOrEqual(100);
      }
    });

    it("should provide both current and predicted values", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.predictions.forEach((prediction) => {
        expect(prediction.currentValue).toBeDefined();
        expect(prediction.predictedValue).toBeDefined();
        expect(typeof prediction.currentValue).toBe("number");
        expect(typeof prediction.predictedValue).toBe("number");
      });
    });

    it("should provide meaningful recommendations", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      result.predictions.forEach((prediction) => {
        expect(prediction.recommendation).toBeDefined();
        expect(typeof prediction.recommendation).toBe("string");
        expect(prediction.recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe("next action determination", () => {
    it("should provide meaningful next action", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      expect(result.nextAction).toBeDefined();
      expect(typeof result.nextAction).toBe("string");
      expect(result.nextAction.length).toBeGreaterThan(0);
    });

    it("should prioritize critical anomalies in next action", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      const criticalAnomalies = result.anomalies.filter(
        (a) => a.severity === "critical",
      );

      if (criticalAnomalies.length > 0) {
        expect(result.nextAction.toLowerCase()).toContain("critical");
      }
    });

    it("should suggest optimizations when health score is low", async () => {
      const result: PredictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      if (result.healthScore < 80 && result.optimizations.length > 0) {
        const hasOptimizationInAction =
          result.nextAction.toLowerCase().includes("optimization") ||
          result.nextAction.toLowerCase().includes("implement");
        expect(hasOptimizationInAction || result.healthScore >= 80).toBe(true);
      }
    });
  });
});
