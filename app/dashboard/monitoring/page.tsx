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

      {/* Footer with Enhanced Status */}
      <DashboardFooter
        loading={loading}
        autoRefresh={autoRefresh}
        lastRefresh={lastRefresh}
      />
    </DashboardLayout>
  );
}
