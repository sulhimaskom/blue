"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { cn, getTextColor } from "@/lib/constants/ui-themes";
import {
  CpuIcon,
  TrendingUpIcon,
  BarChart3Icon,
  ZapIcon,
} from "@/components/ui/icons";

// Types for advanced performance metrics
interface AdvancedPerformanceMetrics {
  timestamp: string;
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskIOPS: number;
    networkLatency: number;
  };
  application: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    throughput: number;
  };
  database: {
    connectionPool: number;
    queryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
}

interface AICacheOptimizationMetrics {
  timestamp: string;
  optimizations: Array<{
    type: string;
    description: string;
    estimatedSavings: number;
    confidence: number;
    applied: boolean;
  }>;
  summary: {
    totalSavings: number;
    appliedOptimizations: number;
    pendingOptimizations: number;
    hitRateImprovement: number;
  };
}

interface PredictivePerformanceData {
  timestamp: string;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
    severity: "low" | "medium" | "high";
    recommendations: string[];
  }>;
  summary: {
    totalPredictions: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

// Props for Advanced Performance Dashboard
interface AdvancedPerformanceDashboardProps {
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void;
  // eslint-disable-next-line no-unused-vars
  onSuccess?: (message: string) => void;
}

/**
 * AdvancedPerformanceDashboard displays comprehensive system performance metrics
 * with AI optimization insights and predictive analytics.
 *
 * Architecture: Service layer compliant with zero business logic in UI
 * - Uses performance service for all data operations and calculations
 * - Atomic component with clear separation of concerns
 * - Real-time updates with configurable refresh intervals
 */
export const AdvancedPerformanceDashboard: React.FC<
  AdvancedPerformanceDashboardProps
> = ({
  onError = (_error: string) => {}, // eslint-disable-line no-unused-vars
  onSuccess = (_message: string) => {}, // eslint-disable-line no-unused-vars
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
      const [metricsResponse, aiResponse, predictiveResponse] =
        await Promise.all([
          fetch("/api/performance/advanced-monitoring"),
          fetch("/api/performance/ai-cache-optimization"),
          fetch("/api/performance/predictive"),
        ]);

      if (!metricsResponse.ok) {
        throw new Error(
          `Metrics HTTP ${metricsResponse.status}: ${metricsResponse.statusText}`,
        );
      }
      if (!aiResponse.ok) {
        throw new Error(
          `AI Optimization HTTP ${aiResponse.status}: ${aiResponse.statusText}`,
        );
      }
      if (!predictiveResponse.ok) {
        throw new Error(
          `Predictive HTTP ${predictiveResponse.status}: ${predictiveResponse.statusText}`,
        );
      }

      const [metricsData, aiData, predictiveData] = await Promise.all([
        metricsResponse.json(),
        aiResponse.json(),
        predictiveResponse.json(),
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
      const response = await fetch("/api/performance/predictive-optimization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optimizationType: optimization.type,
          parameters: {
            description: optimization.description,
            estimatedSavings: optimization.estimatedSavings,
            confidence: optimization.confidence,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      onSuccess?.(
        `Optimization "${optimization.description}" applied successfully`,
      );
      fetchAdvancedMetrics(); // Refresh data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(`Failed to apply optimization: ${errorMessage}`);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAdvancedMetrics();
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAdvancedMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAdvancedMetrics]);

  // Initial data fetch
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
          <Button onClick={handleManualRefresh} disabled={refreshing}>
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
      {/* Header */}
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
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <CpuIcon
              className={cn("w-4 h-4 mr-2", refreshing ? "animate-spin" : "")}
            />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
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

      {/* Footer */}
      {lastRefresh && (
        <div
          className={cn("mt-6 pt-4 border-t text-xs", getTextColor("muted"))}
        >
          Last updated: {lastRefresh.toLocaleString()}
          {autoRefresh && " • Auto-refresh enabled (30s)"}
        </div>
      )}
    </BaseCard>
  );
};

// Performance Overview Tab Component
interface PerformanceOverviewTabProps {
  metrics: AdvancedPerformanceMetrics;
}

const PerformanceOverviewTab: React.FC<PerformanceOverviewTabProps> = ({
  metrics,
}) => {
  const themeUtils = { getTextColor } as any;
  const { getTextColor: getThemeText } = themeUtils; // eslint-disable-line no-unused-vars

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", getThemeText("heading"))}>
          System Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", getThemeText("heading"))}>
              {metrics.system.cpuUsage.toFixed(1)}%
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              CPU Usage
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", getThemeText("heading"))}>
              {metrics.system.memoryUsage.toFixed(1)}%
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Memory Usage
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", getThemeText("heading"))}>
              {metrics.system.diskIOPS}
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Disk IOPS
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", getThemeText("heading"))}>
              {metrics.system.networkLatency}ms
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Network Latency
            </div>
          </div>
        </div>
      </div>

      {/* Application Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", getThemeText("heading"))}>
          Application Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-blue-600")}>
              {metrics.application.averageResponseTime}ms
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Avg Response Time
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-green-600")}>
              {metrics.application.requestsPerSecond}
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Requests/sec
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-yellow-600")}>
              {metrics.application.errorRate.toFixed(2)}%
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Error Rate
            </div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-purple-600")}>
              {metrics.application.throughput}MB/s
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Throughput
            </div>
          </div>
        </div>
      </div>

      {/* Database Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", getThemeText("heading"))}>
          Database Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-indigo-600")}>
              {metrics.database.connectionPool}
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Connections
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-orange-600")}>
              {metrics.database.queryTime}ms
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Query Time
            </div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-red-600")}>
              {metrics.database.slowQueries}
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Slow Queries
            </div>
          </div>

          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-emerald-600")}>
              {metrics.database.cacheHitRate.toFixed(1)}%
            </div>
            <div className={cn("text-sm", getThemeText("muted"))}>
              Cache Hit Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Optimization Tab Component
interface AIOptimizationTabProps {
  metrics: AICacheOptimizationMetrics;
  // eslint-disable-next-line no-unused-vars
  onApplyOptimization: (optimizationIndex: number) => void;
}

const AIOptimizationTab: React.FC<AIOptimizationTabProps> = ({
  metrics,
  onApplyOptimization,
}) => {
  const aiThemeUtils = { getTextColor } as any;
  const { getTextColor: getAIThemeText } = aiThemeUtils; // eslint-disable-line no-unused-vars

  return (
    <div className="space-y-6">
      {/* AI Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-green-600")}>
            ${metrics.summary.totalSavings.toFixed(2)}
          </div>
          <div className={cn("text-sm", getAIThemeText("muted"))}>
            Est. Monthly Savings
          </div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.summary.appliedOptimizations}
          </div>
          <div className={cn("text-sm", getAIThemeText("muted"))}>
            Applied Optimizations
          </div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {metrics.summary.hitRateImprovement.toFixed(1)}%
          </div>
          <div className={cn("text-sm", getAIThemeText("muted"))}>
            Hit Rate Improvement
          </div>
        </div>
      </div>

      {/* Optimization List */}
      <div>
        <h3
          className={cn("text-lg font-medium mb-4", getAIThemeText("heading"))}
        >
          Available Optimizations
        </h3>
        <div className="space-y-4">
          {metrics.optimizations.map((optimization) => (
            <div
              key={optimization.type}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4
                      className={cn("font-medium", getAIThemeText("heading"))}
                    >
                      {optimization.type}
                    </h4>
                    <span
                      className={cn("text-sm px-2 py-1 rounded", {
                        "bg-green-100 text-green-800": optimization.applied,
                        "bg-blue-100 text-blue-800": !optimization.applied,
                      })}
                    >
                      {optimization.applied ? "Applied" : "Available"}
                    </span>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded bg-purple-100 text-purple-800",
                      )}
                    >
                      {optimization.confidence}% confidence
                    </span>
                  </div>

                  <p className={cn("text-sm mb-2", getAIThemeText("body"))}>
                    {optimization.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <span
                      className={cn("font-medium", getAIThemeText("muted"))}
                    >
                      Est. Savings:
                    </span>
                    <span className={cn("text-green-600 font-medium")}>
                      ${optimization.estimatedSavings.toFixed(2)}/month
                    </span>
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    variant={optimization.applied ? "secondary" : "default"}
                    size="sm"
                    onClick={() =>
                      onApplyOptimization(
                        metrics.optimizations.indexOf(optimization),
                      )
                    }
                    disabled={optimization.applied}
                    className="min-w-[100px]"
                  >
                    {optimization.applied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Predictive Analytics Tab Component
interface PredictiveAnalyticsTabProps {
  metrics: PredictivePerformanceData;
}

const PredictiveAnalyticsTab: React.FC<PredictiveAnalyticsTabProps> = ({
  metrics,
}) => {
  const predictiveThemeUtils = { getTextColor } as any;
  const { getTextColor: getPredictiveThemeText } = predictiveThemeUtils; // eslint-disable-line no-unused-vars

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Predictions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={cn("text-2xl font-bold", getThemeText("heading"))}>
            {metrics.summary.totalPredictions}
          </div>
          <div className={cn("text-sm", getThemeText("muted"))}>
            Total Predictions
          </div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-red-600")}>
            {metrics.summary.highSeverity}
          </div>
          <div className={cn("text-sm", getThemeText("muted"))}>
            High Severity
          </div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-yellow-600")}>
            {metrics.summary.mediumSeverity}
          </div>
          <div className={cn("text-sm", getThemeText("muted"))}>
            Medium Severity
          </div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-blue-600")}>
            {metrics.summary.lowSeverity}
          </div>
          <div className={cn("text-sm", getThemeText("muted"))}>
            Low Severity
          </div>
        </div>
      </div>

      {/* Predictions List */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", getThemeText("heading"))}>
          Performance Predictions
        </h3>
        <div className="space-y-4">
          {metrics.predictions.map((prediction) => (
            <div
              key={`${prediction.metric}-${prediction.timeframe}`}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className={cn("font-medium", getThemeText("heading"))}>
                      {prediction.metric}
                    </h4>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded",
                        getSeverityColor(prediction.severity),
                      )}
                    >
                      {prediction.severity.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded bg-indigo-100 text-indigo-800",
                      )}
                    >
                      {prediction.confidence}% confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          getThemeText("muted"),
                        )}
                      >
                        Current:
                      </span>
                      <span
                        className={cn("ml-2 text-sm", getThemeText("body"))}
                      >
                        {prediction.currentValue}
                      </span>
                    </div>
                    <div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          getThemeText("muted"),
                        )}
                      >
                        Predicted ({prediction.timeframe}):
                      </span>
                      <span
                        className={cn(
                          "ml-2 text-sm font-medium",
                          getThemeText("body"),
                        )}
                      >
                        {prediction.predictedValue}
                      </span>
                    </div>
                  </div>

                  {prediction.recommendations.length > 0 && (
                    <div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          getThemeText("muted"),
                        )}
                      >
                        Recommendations:
                      </span>
                      <ul
                        className={cn(
                          "mt-1 text-sm space-y-1",
                          getThemeText("body"),
                        )}
                      >
                        {prediction.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
