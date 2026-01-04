import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
import {
  getTextColor,
  getBackgroundColor,
  getAccentColor,
  getStatusTheme,
  cn,
} from "@/lib/constants/ui-themes";

// Debounce hook for performance optimization
function useDebounce<T extends () => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(), delay);
    }) as T,
    [callback, delay],
  ) as T;
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
export const PerformanceDashboard = React.memo(
  function PerformanceDashboardComponent({
    detailed = false,
  }: PerformanceDashboardProps) {
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

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
    const debouncedRefresh = useDebounce(refreshPerformanceDataInner, 1000);

    // Click handler for manual refresh
    const refreshPerformanceData = useCallback(() => {
      const controller = new AbortController();
      debouncedRefresh(controller.signal);
    }, [debouncedRefresh]);

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
        await refreshPerformanceData();

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

    // Calculate performance status
    const performanceStatus = useMemo(() => {
      if (!performanceData) return "unknown";

      const score = performanceData.performance?.score || 0;
      if (score >= 90) return "healthy";
      if (score >= 70) return "degraded";
      return "unhealthy";
    }, [performanceData]);

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

        {/* Performance Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Performance Score"
            value={`${performanceData?.performance?.score || 0}%`}
            status={performanceStatus as StatusType}
          />

          <MetricCard
            title="Bundle Size"
            value={`${Math.round((performanceData?.bundle?.totalSize || 0) / 1024)}KB`}
            subtitle={`${Math.round((performanceData?.bundle?.gzippedSize || 0) / 1024)}KB gzipped`}
            status={
              (performanceData?.bundle?.totalSize || 0) > 1024 * 1024
                ? "unhealthy"
                : "healthy"
            }
          />

          <MetricCard
            title="Compression"
            value={`${performanceData?.compression?.compressionRatePercent || 0}%`}
            subtitle={`${performanceData?.compression?.bandwidthSavedKB || 0}KB saved`}
            status={
              (performanceData?.compression?.compressionRatePercent || 0) > 30
                ? "healthy"
                : "degraded"
            }
          />

          <MetricCard
            title="Active Alerts"
            value={performanceData?.performance?.alertCount || 0}
            subtitle="Critical warnings"
            status={
              (performanceData?.performance?.alertCount || 0) === 0
                ? "healthy"
                : "degraded"
            }
          />
        </div>

        {/* Critical Alerts */}
        {performanceData?.performance?.alerts?.length > 0 && (
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
              {performanceData.performance.alerts
                .filter((alert: any) => alert.type === "critical")
                .slice(0, 3)
                .map((alert: any, index: number) => (
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
                          : "At threshold"}
                      </span>
                    </div>
                    <p className="text-sm opacity-90">{alert.recommendation}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Wins */}
        {performanceData?.optimization?.quickWins?.length > 0 && (
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
              {performanceData.optimization.quickWins.map(
                (win: string, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border",
                      getAccentColor("blue", "background"),
                    )}
                  >
                    <p
                      className={cn("text-sm", getAccentColor("blue", "text"))}
                    >
                      {win}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className={cn("mt-4 text-xs", getTextColor("muted"))}>
          Last updated:{" "}
          {performanceData?.timestamp
            ? new Date(performanceData.timestamp).toLocaleString()
            : "Never"}
        </div>
      </BaseCard>
    );
  },
);
