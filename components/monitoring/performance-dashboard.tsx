import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import { BaseCard } from "@/components/ui/base-card";
import { MetricCard } from "@/components/ui/metric-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import {
  ActivityIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { getUIText } from "@/lib/constants/ui-text";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  getTextColor,
  getBackgroundColor,
  getAccentColor,
  getStatusTheme,
  cn,
} from "@/lib/constants/ui-themes";
import {
  type PerformanceData,
  type PerformanceAlert,
  type ComputedPerformanceMetrics,
  getPerformanceStatus,
  isPerformanceData,
} from "@/lib/types/performance-types";

// Optimized metrics calculation hook
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

interface PerformanceDashboardProps {
  detailed?: boolean;
}

/**
 * PerformanceDashboard component for real-time performance monitoring
 *
 * Features:
 * - Real-time performance metrics display
 * - Performance score visualization
 * - Critical alerts and recommendations
 * - Bundle size analysis
 * - Auto-optimization controls
 * - Historical performance trends
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
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          setPerformanceData(data);
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch performance data:", error);
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

    // Auto-refresh effect with initial fetch
    useEffect(() => {
      // Initial data fetch
      autoRefreshData();

      if (autoRefresh) {
        const interval = setInterval(autoRefreshData, 30000); // 30 seconds
        return () => clearInterval(interval);
      }
    }, [autoRefresh, autoRefreshData]);

    // Auto-optimization function
    const applyOptimizations = async () => {
      try {
        const response = await fetch(
          "/api/performance/optimization?optimize=true",
        );
        const data = await response.json();

        // Refresh data after optimization
        refreshPerformanceData();

        // eslint-disable-next-line no-console
        console.log(
          "Auto-optimizations applied:",
          data.optimization.autoOptimizations,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to apply optimizations:", error);
      }
    };

    // Calculate performance status using optimized metrics
    const performanceStatus = useMemo((): StatusType => {
      const status = getPerformanceStatus(metrics?.performanceScore);
      return status as StatusType;
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
          <div className="animate-pulse">
            <div
              className={cn(
                "h-4 rounded w-1/4 mb-2",
                getBackgroundColor("muted"),
              )}
            ></div>
            <div
              className={cn("h-3 rounded w-1/3", getBackgroundColor("muted"))}
            ></div>
          </div>
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
              status={performanceStatus as StatusType}
              size="md"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                autoRefresh
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : getBackgroundColor("subtle") + " " + getTextColor("body"),
              )}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>

            <button
              onClick={applyOptimizations}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                getAccentColor("blue", "background"),
                getAccentColor("blue", "text"),
                "hover:bg-blue-200 dark:hover:bg-blue-800",
              )}
            >
              Auto-Optimize
            </button>

            <button
              onClick={refreshPerformanceData}
              className={cn(
                "p-2 transition-colors",
                getTextColor("muted"),
                "hover:text-gray-800 dark:hover:text-gray-200",
              )}
              disabled={loading}
            >
              <div className={loading ? "animate-spin" : ""}>
                <TrendingUpIcon />
              </div>
            </button>
          </div>
        </div>

        {/* Performance Score Overview - Using optimized metrics hook */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Performance Score"
              value={`${metrics.performanceScore}%`}
              status={performanceStatus}
            />

            <MetricCard
              title="Bundle Size"
              value={`${metrics.bundleSizeKB}KB`}
              subtitle={`${metrics.bundleSizeGzippedKB}KB gzipped`}
              status={metrics.bundleSizeKB > 1024 ? "unhealthy" : "healthy"}
            />

            <MetricCard
              title="Compression"
              value={`${metrics.compressionRate}%`}
              subtitle={`${metrics.bandwidthSavedKB}KB saved`}
              status={metrics.compressionRate > 30 ? "healthy" : "degraded"}
            />

            <MetricCard
              title="Active Alerts"
              value={metrics.alertCount}
              subtitle={getUIText("monitoring", "criticalWarnings")}
              status={metrics.alertCount === 0 ? "healthy" : "degraded"}
            />
          </div>
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
