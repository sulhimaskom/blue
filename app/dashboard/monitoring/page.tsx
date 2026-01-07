"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useMonitoring } from "@/lib/hooks/use-monitoring";
import { useMonitoringDashboardState } from "@/lib/hooks/use-monitoring-dashboard-state";
import { DashboardHeader } from "@/components/monitoring/dashboard-layout";
import { SystemHealthOverview } from "@/components/monitoring/system-health-overview";
import { PerformanceMetrics } from "@/components/monitoring/performance-metrics";
import { DashboardFooter } from "@/components/monitoring/dashboard-footer";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, lazy, Suspense } from "react";

// Dynamic imports for performance optimization - reduces initial bundle size
const PerformanceDashboard = lazy(() =>
  import("@/components/monitoring/performance-dashboard").then((module) => ({
    default: module.PerformanceDashboard,
  })),
);

export default function MonitoringDashboard() {
  const {
    health,
    metrics,
    loading,
    autoRefresh,
    error,
    lastRefresh,
    refreshData,
    setAutoRefresh,
  } = useMonitoring({
    autoRefresh: true,
    refreshInterval: 30000,
    detailed: true,
  });

  const { expandedService, toggleServiceExpansion } =
    useMonitoringDashboardState();

  const hasData = !!(health || metrics);
  const pageVisibleRef = useRef(true);

  // Performance optimization: Pause refresh when page is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && autoRefresh) {
        // Pause refresh when page is hidden
        setAutoRefresh(false);
        pageVisibleRef.current = false;
      } else if (!document.hidden && !autoRefresh && !pageVisibleRef.current) {
        // Resume refresh when page becomes visible again
        setAutoRefresh(true);
        pageVisibleRef.current = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [autoRefresh, setAutoRefresh]);

  // Show skeleton loading state while loading initial data
  if (loading && !hasData) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-8">
          <DashboardHeader
            autoRefresh={autoRefresh}
            loading={loading}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onManualRefresh={refreshData}
          />
        </div>

        {/* Error Handling */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              Error loading monitoring data: {error}
            </p>
          </div>
        )}

        {/* System Health Overview */}
        {health && (
          <div className="mb-8">
            <SystemHealthOverview
              health={health}
              expandedService={expandedService}
              onToggleServiceExpansion={toggleServiceExpansion}
            />
          </div>
        )}

        {/* Performance Metrics with loading state */}
        <div className="mb-8">
          <PerformanceMetrics
            metrics={metrics || undefined}
            loading={loading}
          />
        </div>

        {/* Advanced Performance Optimization Dashboard - Lazy loaded for performance */}
        <div className="mb-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <PerformanceDashboard detailed={false} />
          </Suspense>
        </div>

        {/* Footer with Enhanced Status */}
        <div>
          <DashboardFooter
            loading={loading}
            autoRefresh={autoRefresh}
            lastRefresh={lastRefresh}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
