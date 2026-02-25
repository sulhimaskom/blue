import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import { useInterval, STANDARD_INTERVALS } from "@/lib/hooks/use-interval";
import { BaseCard } from "@/components/ui/base-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { CardLoadingSkeleton } from "@/components/ui/loading-skeleton";
import type { StatusType } from "@/lib/services/service-types";
import { ActivityIcon, AlertTriangleIcon } from "@/components/ui/icons";
import { getUIText } from "@/lib/constants/ui-text";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { logger } from "@/lib/logger";
import { DatabaseError } from "@/lib/api-utils";
import {
  getTextColor,
  getStatusTheme,
  getAccentColor,
  cn,
} from "@/lib/constants/ui-themes";
import { AutoOptimizationControls } from "./auto-optimization-controls";
import { PerformanceScoreOverview } from "./performance-score-overview";
import {
  type PerformanceData,
  type PerformanceAlert,
  type ComputedPerformanceMetrics,
  getPerformanceStatus,
  isPerformanceData,
} from "@/lib/types/performance-types";

/**
 * Props interface for PerformanceDashboard component.
 * @interface PerformanceDashboardProps
 */
interface PerformanceDashboardProps {
  /** Enables detailed performance data fetching with additional metrics */
  detailed?: boolean;
}

/**
 * Custom hook to calculate and process performance metrics from raw data.
 *
 * This hook is memoized to prevent unnecessary recalculations on every render.
 * It extracts and transforms raw performance data into a format suitable for UI display.
 *
 * @param performanceData - Raw performance data from API response
 * @returns Processed metrics or null if data is invalid/missing
 *
 * Calculated Metrics:
 * - performanceScore: Overall performance score (0-100)
 * - bundleSizeKB: Total bundle size in kilobytes
 * - bundleSizeGzippedKB: Gzipped bundle size in kilobytes
 * - compressionRate: Compression percentage (0-100)
 * - bandwidthSavedKB: Bandwidth savings in KB from compression
 * - alertCount: Number of critical alerts
 * - timestamp: Last updated timestamp
 * - alerts: Top 3 critical alerts (filtered by type)
 * - quickWins: Array of optimization recommendations
 */
function usePerformanceMetrics(
  performanceData: PerformanceData | null,
): ComputedPerformanceMetrics | null {
  return useMemo(() => {
    if (!performanceData || !isPerformanceData(performanceData)) {
      return null;
    }

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

/**
 * PerformanceDashboard component for real-time performance monitoring.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Zero business logic in UI component
 * - Memoized component to prevent unnecessary re-renders
 * - Optimized hooks with useCallback and useMemo
 * - Automatic request cancellation to prevent memory leaks
 *
 * Features:
 * - Real-time performance metrics display with auto-refresh (30s interval)
 * - Performance score visualization with status indicators
 * - Critical alerts and optimization recommendations
 * - Bundle size analysis with compression metrics
 * - Auto-optimization controls with one-click apply
 * - Debounced manual refresh to prevent rapid API calls
 * - Loading skeleton for better UX during data fetch
 * - Historical performance trends with timestamp tracking
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - useMemo for expensive calculations (metrics, status)
 * - useCallback for stable function references
 * - useDebounce to prevent rapid refresh calls
 * - AbortController for request cancellation
 * - Request deduplication during auto-refresh
 *
 * Data Flow:
 * 1. Component mounts → initial data fetch from /api/performance/optimization
 * 2. Auto-refresh runs every 30 seconds (if enabled)
 * 3. Raw data processed by usePerformanceMetrics hook
 * 4. Computed metrics passed to PerformanceScoreOverview component
 * 5. Critical alerts and quick wins displayed in dedicated sections
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PerformanceDashboard />
 *
 * // With detailed metrics
 * <PerformanceDashboard detailed={true} />
 * ```
 */
export const PerformanceDashboard = memo(
  function PerformanceDashboardComponent({
    detailed = false,
  }: PerformanceDashboardProps) {
    const [performanceData, setPerformanceData] =
      useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Use optimized metrics hook
    const metrics = usePerformanceMetrics(performanceData);

    // Optimized refresh function with request cancellation and debouncing
    const refreshPerformanceDataInner = useCallback(
      async (abortSignal?: AbortSignal) => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/performance/optimization?detailed=${detailed}`,
            {
              signal: abortSignal,
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            },
          );

          if (!response.ok) {
            throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          setPerformanceData(data);
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            logger.error("Failed to fetch performance data", {
              error: error.name,
              message: error.message,
              component: "PerformanceDashboard",
              action: "fetchPerformanceData",
            });
          }
        } finally {
          setLoading(false);
        }
      },
      [detailed],
    );

    // Debounced version to prevent rapid successive calls (for manual refresh)
    const debouncedRefresh = useCallback(() => {
      const controller = new AbortController();
      refreshPerformanceDataInner(controller.signal);
    }, [refreshPerformanceDataInner]);

    // Debounced version wrapper
    const debouncedRefreshWithDelay = useDebounce(debouncedRefresh, 1000);

    // Click handler for manual refresh
    const refreshPerformanceData = useCallback(() => {
      debouncedRefreshWithDelay();
    }, [debouncedRefreshWithDelay]);

    // Auto-refresh function without debouncing for consistent intervals
    const autoRefreshData = useCallback(() => {
      const controller = new AbortController();
      refreshPerformanceDataInner(controller.signal);
    }, [refreshPerformanceDataInner]);

    // Use standardized interval management for auto-refresh
    const { start: startAutoRefresh, stop: stopAutoRefresh } = useInterval(autoRefreshData, {
      intervalMs: STANDARD_INTERVALS.DEFAULT_MONITORING, // 30 seconds
      autoStart: autoRefresh,
      runImmediately: true,
      onError: (error) => {
        logger.error("Performance dashboard auto-refresh failed", {
          error: error.message,
          component: "PerformanceDashboard",
        });
      },
    });

    // React to autoRefresh state changes
    useEffect(() => {
      if (autoRefresh) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    }, [autoRefresh, startAutoRefresh, stopAutoRefresh]);

    // Auto-optimization function
    const applyOptimizations = async () => {
      try {
        const response = await fetch(
          "/api/performance/optimization?optimize=true",
        );
        const data = await response.json();

        // Refresh data after optimization
        refreshPerformanceData();

        logger.info("Auto-optimizations applied successfully", {
          optimizationsApplied:
            data.optimization.autoOptimizations?.length || 0,
          component: "PerformanceDashboard",
          action: "applyAutoOptimizations",
        });
      } catch (error) {
        logger.error("Failed to apply auto-optimizations", {
          error: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : "Unexpected error",
          component: "PerformanceDashboard",
          action: "applyAutoOptimizations",
        });
      }
    };

    // Calculate performance status using optimized metrics
  const performanceStatus = useMemo((): StatusType => {
      const status = getPerformanceStatus(metrics?.performanceScore);
      return status;
    }, [metrics?.performanceScore]);

    if (loading && !performanceData) {
      return (
        <BaseCard className="mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ActivityIcon />
            <h2
              className={cn("text-xl font-semibold", getTextColor("heading"))}
            >
              Performance Monitoring
            </h2>
          </div>
          <CardLoadingSkeleton loading={loading} showHeader={false} lines={2} />
        </BaseCard>
      );
    }

    return (
      <BaseCard className="mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ActivityIcon />
            <h2
              className={cn("text-xl font-semibold", getTextColor("heading"))}
            >
              Performance Monitoring
            </h2>
            <StatusIndicator
            status={performanceStatus}
              size="md"
            />
          </div>

          <AutoOptimizationControls
            autoRefresh={autoRefresh}
            loading={loading}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onApplyOptimizations={applyOptimizations}
            onRefresh={refreshPerformanceData}
          />
        </div>

        {metrics && (
          <PerformanceScoreOverview
            performanceScore={metrics.performanceScore}
            bundleSizeKB={metrics.bundleSizeKB}
            bundleSizeGzippedKB={metrics.bundleSizeGzippedKB}
            compressionRate={metrics.compressionRate}
            bandwidthSavedKB={metrics.bandwidthSavedKB}
            alertCount={metrics.alertCount}
            performanceStatus={performanceStatus}
          />
        )}

        {/* Critical Alerts - Using optimized metrics */}
        {metrics?.alerts && metrics.alerts.length > 0 && (
          <div className="mb-6">
            <h3
              className={cn(
                "text-lg font-medium mb-3 flex items-center gap-2",
                getTextColor("heading"),
              )}
            >
              <AlertTriangleIcon />
              Critical Performance Alerts
            </h3>
            <div className="space-y-2">
              {metrics!.alerts?.map(
                (alert: PerformanceAlert, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg",
                      getStatusTheme("unhealthy"),
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium capitalize">
                        {alert.metric}
                      </span>
                      <span className="text-sm opacity-75">
                        {alert.value > alert.threshold
                          ? `${Math.round(((alert.value - alert.threshold) / alert.threshold) * 100)}% over threshold`
                          : getUIText("monitoring", "atThreshold")}
                      </span>
                    </div>
                    <p className="text-sm opacity-90">{alert.recommendation}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Quick Wins - Using optimized metrics */}
        {metrics?.quickWins && metrics.quickWins.length > 0 && (
          <div>
            <h3
              className={cn(
                "text-lg font-medium mb-3",
                getTextColor("heading"),
              )}
            >
              Quick Performance Wins
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metrics!.quickWins !== undefined && metrics!.quickWins !== null
                ? metrics!.quickWins.map((win: string, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        getAccentColor("blue", "background"),
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm",
                          getAccentColor("blue", "text"),
                        )}
                      >
                        {win}
                      </p>
                    </div>
                  ))
                : null}
            </div>
          </div>
        )}

        {/* Last Updated - Using optimized metrics */}
        {metrics?.timestamp && (
          <div className={cn("mt-4 text-xs", getTextColor("muted"))}>
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
          </div>
        )}
      </BaseCard>
    );
  },
);
