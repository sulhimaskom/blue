"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import {
  CpuIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ZapIcon,
} from "@/components/ui/icons";
import { cn, getTextColor } from "@/lib/constants/ui-themes";
import { useInterval, STANDARD_INTERVALS } from "@/lib/hooks/use-interval";
import { monitoringAPI } from "@/lib/services/monitoring-api";
import {
  AdvancedPerformanceMetrics,
  AICacheOptimizationMetrics,
  PredictivePerformanceData,
} from "./advanced-performance-dashboard.types";
import { PerformanceOverviewTab } from "./PerformanceOverviewTab";
import { AIOptimizationTab } from "./AIOptimizationTab";
import { PredictiveAnalyticsTab } from "./PredictiveAnalyticsTab";

interface AdvancedPerformanceDashboardProps {
  onError?: (_error: string) => void;
  onSuccess?: (_message: string) => void;
}

export const AdvancedPerformanceDashboard: React.FC<
  AdvancedPerformanceDashboardProps
> = ({
  onError = (_error: string) => {},
  onSuccess = (_message: string) => {},
}) => {
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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "predictive">(
    "overview",
  );

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

  const applyOptimization = async (optimizationIndex: number) => {
    if (!aiMetrics) return;

    try {
      const optimization = aiMetrics.optimizations[optimizationIndex];
      await monitoringAPI.getPredictiveOptimization({
        optimizationType: optimization.type,
        parameters: {
          description: optimization.description,
          estimatedSavings: optimization.estimatedSavings,
          confidence: optimization.confidence,
        },
      });

      onSuccess?.(
        `Optimization "${optimization.description}" applied successfully`,
      );
      await fetchAdvancedMetrics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(`Failed to apply optimization: ${errorMessage}`);
    }
  };

  const { stop, restart } = useInterval(fetchAdvancedMetrics, {
    intervalMs: STANDARD_INTERVALS.DEFAULT_MONITORING,
    autoStart: autoRefresh,
    onError: (error) => onError?.(error.message),
  });

  useEffect(() => {
    if (autoRefresh) {
      restart();
    } else {
      stop();
    }
  }, [autoRefresh, restart, stop]);

  useEffect(() => {
    fetchAdvancedMetrics();
  }, [fetchAdvancedMetrics]);

  if (loading && !metrics) {
    return (
      <BaseCard className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </BaseCard>
    );
  }

  if (!metrics) {
    return (
      <BaseCard className="p-6">
        <div className="text-center">
          <CpuIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3
            className={cn("text-lg font-medium mb-2", getTextColor("heading"))}
          >
            Unable to Load Performance Metrics
          </h3>
          <Button onClick={fetchAdvancedMetrics} disabled={refreshing}>
            {refreshing ? (
              <CpuIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Retry
          </Button>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CpuIcon />
          <h2 className={cn("text-xl font-semibold", getTextColor("heading"))}>
            Advanced Performance Analytics
          </h2>
          <StatusIndicator status={"success" as StatusType} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh ? "bg-green-50 border-green-300" : "")}
          >
            <CpuIcon
              className={cn(
                "w-4 h-4 mr-2",
                autoRefresh || refreshing ? "animate-spin" : "",
              )}
            />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdvancedMetrics}
            disabled={refreshing}
          >
            <CpuIcon
              className={cn("w-4 h-4 mr-2", refreshing ? "animate-spin" : "")}
            />
            Refresh Now
          </Button>
        </div>
      </div>

      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            activeTab === "overview"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
        >
          <BarChart3Icon className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            activeTab === "ai"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
        >
          <ZapIcon className="w-4 h-4 inline mr-2" />
          AI Optimization
        </button>
        <button
          onClick={() => setActiveTab("predictive")}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            activeTab === "predictive"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900",
          )}
        >
          <TrendingUpIcon className="w-4 h-4 inline mr-2" />
          Predictive
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <PerformanceOverviewTab metrics={metrics} />
        )}

        {activeTab === "ai" && aiMetrics && (
          <AIOptimizationTab
            metrics={aiMetrics}
            onApplyOptimization={applyOptimization}
          />
        )}

        {activeTab === "predictive" && predictiveData && (
          <PredictiveAnalyticsTab metrics={predictiveData} />
        )}
      </div>

      {lastRefresh && (
        <div
          className={cn("mt-6 pt-4 border-t text-xs", getTextColor("muted"))}
        >
          Last updated: {lastRefresh.toLocaleString()}
          {autoRefresh &&
            ` • Auto-refresh enabled (${STANDARD_INTERVALS.DEFAULT_MONITORING / 1000}s)`}
        </div>
      )}
    </BaseCard>
  );
};
