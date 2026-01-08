/**
 * Types and interfaces for Advanced Performance Dashboard components.
 * Centralized type definitions for performance metrics, AI optimization,
 * and predictive analytics data structures.
 */

/**
 * Comprehensive advanced performance metrics data structure containing system,
 * application, and database performance indicators with timestamp tracking.
 *
 * System Metrics:
 * - cpuUsage: Current CPU utilization percentage (0-100)
 * - memoryUsage: Memory utilization percentage (0-100)
 * - diskIOPS: Disk input/output operations per second
 * - networkLatency: Network response time in milliseconds
 *
 * Application Metrics:
 * - averageResponseTime: Mean API response time in milliseconds
 * - requestsPerSecond: Current request throughput
 * - errorRate: Error percentage of total requests (0-100)
 * - throughput: Data throughput in megabytes per second
 *
 * Database Metrics:
 * - connectionPool: Active database connections
 * - queryTime: Average query execution time in milliseconds
 * - slowQueries: Count of queries exceeding performance threshold
 * - cacheHitRate: Cache success percentage (0-100)
 */
export interface AdvancedPerformanceMetrics {
  timestamp: string;
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskIOPS: number;
    networkLatency: number;
  };
  application: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    throughput: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
}

/**
 * AI-powered cache optimization metrics containing optimization recommendations
 * with estimated cost savings and confidence scoring.
 */
export interface AICacheOptimizationMetrics {
  timestamp: string;
  optimizations: Array<{
    type: string;
    description: string;
    estimatedSavings: number;
    confidence: number;
    applied: boolean;
  }>;
  summary: {
    totalSavings: number;
    appliedOptimizations: number;
    pendingOptimizations: number;
    hitRateImprovement: number;
  };
}

/**
 * Predictive performance analytics data containing future performance predictions
 * with confidence scoring and actionable recommendations.
 */
export interface PredictivePerformanceData {
  timestamp: string;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
    severity: "low" | "medium" | "high";
    recommendations: string[];
  }>;
  summary: {
    totalPredictions: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}
