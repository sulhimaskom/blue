"use client";

import { useState, useCallback } from "react";
import { monitoringAPI } from "@/lib/services/monitoring-api";
import type {
  AdvancedPerformanceMetrics,
  AICacheOptimizationMetrics,
  PredictivePerformanceData,
} from "./advanced-performance-dashboard.types";

interface UseAdvancedMetricsDataOptions {
  onError?: (_error: string) => void;
  onSuccess?: (_message: string) => void;
}

interface UseAdvancedMetricsDataReturn {
  metrics: AdvancedPerformanceMetrics | null;
  aiMetrics: AICacheOptimizationMetrics | null;
  predictiveData: PredictivePerformanceData | null;
  loading: boolean;
  refreshing: boolean;
  lastRefresh: Date | null;
  fetchAdvancedMetrics: () => Promise<void>;
}

export const useAdvancedMetricsData = ({
  onError = (_error: string) => {},
  onSuccess = (_message: string) => {},
}: UseAdvancedMetricsDataOptions): UseAdvancedMetricsDataReturn => {
  const [metrics, setMetrics] = useState<AdvancedPerformanceMetrics | null>(
    null,
  );
  const [aiMetrics, setAiMetrics] = useState<AICacheOptimizationMetrics | null>(
    null,
  );
  const [predictiveData, setPredictiveData] =
    useState<PredictivePerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAdvancedMetrics = useCallback(async () => {
    try {
      setRefreshing(true);
      const [metricsData, aiData, predictiveData] = await Promise.all([
        monitoringAPI.getAdvancedMonitoring(),
        monitoringAPI.getAICacheOptimization(),
        monitoringAPI.getPredictivePerformance(),
      ]);

      setMetrics(metricsData);
      setAiMetrics(aiData);
      setPredictiveData(predictiveData);
      setLastRefresh(new Date());
      onSuccess?.("Advanced performance metrics updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(
        `Failed to fetch advanced performance metrics: ${errorMessage}`,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onError, onSuccess]);

  return {
    metrics,
    aiMetrics,
    predictiveData,
    loading,
    refreshing,
    lastRefresh,
    fetchAdvancedMetrics,
  };
};
