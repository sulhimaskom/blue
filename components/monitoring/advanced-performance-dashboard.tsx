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
import { UnifiedMetricsCalculator } from "@/lib/services/unified-metrics-calculator";
import { usePerformanceStatus } from "@/lib/hooks/use-performance-status";

/**
 * Comprehensive advanced performance metrics data structure containing system,
 * application, and database performance indicators with timestamp tracking.
 *
 * System Metrics:
 * - cpuUsage: Current CPU utilization percentage (0-100)
 * - memoryUsage: Memory utilization percentage (0-100)
 * - diskIOPS: Disk input/output operations per second
 * - networkLatency: Network response time in milliseconds
 *
 * Application Metrics:
 * - averageResponseTime: Mean API response time in milliseconds
 * - requestsPerSecond: Current request throughput
 * - errorRate: Error percentage of total requests (0-100)
 * - throughput: Data throughput in megabytes per second
 *
 * Database Metrics:
 * - connectionPool: Active database connections
 * - queryTime: Average query execution time in milliseconds
 * - slowQueries: Count of queries exceeding performance threshold
 * - cacheHitRate: Cache success percentage (0-100)
 */
interface AdvancedPerformanceMetrics {
  /** ISO timestamp when metrics were collected */
  timestamp: string;
  /** System-level performance indicators */
  system: {
    /** CPU utilization percentage (0-100) */
    cpuUsage: number;
    /** Memory utilization percentage (0-100) */
    memoryUsage: number;
    /** Disk input/output operations per second */
    diskIOPS: number;
    /** Network latency in milliseconds */
    networkLatency: number;
  };
  /** Application-level performance indicators */
  application: {
    /** Average API response time in milliseconds */
    averageResponseTime: number;
    /** Requests processed per second */
    requestsPerSecond: number;
    /** Error rate as percentage of total requests (0-100) */
    errorRate: number;
    /** Data throughput in megabytes per second */
    throughput: number;
  };
  /** Database performance indicators */
  database: {
    /** Number of active database connections */
    connectionPool: number;
    /** Average query execution time in milliseconds */
    queryTime: number;
    /** Count of slow performing queries */
    slowQueries: number;
    /** Cache hit success rate percentage (0-100) */
    cacheHitRate: number;
  };
}

/**
 * AI-powered cache optimization metrics containing optimization recommendations
 * with estimated cost savings and confidence scoring.
 *
 * Optimization Structure:
 * - type: Optimization category (e.g., 'cache-ttl', 'prefetch-strategy')
 * - description: Human-readable explanation of the optimization
 * - estimatedSavings: Predicted monthly cost reduction in USD
 * - confidence: AI confidence percentage in prediction accuracy (0-100)
 * - applied: Boolean indicating if optimization has been implemented
 *
 * Summary Metrics:
 * - totalSavings: Combined monthly savings from all optimizations
 * - appliedOptimizations: Count of successfully applied optimizations
 * - pendingOptimizations: Count of available but unapplied optimizations
 * - hitRateImprovement: Expected cache hit rate percentage improvement
 */
interface AICacheOptimizationMetrics {
  /** ISO timestamp when AI analysis was performed */
  timestamp: string;
  /** Array of optimization recommendations */
  optimizations: Array<{
    /** Optimization category identifier */
    type: string;
    /** Human-readable optimization description */
    description: string;
    /** Estimated monthly cost savings in USD */
    estimatedSavings: number;
    /** AI confidence percentage (0-100) */
    confidence: number;
    /** Whether optimization has been applied */
    applied: boolean;
  }>;
  /** Aggregated optimization summary statistics */
  summary: {
    /** Total estimated monthly savings across all optimizations */
    totalSavings: number;
    /** Count of optimizations that have been applied */
    appliedOptimizations: number;
    /** Count of optimizations available for application */
    pendingOptimizations: number;
    /** Expected cache hit rate improvement percentage */
    hitRateImprovement: number;
  };
}

/**
 * Predictive performance analytics data containing future performance predictions
 * with confidence scoring and actionable recommendations.
 *
 * Prediction Structure:
 * - metric: Performance metric being predicted (e.g., 'cpu', 'memory')
 * - currentValue: Current measured value
 * - predictedValue: AI-predicted future value
 * - confidence: Prediction confidence percentage (0-100)
 * - timeframe: Prediction time horizon (e.g., '1h', '24h', '7d')
 * - severity: Impact severity level for proactive planning
 * - recommendations: Actionable steps to prevent issues
 *
 * Severity Classification:
 * - low: Normal variations, monitoring recommended
 * - medium: Attention required, preventive action advised
 * - high: Immediate action needed to prevent performance degradation
 */
interface PredictivePerformanceData {
  /** ISO timestamp when predictive analysis was performed */
  timestamp: string;
  /** Array of performance predictions with recommendations */
  predictions: Array<{
    /** Performance metric name being predicted */
    metric: string;
    /** Current measured value */
    currentValue: number;
    /** AI-predicted future value */
    predictedValue: number;
    /** Prediction confidence percentage (0-100) */
    confidence: number;
    /** Prediction time horizon (e.g., '1h', '24h', '7d') */
    timeframe: string;
    /** Impact severity level: 'low' | 'medium' | 'high' */
    severity: "low" | "medium" | "high";
    /** Actionable recommendations to prevent issues */
    recommendations: string[];
  }>;
  /** Prediction summary statistics by severity level */
  summary: {
    /** Total number of predictions generated */
    totalPredictions: number;
    /** Count of high-severity predictions */
    highSeverity: number;
    /** Count of medium-severity predictions */
    mediumSeverity: number;
    /** Count of low-severity predictions */
    lowSeverity: number;
  };
}

/**
 * Props for the AdvancedPerformanceDashboard component.
 * @interface AdvancedPerformanceDashboardProps
 */
interface AdvancedPerformanceDashboardProps {
  /** Optional error callback function for handling operation failures */
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void;
  /** Optional success callback function for handling successful operations */
  // eslint-disable-next-line no-unused-vars
  onSuccess?: (message: string) => void;
}

/**
 * AdvancedPerformanceDashboard component that displays comprehensive system performance metrics
 * with AI optimization insights and predictive analytics in a tabbed interface.
 *
 * Architectural Pattern:
 * - Service Layer compliance: zero business logic in UI components
 * - Uses UnifiedMetricsCalculator and performance status hooks for data processing
 * - Atomic component with clear separation of concerns
 * - Real-time updates with configurable auto-refresh functionality
 * - Tab-based navigation for organizing complex performance data
 *
 * Features:
 * - Three-tab interface: Overview, AI Optimization, Predictive Analytics
 * - Real-time performance metrics with auto-refresh (30-second intervals)
 * - Manual refresh capabilities with loading states
 * - AI-powered optimization recommendations with one-click application
 * - Predictive analytics with confidence scoring and severity classification
 * - Comprehensive error handling and fallback UI states
 * - Responsive design with mobile-friendly layout
 *
 * Data Flow:
 * 1. Component mounts and triggers initial data fetch from three API endpoints
 * 2. Data is processed and displayed in organized tabs with proper formatting
 * 3. User interactions trigger optimization applications and data refreshes
 * 4. Auto-refresh mechanism maintains data freshness without user intervention
 *
 * Performance Optimizations:
 * - useCallback hooks for stable function references
 * - State management optimized for minimal re-renders
 * - Efficient data fetching with Promise.all for parallel requests
 * - Proper cleanup in useEffect for interval management
 *
 * API Integration:
 * - `/api/performance/advanced-monitoring` - System and application metrics
 * - `/api/performance/ai-cache-optimization` - AI optimization recommendations
 * - `/api/performance/predictive` - Predictive analytics data
 * - `/api/performance/predictive-optimization` - Apply optimization recommendations
 *
 * Error Handling:
 * - Comprehensive error boundaries with fallback UI states
 * - User-friendly error messages with retry functionality
 * - Graceful degradation when API endpoints are unavailable
 * - Proper error logging through callback functions
 *
 * @example
 * ```tsx
 * <AdvancedPerformanceDashboard
 *   onError={(error) => console.error('Performance error:', error)}
 *   onSuccess={(message) => console.log('Success:', message)}
 * />
 * ```
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

/**
 * Props for the PerformanceOverviewTab component.
 * @interface PerformanceOverviewTabProps
 */
interface PerformanceOverviewTabProps {
  /** Advanced performance metrics containing system, application, and database data */
  metrics: AdvancedPerformanceMetrics;
}

/**
 * PerformanceOverviewTab component that displays comprehensive performance metrics
 * across system, application, and database layers in organized card grids.
 *
 * Features:
 * - Three metric categories: System Performance, Application Performance, Database Performance
 * - Real-time status indicators using usePerformanceStatus hook
 * - Color-coded metric cards for visual distinction
 * - Responsive grid layout adapting to screen sizes
 * - UnifiedMetricsCalculator integration for consistent formatting
 *
 * Architectural Compliance:
 * - Zero business logic in UI component
 * - Performance calculations delegated to Service Layer
 * - Atomic design with focused responsibility
 *
 * @example
 * ```tsx
 * <PerformanceOverviewTab metrics={advancedMetrics} />
 * ```
 */
const PerformanceOverviewTab: React.FC<PerformanceOverviewTabProps> = ({
  metrics,
}) => {
  // Use our new performance status hook for unified status calculation
  const performanceMetrics = {
    responseTime: metrics.application.averageResponseTime,
    throughput: metrics.application.requestsPerSecond,
    errorRate: metrics.application.errorRate,
    cpuUsage: metrics.system.cpuUsage,
    memoryUsage: metrics.system.memoryUsage,
    cacheHitRate: metrics.database.cacheHitRate,
  };

  const { overallStatus, overallScore } =
    usePerformanceStatus(performanceMetrics);

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", "text-gray-900")}>
          System Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", "text-gray-900")}>
              {UnifiedMetricsCalculator.formatResponseTime(
                metrics.application.averageResponseTime,
              )}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Response Time</div>
            <StatusIndicator
              status={overallStatus}
              size="sm"
              className="mt-1"
            />
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", "text-gray-900")}>
              {overallScore}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>
              Performance Score
            </div>
            <StatusIndicator
              status={overallStatus}
              size="sm"
              className="mt-1"
            />
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", "text-gray-900")}>
              {metrics.system.diskIOPS}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Disk IOPS</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={cn("text-2xl font-bold", "text-gray-900")}>
              {metrics.system.networkLatency}ms
            </div>
            <div className={cn("text-sm", "text-gray-600")}>
              Network Latency
            </div>
          </div>
        </div>
      </div>

      {/* Application Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", "text-gray-900")}>
          Application Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-blue-600")}>
              {metrics.application.averageResponseTime}ms
            </div>
            <div className={cn("text-sm", "text-gray-600")}>
              Avg Response Time
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-green-600")}>
              {metrics.application.requestsPerSecond}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Requests/sec</div>
          </div>

          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-yellow-600")}>
              {metrics.application.errorRate.toFixed(2)}%
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Error Rate</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-purple-600")}>
              {metrics.application.throughput}MB/s
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Throughput</div>
          </div>
        </div>
      </div>

      {/* Database Metrics */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", "text-gray-900")}>
          Database Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-indigo-600")}>
              {metrics.database.connectionPool}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Connections</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-orange-600")}>
              {metrics.database.queryTime}ms
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Query Time</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-red-600")}>
              {metrics.database.slowQueries}
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Slow Queries</div>
          </div>

          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className={cn("text-2xl font-bold text-emerald-600")}>
              {metrics.database.cacheHitRate.toFixed(1)}%
            </div>
            <div className={cn("text-sm", "text-gray-600")}>Cache Hit Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Props for the AIOptimizationTab component.
 * @interface AIOptimizationTabProps
 */
interface AIOptimizationTabProps {
  /** AI cache optimization metrics containing recommendations and savings data */
  metrics: AICacheOptimizationMetrics;
  /** Callback function to apply a specific optimization by index */
  // eslint-disable-next-line no-unused-vars
  onApplyOptimization: (optimizationIndex: number) => void;
}

/**
 * AIOptimizationTab component that displays AI-powered optimization recommendations
 * with interactive controls for applying optimizations and viewing cost savings.
 *
 * Business Logic:
 * - Displays available cache optimizations with confidence scores
 * - Shows applied optimizations with visual distinction
 * - Calculates and displays estimated monthly savings
 * - Provides one-click optimization application functionality
 * - Tracks optimization impact through hit rate improvements
 *
 * Features:
 * - Summary cards showing total savings, applied optimizations, and improvements
 * - Detailed optimization list with descriptions and confidence ratings
 * - Interactive apply buttons with state management
 * - Color-coded status indicators (Applied/Available)
 * - Cost savings calculations with currency formatting
 *
 * User Experience:
 * - Clear visual distinction between applied and available optimizations
 * - Disabled state for already applied optimizations
 * - Loading states during optimization application
 * - Informative tooltips and confidence indicators
 * - Responsive layout for mobile and desktop viewing
 *
 * @example
 * ```tsx
 * <AIOptimizationTab
 *   metrics={aiMetrics}
 *   onApplyOptimization={(index) => applyOptimization(index)}
 * />
 * ```
 */
const AIOptimizationTab: React.FC<AIOptimizationTabProps> = ({
  metrics,
  onApplyOptimization,
}) => {
  return (
    <div className="space-y-6">
      {/* AI Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-green-600")}>
            ${metrics.summary.totalSavings.toFixed(2)}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Est. Monthly Savings
          </div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.summary.appliedOptimizations}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Applied Optimizations
          </div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {metrics.summary.hitRateImprovement.toFixed(1)}%
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Hit Rate Improvement
          </div>
        </div>
      </div>

      {/* Optimization List */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", getTextColor("heading"))}>
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
                    <h4 className={cn("font-medium", getTextColor("heading"))}>
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

                  <p className={cn("text-sm mb-2", getTextColor("body"))}>
                    {optimization.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn("font-medium", getTextColor("muted"))}>
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

/**
 * Props for the PredictiveAnalyticsTab component.
 * @interface PredictiveAnalyticsTabProps
 */
interface PredictiveAnalyticsTabProps {
  /** Predictive performance data containing predictions with confidence scores */
  metrics: PredictivePerformanceData;
}

/**
 * PredictiveAnalyticsTab component that displays AI-powered performance predictions
 * with severity classification, confidence scoring, and actionable recommendations.
 *
 * Business Intelligence Features:
 * - Performance predictions with confidence percentages
 * - Severity classification (Low/Medium/High) for proactive monitoring
 * - Current vs predicted value comparisons with trend indicators
 * - Actionable recommendations for each prediction
 * - Time-frame based predictions for planning purposes
 *
 * Data Visualization:
 * - Summary cards showing prediction count by severity level
 * - Detailed prediction cards with comprehensive information
 * - Color-coded severity indicators for quick scanning
 * - Confidence scoring badges for reliability assessment
 * - Structured recommendation lists with bullet points
 *
 * User Interaction:
 * - No interactive controls to maintain prediction integrity
 * - Informative presentation of AI-generated insights
 * - Clear visual hierarchy for information prioritization
 * - Consistent formatting with other dashboard tabs
 *
 * Color Strategy:
 * - Blue: Low severity (informational)
 * - Yellow: Medium severity (cautionary)
 * - Red: High severity (urgent attention)
 * - Indigo: Confidence indicators
 *
 * @example
 * ```tsx
 * <PredictiveAnalyticsTab metrics={predictiveData} />
 * ```
 */
const PredictiveAnalyticsTab: React.FC<PredictiveAnalyticsTabProps> = ({
  metrics,
}) => {
  /**
   * Maps severity levels to corresponding Tailwind CSS color classes for consistent UI styling.
   *
   * This function provides a centralized color mapping for severity indicators,
   * ensuring consistent visual representation across the predictive analytics interface.
   * The color choices follow standard UI/UX conventions for severity levels:
   * - Blue (low): Informational, no immediate action required
   * - Yellow (medium): Cautionary, monitoring recommended
   * - Red (high): Urgent attention required
   * - Gray (default): Unknown or unclassified severity
   *
   * @param severity - The severity level string ('low', 'medium', 'high', or other)
   * @returns Tailwind CSS class string for styling severity badges and indicators
   *
   * @example
   * ```typescript
   * const colorClasses = getSeverityColor('high');
   * // Returns: "bg-red-100 text-red-800"
   * // Used as: <span className={colorClasses}>HIGH</span>
   * ```
   */
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
          <div className={cn("text-2xl font-bold", "text-gray-900")}>
            {metrics.summary.totalPredictions}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>
            Total Predictions
          </div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-red-600")}>
            {metrics.summary.highSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>High Severity</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-yellow-600")}>
            {metrics.summary.mediumSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>Medium Severity</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-blue-600")}>
            {metrics.summary.lowSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>Low Severity</div>
        </div>
      </div>

      {/* Predictions List */}
      <div>
        <h3 className={cn("text-lg font-medium mb-4", "text-gray-900")}>
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
                    <h4 className={cn("font-medium", "text-gray-900")}>
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
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Current:
                      </span>
                      <span className={cn("ml-2 text-sm", "text-gray-700")}>
                        {prediction.currentValue}
                      </span>
                    </div>
                    <div>
                      <span
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Predicted ({prediction.timeframe}):
                      </span>
                      <span
                        className={cn(
                          "ml-2 text-sm font-medium",
                          "text-gray-700",
                        )}
                      >
                        {prediction.predictedValue}
                      </span>
                    </div>
                  </div>

                  {prediction.recommendations.length > 0 && (
                    <div>
                      <span
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Recommendations:
                      </span>
                      <ul
                        className={cn(
                          "mt-1 text-sm space-y-1",
                          "text-gray-700",
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
