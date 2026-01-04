import { useState, useEffect, useCallback, useMemo } from "react";
import { MONITORING_REFRESH_INTERVAL } from "@/lib/utils/time-formatting";
import { monitoringService } from "@/lib/services/monitoring-service";
import type {
  SystemHealth,
  MetricsData,
  UseMonitoringOptions,
  UseMonitoringReturn,
} from "@/lib/services/service-types";

// Export types from centralized service-types for convenience
export type {
  SystemHealth,
  MetricsData,
  MetricSummary,
  UseMonitoringOptions,
  UseMonitoringReturn,
} from "@/lib/services/service-types";

export function useMonitoring(
  options: UseMonitoringOptions = {},
): UseMonitoringReturn {
  const {
    autoRefresh: defaultAutoRefresh = true,
    refreshInterval = MONITORING_REFRESH_INTERVAL,
    detailed = true,
  } = options;

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(defaultAutoRefresh);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    // Prevent concurrent refresh calls for performance
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Business logic now delegated to service layer (Service Layer principle compliance)
      const data = await monitoringService.fetchMonitoringData({ detailed });

      setHealth(data.health);
      setMetrics(data.metrics);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);

      // Don't clear existing data on error - allow stale data display
    } finally {
      setLoading(false);
    }
  }, [detailed, loading]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnObject = useMemo(
    () => ({
      health,
      metrics,
      loading,
      autoRefresh,
      error,
      lastRefresh,
      refreshData,
      setAutoRefresh,
    }),
    [
      health,
      metrics,
      loading,
      autoRefresh,
      error,
      lastRefresh,
      refreshData,
      setAutoRefresh,
    ],
  );

  return returnObject;
}
