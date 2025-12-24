import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Dispatch,
  SetStateAction,
} from "react";
import { MONITORING_REFRESH_INTERVAL } from "@/lib/utils/time-formatting";
import {
  monitoringService,
  type SystemHealth,
  type MetricsData,
} from "@/lib/services/monitoring-service";

// Type definitions now centralized in monitoring-service.ts
export type {
  SystemHealth,
  MetricsData,
  MetricSummary,
} from "@/lib/services/monitoring-service";

export interface UseMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  detailed?: boolean;
}

export interface UseMonitoringReturn {
  health: SystemHealth | null;
  metrics: MetricsData | null;
  loading: boolean;
  autoRefresh: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refreshData: () => Promise<void>;
  setAutoRefresh: Dispatch<SetStateAction<boolean>>;
}

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
  }, [detailed]);

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
