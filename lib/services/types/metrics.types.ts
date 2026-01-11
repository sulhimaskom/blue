/**
 * Type definitions for metrics calculator service
 */

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface MetricsCalculationOptions {
  includePercentiles?: boolean;
  customThresholds?: {
    errorRate?: number;
    latency?: number;
  };
  timeWindow?: {
    start: Date;
    end: Date;
  };
}

export interface MetricsCalculationResult {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  percentiles?: Record<string, number>;
  thresholdsExceeded?: string[];
}

export interface PerformanceMetrics {
  requests: number;
  errors: number;
  latency: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
}

export interface MetricsInputData {
  dataPoints: MetricDataPoint[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  aggregation?: 'sum' | 'average' | 'min' | 'max';
}