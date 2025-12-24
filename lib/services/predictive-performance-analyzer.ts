import { logger } from "../logger";
import { DatabasePerformanceMonitor } from "./database-performance-monitor";
import { BlueprintQueryOptimizer } from "../db/blueprint-query-optimizer";
import { DatabaseIndexer } from "../db/indexes";

/**
 * Predictive Performance Analytics Engine
 * Uses historical data and machine learning-inspired patterns for performance optimization
 */

export interface PerformancePrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeHorizon: "1h" | "6h" | "24h" | "7d";
  confidence: number; // 0-100
  recommendation: string;
  urgency: "low" | "medium" | "high" | "critical";
}

export interface PerformanceAnomaly {
  detectedAt: Date;
  metric: string;
  severity: "minor" | "moderate" | "major" | "critical";
  description: string;
  impact: string;
  recommendedAction: string;
  autoResolved: boolean;
}

export interface PredictiveMetrics {
  predictions: PerformancePrediction[];
  anomalies: PerformanceAnomaly[];
  optimizations: Array<{
    type: "index" | "cache" | "query" | "connection";
    impact: string;
    effort: "low" | "medium" | "high";
    priority: number;
  }>;
  healthScore: number; // 0-100
  nextAction: string;
}

export class PredictivePerformanceAnalyzer {
  private static historicalData: Map<string, number[]> = new Map();
  private static anomalyThresholds = {
    queryLatency: 500, // ms
    errorRate: 5, // %
    connectionUtilization: 85, // %
    cacheHitRate: 70, // %
  };

  /**
   * Generate comprehensive predictive performance analysis
   */
  static async generatePredictiveAnalysis(): Promise<PredictiveMetrics> {
    logger.info("Starting predictive performance analysis");

    try {
      // Collect current performance metrics
      const currentMetrics = await this.collectCurrentMetrics();

      // Generate predictions based on historical trends
      const predictions = await this.generatePredictions(currentMetrics);

      // Detect performance anomalies
      const anomalies = await this.detectAnomalies(currentMetrics);

      // Recommend optimizations based on patterns
      const optimizations =
        await this.generateOptimizationRecommendations(currentMetrics);

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(
        currentMetrics,
        predictions,
        anomalies,
      );

      // Determine next best action
      const nextAction = this.determineNextAction(
        optimizations,
        anomalies,
        predictions,
        healthScore,
      );

      logger.info("Predictive performance analysis completed", {
        predictionsCount: predictions.length,
        anomaliesCount: anomalies.length,
        healthScore,
        topPriority: optimizations[0]?.type || "none",
      });

      return {
        predictions,
        anomalies,
        optimizations,
        healthScore,
        nextAction,
      };
    } catch (error) {
      logger.error("Predictive analysis failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        predictions: [],
        anomalies: [],
        optimizations: [],
        healthScore: 50,
        nextAction: "Enable performance monitoring",
      };
    }
  }

  /**
   * Collect current performance metrics from all monitoring systems
   */
  private static async collectCurrentMetrics(): Promise<Map<string, number>> {
    const metrics = new Map<string, number>();

    try {
      // Database performance metrics
      const monitoringResults =
        await DatabasePerformanceMonitor.monitorAndAlert();
      metrics.set("queryLatency", monitoringResults.metrics.queryLatency);
      metrics.set("throughput", monitoringResults.metrics.throughput);
      metrics.set("errorRate", monitoringResults.metrics.errorRate || 0);
      metrics.set(
        "connectionHealth",
        monitoringResults.healthStatus === "healthy" ? 100 : 0,
      );

      // Query optimization metrics
      const optimizationMetrics =
        BlueprintQueryOptimizer.getOptimizationMetrics();
      metrics.set("totalOptimizations", optimizationMetrics.totalOptimizations);
      metrics.set("averageImprovement", optimizationMetrics.averageImprovement);

      // Database indexing coverage
      const indexAnalysis = await DatabaseIndexer.analyzeIndexUsage();
      const totalRecommended = 15; // Approximate number of recommended indexes
      const coverageRatio =
        indexAnalysis.currentIndexes.length / totalRecommended;
      metrics.set("indexCoverage", coverageRatio * 100);

      // Cache performance (simulated - would integrate with Redis cache stats)
      metrics.set("cacheHitRate", 85); // Placeholder - would get from actual cache metrics

      // Connection utilization (simulated - would get from connection pool metrics)
      metrics.set("connectionUtilization", 65); // Placeholder

      return metrics;
    } catch (error) {
      logger.warn("Failed to collect some performance metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return metrics;
    }
  }

  /**
   * Generate performance predictions using trend analysis
   */
  private static async generatePredictions(
    currentMetrics: Map<string, number>,
  ): Promise<PerformancePrediction[]> {
    const predictions: PerformancePrediction[] = [];

    for (const [metric, value] of currentMetrics.entries()) {
      // Store historical data
      if (!this.historicalData.has(metric)) {
        this.historicalData.set(metric, []);
      }
      const historical = this.historicalData.get(metric)!;
      historical.push(value);

      // Keep only last 50 data points
      if (historical.length > 50) {
        historical.shift();
      }

      // Only generate predictions if we have sufficient data
      if (historical.length >= 3) {
        const timeHorizons: Array<"1h" | "6h" | "24h" | "7d"> = [
          "1h",
          "6h",
          "24h",
          "7d",
        ];

        for (const horizon of timeHorizons) {
          const prediction = this.predictMetricTrend(
            metric,
            historical,
            horizon,
            value,
          );
          if (prediction) {
            predictions.push(prediction);
          }
        }
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 10); // Top 10 predictions
  }

  /**
   * Predict individual metric trends using simple linear regression
   */
  private static predictMetricTrend(
    metric: string,
    historical: number[],
    timeHorizon: "1h" | "6h" | "24h" | "7d",
    currentValue: number,
  ): PerformancePrediction | null {
    if (historical.length < 3) return null;

    // Simple trend calculation
    const recentTrend = this.calculateTrend(historical.slice(-10));
    const trendMultiplier = this.getTimeHorizonMultiplier(timeHorizon);
    const predictedValue = currentValue + recentTrend * trendMultiplier;

    // Calculate confidence based on data stability
    const variance = this.calculateVariance(historical);
    const confidence = Math.max(
      0,
      Math.min(100, 100 - (variance / Math.max(currentValue, 1)) * 100),
    );

    // Generate recommendation based on prediction
    const recommendation = this.generatePredictionRecommendation(
      metric,
      currentValue,
      predictedValue,
      timeHorizon,
    );

    const urgency = this.calculateUrgency(
      metric,
      currentValue,
      predictedValue,
      confidence,
    );

    return {
      metric,
      currentValue,
      predictedValue,
      timeHorizon,
      confidence: Math.round(confidence),
      recommendation,
      urgency,
    };
  }

  /**
   * Calculate trend using linear regression
   */
  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    return slope || 0;
  }

  /**
   * Calculate variance of data points
   */
  private static calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get time horizon multiplier for predictions
   */
  private static getTimeHorizonMultiplier(
    horizon: "1h" | "6h" | "24h" | "7d",
  ): number {
    switch (horizon) {
      case "1h":
        return 1;
      case "6h":
        return 6;
      case "24h":
        return 24;
      case "7d":
        return 168;
      default:
        return 1;
    }
  }

  /**
   * Generate recommendation based on prediction
   */
  private static generatePredictionRecommendation(
    metric: string,
    currentValue: number,
    predicted: number,
    horizon: "1h" | "6h" | "24h" | "7d",
  ): string {
    const changePercent =
      currentValue !== 0
        ? ((predicted - currentValue) / currentValue) * 100
        : 0;

    if (metric === "queryLatency" && predicted > 300) {
      return `Query latency predicted to increase ${changePercent.toFixed(1)}% to ${predicted.toFixed(0)}ms in ${horizon}. Consider query optimization or additional indexing.`;
    }

    if (metric === "errorRate" && predicted > 3) {
      return `Error rate predicted to rise to ${predicted.toFixed(1)}% in ${horizon}. Investigate error patterns and implement circuit breakers.`;
    }

    if (metric === "connectionUtilization" && predicted > 80) {
      return `Connection utilization predicted to reach ${predicted.toFixed(0)}% in ${horizon}. Scale connection pool or implement connection throttling.`;
    }

    if (metric === "cacheHitRate" && predicted < 70) {
      return `Cache hit rate predicted to drop to ${predicted.toFixed(0)}% in ${horizon}. Review cache invalidation strategy and consider cache warming.`;
    }

    if (Math.abs(changePercent) > 20) {
      return `Significant ${changePercent > 0 ? "increase" : "decrease"} in ${metric} predicted (${changePercent.toFixed(1)}% in ${horizon}). Monitor closely and prepare optimization strategies.`;
    }

    return `${metric} predicted to stay within normal range (${predicted.toFixed(1)} in ${horizon}).`;
  }

  /**
   * Calculate urgency level for predictions
   */
  private static calculateUrgency(
    metric: string,
    _currentValue: number,
    predicted: number,
    confidence: number,
  ): "low" | "medium" | "high" | "critical" {
    const threshold =
      this.anomalyThresholds[metric as keyof typeof this.anomalyThresholds];
    if (!threshold) return "low";

    const adjustedThreshold = metric === "cacheHitRate" ? 85 : threshold;
    const willExceedThreshold = predicted > adjustedThreshold;

    if (!willExceedThreshold) return "low";

    const severity =
      (predicted - adjustedThreshold) / Math.max(adjustedThreshold, 1);

    if (confidence < 50) return "low";
    if (severity > 0.5) return "critical";
    if (severity > 0.25) return "high";
    if (severity > 0.1) return "medium";
    return "low";
  }

  /**
   * Detect performance anomalies
   */
  private static async detectAnomalies(
    currentMetrics: Map<string, number>,
  ): Promise<PerformanceAnomaly[]> {
    const anomalies: PerformanceAnomaly[] = [];

    for (const [metric, value] of currentMetrics.entries()) {
      const threshold =
        this.anomalyThresholds[metric as keyof typeof this.anomalyThresholds];
      if (!threshold) continue;

      const historical = this.historicalData.get(metric) || [];

      // Check for significant deviations from historical average
      if (historical.length >= 5) {
        const average =
          historical.reduce((sum, val) => sum + val, 0) / historical.length;
        const standardDeviation = Math.sqrt(this.calculateVariance(historical));
        const deviation =
          Math.abs(value - average) / Math.max(standardDeviation, 1);

        if (deviation > 2) {
          const anomaly = this.createAnomaly(metric, value, average, deviation);
          anomalies.push(anomaly);
        }
      }

      // Check absolute threshold violations
      if (this.exceedsThreshold(metric, value, threshold)) {
        const existingAnomaly = anomalies.find((a) => a.metric === metric);
        if (!existingAnomaly) {
          const anomaly = this.createThresholdAnomaly(metric, value, threshold);
          anomalies.push(anomaly);
        }
      }
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, major: 3, moderate: 2, minor: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Check if value exceeds threshold
   */
  private static exceedsThreshold(
    metric: string,
    value: number,
    threshold: number,
  ): boolean {
    const lowerIsBetter = ["queryLatency", "errorRate"].includes(metric);
    return lowerIsBetter ? value > threshold : value < threshold;
  }

  /**
   * Create anomaly from statistical deviation
   */
  private static createAnomaly(
    metric: string,
    current: number,
    average: number,
    deviation: number,
  ): PerformanceAnomaly {
    const changePercent =
      average !== 0 ? ((current - average) / average) * 100 : 0;

    let severity: PerformanceAnomaly["severity"];
    if (deviation > 4) severity = "critical";
    else if (deviation > 3) severity = "major";
    else if (deviation > 2) severity = "moderate";
    else severity = "minor";

    return {
      detectedAt: new Date(),
      metric,
      severity,
      description: `${metric} has deviated ${deviation.toFixed(1)}σ from historical average (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}% change)`,
      impact: this.getAnomalyImpact(metric, current),
      recommendedAction: this.getAnomalyRecommendation(
        metric,
        current,
        average,
      ),
      autoResolved: false,
    };
  }

  /**
   * Create anomaly from threshold violation
   */
  private static createThresholdAnomaly(
    metric: string,
    current: number,
    threshold: number,
  ): PerformanceAnomaly {
    let severity: PerformanceAnomaly["severity"];
    const excess = (current - threshold) / Math.max(threshold, 1);

    if (excess > 1) severity = "critical";
    else if (excess > 0.5) severity = "major";
    else if (excess > 0.25) severity = "moderate";
    else severity = "minor";

    return {
      detectedAt: new Date(),
      metric,
      severity,
      description: `${metric} has exceeded acceptable threshold (current: ${current.toFixed(1)}, threshold: ${threshold})`,
      impact: this.getAnomalyImpact(metric, current),
      recommendedAction: this.getAnomalyRecommendation(
        metric,
        current,
        threshold,
      ),
      autoResolved: false,
    };
  }

  /**
   * Get anomaly impact description
   */
  private static getAnomalyImpact(metric: string, value: number): string {
    switch (metric) {
      case "queryLatency":
        return value > 1000
          ? "Severe user experience degradation"
          : "Noticeable slowdown in response times";
      case "errorRate":
        return value > 10
          ? "Critical system reliability issue"
          : "Increased error rate affecting some users";
      case "connectionUtilization":
        return value > 90
          ? "Risk of connection exhaustion"
          : "Potential connection bottlenecks under load";
      case "cacheHitRate":
        return "Increased database load and slower response times";
      case "throughput":
        return value < 10
          ? "System throughput below acceptable levels"
          : "Reduced system capacity";
      default:
        return "Performance degradation detected";
    }
  }

  /**
   * Get anomaly recommendation
   */
  private static getAnomalyRecommendation(
    metric: string,
    current: number,
    expected: number,
  ): string {
    // Use parameters to avoid ESLint warnings
    void current;
    void expected;

    switch (metric) {
      case "queryLatency":
        return "Run database optimization script, review slow queries, and consider additional indexing";
      case "errorRate":
        return "Investigate error logs, implement circuit breakers, and review recent deployments";
      case "connectionUtilization":
        return "Increase connection pool size or implement connection throttling";
      case "cacheHitRate":
        return "Review cache invalidation strategy and implement cache warming";
      case "throughput":
        return "Scale horizontally or optimize resource utilization";
      default:
        return "Monitor closely and investigate root cause";
    }
  }

  /**
   * Generate optimization recommendations
   */
  private static async generateOptimizationRecommendations(
    currentMetrics: Map<string, number>,
  ): Promise<
    Array<{
      type: "index" | "cache" | "query" | "connection";
      impact: string;
      effort: "low" | "medium" | "high";
      priority: number;
    }>
  > {
    const optimizations: Array<{
      type: "index" | "cache" | "query" | "connection";
      impact: string;
      effort: "low" | "medium" | "high";
      priority: number;
    }> = [];

    // Index optimizations
    const indexCoverage = currentMetrics.get("indexCoverage") || 0;
    if (indexCoverage < 80) {
      optimizations.push({
        type: "index",
        impact: `25-40% query performance improvement by reaching ${(indexCoverage + 20).toFixed(0)}% index coverage`,
        effort: "medium",
        priority: 85 - indexCoverage,
      });
    }

    // Cache optimizations
    const cacheHitRate = currentMetrics.get("cacheHitRate") || 0;
    if (cacheHitRate < 80) {
      optimizations.push({
        type: "cache",
        impact: `30-50% response time improvement by increasing cache hit rate to 85%+`,
        effort: "low",
        priority: 85 - cacheHitRate,
      });
    }

    // Query optimizations
    const queryLatency = currentMetrics.get("queryLatency") || 0;
    if (queryLatency > 200) {
      optimizations.push({
        type: "query",
        impact: `40-60% improvement in slow queries by optimizing query patterns`,
        effort: "high",
        priority: Math.min(100, queryLatency / 5),
      });
    }

    // Connection optimizations
    const connectionUtilization =
      currentMetrics.get("connectionUtilization") || 0;
    if (connectionUtilization > 75) {
      optimizations.push({
        type: "connection",
        impact: `Eliminate connection bottlenecks and improve scalability`,
        effort: "medium",
        priority: connectionUtilization - 75,
      });
    }

    return optimizations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate overall health score
   */
  private static calculateHealthScore(
    currentMetrics: Map<string, number>,
    predictions: PerformancePrediction[],
    anomalies: PerformanceAnomaly[],
  ): number {
    let score = 100;

    // Deduct points for current metric issues
    for (const [metric, value] of currentMetrics.entries()) {
      const threshold =
        this.anomalyThresholds[metric as keyof typeof this.anomalyThresholds];
      if (threshold && this.exceedsThreshold(metric, value, threshold)) {
        const exceedance = Math.abs(value - threshold) / Math.max(threshold, 1);
        score -= Math.min(30, exceedance * 20);
      }
    }

    // Deduct points for critical/major anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === "critical") score -= 25;
      else if (anomaly.severity === "major") score -= 15;
      else if (anomaly.severity === "moderate") score -= 8;
      else score -= 3;
    }

    // Deduct points for concerning predictions
    const concerningPredictions = predictions.filter(
      (p) => p.urgency === "critical" || p.urgency === "high",
    );
    score -= concerningPredictions.length * 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * Determine next best action
   */
  private static determineNextAction(
    optimizations: Array<{
      type: "index" | "cache" | "query" | "connection";
      impact: string;
      effort: "low" | "medium" | "high";
      priority: number;
    }>,
    anomalies: PerformanceAnomaly[],
    predictions: PerformancePrediction[],
    healthScore: number,
  ): string {
    // Check predictions for concerning trends to avoid ESLint warnings
    const criticalPredictions = predictions.filter(
      (p) => p.urgency === "critical",
    );

    // Critical anomalies take priority
    const criticalAnomalies = anomalies.filter(
      (a) => a.severity === "critical",
    );
    if (criticalAnomalies.length > 0) {
      return `Address ${criticalAnomalies.length} critical ${criticalAnomalies.length === 1 ? "anomaly" : "anomalies"} immediately`;
    }

    // High-priority optimizations
    const topOptimization = optimizations[0];
    if (topOptimization && topOptimization.priority > 70) {
      return `Implement ${topOptimization.type} optimization for ${topOptimization.impact.toLowerCase()}`;
    }

    // Check for critical predictions
    if (criticalPredictions.length > 0) {
      return `Address ${criticalPredictions.length} critical performance predictions`;
    }

    // Health-based recommendations
    if (healthScore < 60) {
      return "Run comprehensive database optimization and performance analysis";
    } else if (healthScore < 80) {
      return "Review performance recommendations and implement high-priority optimizations";
    } else if (healthScore < 95) {
      return "Monitor for performance improvements and fine-tune optimizations";
    }

    return "System performance is excellent - continue monitoring";
  }

  /**
   * Reset historical data (for testing or manual reset)
   */
  static resetHistoricalData(): void {
    this.historicalData.clear();
    logger.info("Historical performance data reset");
  }

  /**
   * Get current historical data size
   */
  static getHistoricalDataSize(): number {
    return Array.from(this.historicalData.values()).reduce(
      (total, data) => total + data.length,
      0,
    );
  }
}
