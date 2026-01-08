"use client";

import React, { useState, useEffect } from "react";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { cn } from "@/lib/constants/ui-themes";

// Circuit breaker data types
interface CircuitBreakerData {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
  lastFailureTime?: number;
  successRate: string;
  availability: boolean;
}

interface CircuitBreakerMetrics {
  timestamp: string;
  healthScore: number;
  totalCircuits: number;
  openCircuits: string[];
  healthyCircuits: number;
  circuitBreakers: Record<string, CircuitBreakerData>;
  status: string;
}

interface CircuitBreakerStatusPanelProps {
  /** Optional custom metrics data - if not provided, component will fetch from API */
  metrics?: CircuitBreakerMetrics; // eslint-disable-line no-unused-vars
  /** Whether to show detailed circuit breakdowns */
  showDetails?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Callback function for when metrics are updated */
  onMetricsUpdate?: (metrics: CircuitBreakerMetrics) => void; // eslint-disable-line no-unused-vars
}

/**
 * Component for displaying real-time circuit breaker status
 * Compliant with blueprint.md atomic component principles - no business logic
 */
export function CircuitBreakerStatusPanel({
  metrics: _externalMetrics,
  showDetails = true,
  refreshInterval = 15000,
  onMetricsUpdate,
}: CircuitBreakerStatusPanelProps) {
  // eslint-disable-next-line no-unused-vars
  const [metrics, setMetrics] = useState<CircuitBreakerMetrics | null>(
    _externalMetrics || null,
  );
  const [loading, setLoading] = useState(!_externalMetrics);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(!!refreshInterval);

  // Fetch circuit breaker metrics from API
  const fetchMetrics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/circuit-breakers/metrics");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        onMetricsUpdate?.(data.data);
      } else {
        throw new Error(
          data.error || "Failed to fetch circuit breaker metrics",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [onMetricsUpdate]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (_externalMetrics) {
      setMetrics(_externalMetrics);
      setLoading(false);
      return;
    }

    fetchMetrics();

    if (!refreshInterval || !autoRefresh) {
      return;
    }

    // Note: Interval management could be enhanced with useInterval hook
    // This approach maintains backward compatibility with existing API
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [_externalMetrics, fetchMetrics, refreshInterval, autoRefresh]);

  // Get status type based on circuit breaker state
  const getStatusType = (state: string): StatusType => {
    switch (state) {
      case "CLOSED":
        return "healthy";
      case "OPEN":
        return "unhealthy";
      case "HALF_OPEN":
        return "degraded";
      default:
        return "unknown";
    }
  };

  // Get overall system status based on metrics
  const getOverallStatus = (): StatusType => {
    if (!metrics) return "unknown";

    if (metrics.openCircuits.length === 0) return "healthy";
    if (metrics.openCircuits.length >= metrics.totalCircuits / 2)
      return "unhealthy";
    return "degraded";
  };

  if (!metrics && loading) {
    return (
      <BaseCard className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </BaseCard>
    );
  }

  if (error && !metrics) {
    return (
      <BaseCard className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center space-x-2">
          <StatusIndicator status="unhealthy" size="sm" />
          <span className="text-red-800 font-medium">
            Circuit Breaker Monitoring Error
          </span>
        </div>
        <p className="text-red-600 text-sm mt-2">{error}</p>
      </BaseCard>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <BaseCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <StatusIndicator status={overallStatus} size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Circuit Breaker Status
              </h3>
              <p className="text-sm text-gray-600">
                Real-time monitoring of service circuit breakers
              </p>
            </div>
          </div>

          {refreshInterval && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                autoRefresh
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200",
              )}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
          )}
        </div>

        {/* Summary Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.totalCircuits}
              </div>
              <div className="text-xs text-gray-600">Total Circuits</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {metrics.healthyCircuits}
              </div>
              <div className="text-xs text-green-600">Healthy</div>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {metrics.openCircuits.length}
              </div>
              <div className="text-xs text-red-600">Open</div>
            </div>

            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.healthScore)}%
              </div>
              <div className="text-xs text-blue-600">Health Score</div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {metrics && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm",
              overallStatus === "healthy" && "bg-green-50 text-green-800",
              overallStatus === "degraded" && "bg-yellow-50 text-yellow-800",
              overallStatus === "unhealthy" && "bg-red-50 text-red-800",
            )}
          >
            {metrics.openCircuits.length === 0
              ? "✅ All circuit breakers are operating normally"
              : metrics.openCircuits.length === 1
                ? `⚠️ 1 circuit breaker is currently open: ${metrics.openCircuits[0]}`
                : `⚠️ ${metrics.openCircuits.length} circuit breakers are currently open: ${metrics.openCircuits.join(", ")}`}
          </div>
        )}
      </BaseCard>

      {/* Detailed Circuit Breakers */}
      {showDetails && metrics && (
        <BaseCard className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Individual Circuit Breakers
          </h4>

          <div className="space-y-3">
            {Object.entries(metrics.circuitBreakers).map(([name, data]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <StatusIndicator
                    status={getStatusType(data.state)}
                    size="sm"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-600">
                      State: {data.state} • Success Rate: {data.successRate}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {data.totalCalls.toLocaleString()} calls
                  </div>
                  <div className="text-xs text-gray-600">
                    {data.totalSuccesses} success, {data.totalFailures} failures
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BaseCard>
      )}

      {/* Last Updated */}
      {metrics && (
        <div className="text-center text-xs text-gray-500">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
          {loading && " • Updating..."}
        </div>
      )}
    </div>
  );
}
