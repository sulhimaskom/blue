import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { ActivityIcon } from "@/components/ui/icons";
import {
  getTextColor,
  getBackgroundColor,
  cn,
} from "@/lib/constants/ui-themes";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { usePerformanceMetrics } from "@/lib/hooks/use-performance-metrics";
import { PerformanceMetrics } from "@/lib/types/webhook-types";
import { AutoOptimizationControls } from "./auto-optimization-controls";
import { AlertsPanel } from "./alerts-panel";
import { PerformanceScoreOverview } from "./performance-score-overview";

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
      useState<PerformanceMetrics | null>(null);
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
      if (!metrics?.performanceScore) return "unknown";

      if (metrics.performanceScore >= 90) return "healthy";
      if (metrics.performanceScore >= 70) return "degraded";
      return "unhealthy";
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
            performanceStatus={performanceStatus as StatusType}
          />
        )}

        {metrics && (
          <AlertsPanel alerts={metrics.alerts} quickWins={metrics.quickWins} />
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
