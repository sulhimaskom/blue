import { useMemo } from "react";
import type { StatusType } from "@/components/ui/status-indicator";
import { UnifiedMetricsCalculator } from "@/lib/services/unified-metrics-calculator";

/**
 * Performance metrics interface for the hook
 */
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
  cacheHitRate?: number;
  bundleSize?: number;
  compressionRate?: number;
}

/**
 * Component status interface for granular status tracking
 */
export interface ComponentStatus {
  component: string;
  status: StatusType;
  score: number;
  issues: string[];
}

/**
 * Performance status hook return interface
 */
export interface UsePerformanceStatusReturn {
  /** Overall system status based on all metrics */
  overallStatus: StatusType;
  /** Overall performance score (0-100) */
  overallScore: number;
  /** Individual component statuses */
  componentStatuses: ComponentStatus[];
  /** Status text for UI display */
  statusText: string;
  /** Number of healthy components */
  healthyComponents: number;
  /** Total number of components evaluated */
  totalComponents: number;
}

/**
 * Performance status determination hook following atomic modularity principles
 *
 * Hook Implementation (blueprint.md compliance):
 * - Extracts status determination logic from UI components
 * - Centralizes performance status calculations in reusable hook
 * - Zero business logic in UI components principle
 * - Atomic functionality with single responsibility
 * - Memoized calculations for optimal performance
 *
 * Architectural Benefits:
 * - Eliminates duplicate status determination logic across components
 * - Consistent status calculation algorithms
 * - Improved testability with isolated hook logic
 * - Enhanced maintainability through centralized status logic
 * - Performance optimization with useMemo dependencies
 *
 * Design Principles Applied:
 * - Atomic Modularity: Hook handles only status determination
 * - Service Layer Compliance: Uses UnifiedMetricsCalculator for calculations
 * - React Best Practices: Proper memoization and dependency management
 * - Type Safety: Comprehensive TypeScript interfaces
 * - Reusability: Can be used across any performance monitoring component
 *
 * Usage Example:
 * ```typescript
 * const metrics = {
 *   responseTime: 250,
 *   throughput: 1000,
 *   errorRate: 0.1,
 *   cacheHitRate: 85
 * };
 *
 * const { overallStatus, componentStatuses, overallScore } = usePerformanceStatus(metrics);
 * // Returns: { overallStatus: 'healthy', overallScore: 92, ... }
 * ```
 */
export function usePerformanceStatus(
  metrics: PerformanceMetrics,
): UsePerformanceStatusReturn {
  const result = useMemo(() => {
    // Calculate component-wise statuses
    const componentStatuses: ComponentStatus[] = [];

    // Response time component
    const responseTimeScore =
      UnifiedMetricsCalculator.calculatePerformanceScore({
        responseTime: metrics.responseTime,
        throughput: 0,
        errorRate: 0,
      });
    componentStatuses.push({
      component: "Response Time",
      status:
        metrics.responseTime > 1000
          ? "unhealthy"
          : metrics.responseTime > 500
            ? "degraded"
            : "healthy",
      score: responseTimeScore,
      issues:
        metrics.responseTime > 500
          ? [`Slow response: ${metrics.responseTime}ms`]
          : [],
    });

    // Error rate component
    const errorRateScore = UnifiedMetricsCalculator.calculatePerformanceScore({
      responseTime: 0,
      throughput: 0,
      errorRate: metrics.errorRate,
    });
    componentStatuses.push({
      component: "Error Rate",
      status:
        metrics.errorRate > 10
          ? "unhealthy"
          : metrics.errorRate > 5
            ? "degraded"
            : "healthy",
      score: errorRateScore,
      issues:
        metrics.errorRate > 5 ? [`High error rate: ${metrics.errorRate}%`] : [],
    });

    // Throughput component
    if (metrics.throughput > 0) {
      const throughputScore = Math.min(
        100,
        Math.round((metrics.throughput / 1000) * 100),
      );
      componentStatuses.push({
        component: "Throughput",
        status: metrics.throughput < 100 ? "degraded" : "healthy",
        score: throughputScore,
        issues:
          metrics.throughput < 100
            ? [`Low throughput: ${metrics.throughput}/s`]
            : [],
      });
    }

    // CPU component
    if (metrics.cpuUsage !== undefined) {
      const cpuScore = Math.max(0, 100 - metrics.cpuUsage);
      componentStatuses.push({
        component: "CPU Usage",
        status:
          metrics.cpuUsage > 90
            ? "unhealthy"
            : metrics.cpuUsage > 70
              ? "degraded"
              : "healthy",
        score: cpuScore,
        issues:
          metrics.cpuUsage > 70 ? [`High CPU usage: ${metrics.cpuUsage}%`] : [],
      });
    }

    // Memory component
    if (metrics.memoryUsage !== undefined) {
      const memoryScore = Math.max(0, 100 - metrics.memoryUsage);
      componentStatuses.push({
        component: "Memory Usage",
        status:
          metrics.memoryUsage > 90
            ? "unhealthy"
            : metrics.memoryUsage > 75
              ? "degraded"
              : "healthy",
        score: memoryScore,
        issues:
          metrics.memoryUsage > 75
            ? [`High memory usage: ${metrics.memoryUsage}%`]
            : [],
      });
    }

    // Cache hit rate component
    if (metrics.cacheHitRate !== undefined) {
      const cacheScore = metrics.cacheHitRate;
      componentStatuses.push({
        component: "Cache Hit Rate",
        status:
          metrics.cacheHitRate < 60
            ? "unhealthy"
            : metrics.cacheHitRate < 80
              ? "degraded"
              : "healthy",
        score: cacheScore,
        issues:
          metrics.cacheHitRate < 80
            ? [`Low cache hit rate: ${metrics.cacheHitRate}%`]
            : [],
      });
    }

    // Bundle size component
    if (metrics.bundleSize !== undefined) {
      const bundleSizeKB = Math.round(metrics.bundleSize / 1024);
      const bundleScore = Math.max(
        0,
        100 - Math.round((bundleSizeKB / 2048) * 100),
      );
      componentStatuses.push({
        component: "Bundle Size",
        status:
          bundleSizeKB > 2048
            ? "unhealthy"
            : bundleSizeKB > 1024
              ? "degraded"
              : "healthy",
        score: bundleScore,
        issues:
          bundleSizeKB > 1024 ? [`Large bundle size: ${bundleSizeKB}KB`] : [],
      });
    }

    // Calculate overall status
    const healthyComponents = componentStatuses.filter(
      (c) => c.status === "healthy",
    ).length;
    const totalComponents = componentStatuses.length;
    const { status: overallStatus, statusText } =
      UnifiedMetricsCalculator.determineStatusFromScore(
        totalComponents > 0
          ? Math.round((healthyComponents / totalComponents) * 100)
          : 0,
      );

    // Calculate overall score (average of all components)
    const overallScore =
      componentStatuses.length > 0
        ? Math.round(
            componentStatuses.reduce((sum, c) => sum + c.score, 0) /
              componentStatuses.length,
          )
        : 0;

    return {
      overallStatus,
      overallScore,
      componentStatuses,
      statusText,
      healthyComponents,
      totalComponents,
    };
  }, [metrics]);

  return result;
}
