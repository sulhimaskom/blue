"use client";

import { useMonitoring } from "@/lib/hooks/use-monitoring";
import { useMonitoringDashboardState } from "@/lib/hooks/use-monitoring-dashboard-state";
import {
  DashboardHeader,
  DashboardLayout,
} from "@/components/monitoring/dashboard-layout";
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
    <DashboardLayout
      header={
        <DashboardHeader
          autoRefresh={autoRefresh}
          loading={loading}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          onManualRefresh={refreshData}
        />
      }
      error={error}
      loading={loading}
      hasData={hasData}
    >
      {/* System Health Overview */}
      {health && (
        <SystemHealthOverview
          health={health}
          expandedService={expandedService}
          onToggleServiceExpansion={toggleServiceExpansion}
        />
      )}

      {/* Performance Metrics with loading state */}
      <PerformanceMetrics metrics={metrics || undefined} loading={loading} />

      {/* Advanced Performance Optimization Dashboard - Lazy loaded for performance */}
      <Suspense fallback={<DashboardSkeleton />}>
        <PerformanceDashboard detailed={false} />
      </Suspense>

      {/* Footer with Enhanced Status */}
      <DashboardFooter
        loading={loading}
        autoRefresh={autoRefresh}
        lastRefresh={lastRefresh}
      />
    </DashboardLayout>
  );
}
