import {
  useState,
  useEffect,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { MONITORING_REFRESH_INTERVAL } from "@/lib/utils/time-formatting";

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: Array<{
    service: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime?: number;
    error?: string;
  }>;
}

export interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  unit: string;
}

export interface MetricsData {
  metrics: string[];
  summaries: Record<string, MetricSummary>;
  recent: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: string;
  }>;
  timestamp: string;
}

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
      const [healthResponse, metricsResponse] = await Promise.allSettled([
        fetch(`/api/health?detailed=${detailed}`),
        fetch("/api/metrics"),
      ]);

      if (healthResponse.status === "fulfilled") {
        const healthData = await healthResponse.value.json();
        setHealth(healthData);
      } else {
        throw new Error("Failed to fetch health data");
      }

      if (metricsResponse.status === "fulfilled") {
        const metricsData = await metricsResponse.value.json();
        setMetrics(metricsData);
      } else {
        throw new Error("Failed to fetch metrics data");
      }

      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
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

  return {
    health,
    metrics,
    loading,
    autoRefresh,
    error,
    lastRefresh,
    refreshData,
    setAutoRefresh,
  };
}
