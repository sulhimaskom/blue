import { useMemo } from "react";
import {
  PerformanceData,
  ComputedPerformanceMetrics,
  PerformanceAlert,
} from "@/lib/types/performance-types";

/**
 * usePerformanceMetrics hook for performance metrics calculation
 *
 * Transforms raw performance data into structured dashboard metrics
 * using useMemo for performance optimization. Handles data transformation,
 * filtering, and aggregation for performance monitoring.
 *
 * @param performanceData - Raw performance metrics from API
 * @returns Structured dashboard performance metrics or null if no data
 *
 * @example
 * ```tsx
 * const metrics = usePerformanceMetrics(performanceData);
 * if (metrics) {
 *   console.log('Performance Score:', metrics.performanceScore);
 *   console.log('Bundle Size:', metrics.bundleSizeKB, 'KB');
 * }
 * ```
 */
export function usePerformanceMetrics(
  performanceData: PerformanceData | null,
): ComputedPerformanceMetrics | null {
  return useMemo(() => {
    if (!performanceData) return null;

    const perf = performanceData.performance || {};
    const bundle = performanceData.bundle || {};
    const compression = performanceData.compression || {};

    return {
      performanceScore: perf.score || 0,
      bundleSizeKB: Math.round((bundle.totalSize || 0) / 1024),
      bundleSizeGzippedKB: Math.round((bundle.gzippedSize || 0) / 1024),
      compressionRate: compression.compressionRatePercent || 0,
      bandwidthSavedKB: compression.bandwidthSavedKB || 0,
      alertCount: perf.alertCount || 0,
      timestamp: performanceData.timestamp,
      alerts: (perf.alerts || [])
        .filter((alert: PerformanceAlert) => alert.type === "critical")
        .slice(0, 3),
      quickWins: performanceData.optimization?.quickWins || [],
    };
  }, [performanceData]);
}
