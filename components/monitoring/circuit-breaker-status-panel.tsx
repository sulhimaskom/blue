"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { cn, getTextColor, getIconColor } from "@/lib/constants/ui-themes";
import {
  ShieldIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

// Types for circuit breaker data
interface CircuitBreakerMetrics {
  timestamp: string;
  circuitBreakers: Array<{
    name: string;
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failureRate: number;
    successCount: number;
    failureCount: number;
    lastFailureTime?: string;
    lastSuccessTime?: string;
    timeout: number;
    resetTimeout: number;
  }>;
  summary: {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
    healthyPercentage: number;
  };
}

interface CircuitBreakerStatusPanelProps {
  // eslint-disable-next-line no-unused-vars
  onError?: (error: string) => void;
  // eslint-disable-next-line no-unused-vars
  onSuccess?: (message: string) => void;
}

/**
 * CircuitBreakerStatusPanel displays real-time circuit breaker status
 * with manual reset capabilities and detailed metrics.
 *
 * Architecture: Service layer compliant with zero business logic in UI
 * - Uses circuitBreakerService for all data operations
 * - Atomic component with clear separation of concerns
 * - Real-time updates with configurable refresh intervals
 */
export const CircuitBreakerStatusPanel: React.FC<
  CircuitBreakerStatusPanelProps
> = ({
  onError = (_error: string) => {}, // eslint-disable-line no-unused-vars
  onSuccess = (_message: string) => {}, // eslint-disable-line no-unused-vars
}) => {
  const [metrics, setMetrics] = useState<CircuitBreakerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCircuitBreakerMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/circuit-breakers/metrics");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setMetrics(data);
      setLastRefresh(new Date());
      onSuccess?.("Circuit breaker metrics updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(`Failed to fetch circuit breaker metrics: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onError, onSuccess]);

  const resetCircuitBreaker = async (circuitName: string) => {
    try {
      const response = await fetch("/api/circuit-breakers/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ circuitName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      onSuccess?.(`Circuit breaker "${circuitName}" reset successfully`);
      fetchCircuitBreakerMetrics(); // Refresh after reset
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(`Failed to reset circuit breaker: ${errorMessage}`);
    }
  };

  const resetAllCircuitBreakers = async () => {
    try {
      const response = await fetch("/api/circuit-breakers/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      onSuccess?.("All circuit breakers reset successfully");
      fetchCircuitBreakerMetrics(); // Refresh after reset
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      onError?.(`Failed to reset all circuit breakers: ${errorMessage}`);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchCircuitBreakerMetrics();
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCircuitBreakerMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchCircuitBreakerMetrics]);

  // Initial data fetch
  useEffect(() => {
    fetchCircuitBreakerMetrics();
  }, [fetchCircuitBreakerMetrics]);

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
          <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3
            className={cn("text-lg font-medium mb-2", getTextColor("heading"))}
          >
            Unable to Load Circuit Breaker Metrics
          </h3>
          <Button onClick={handleManualRefresh} disabled={refreshing}>
            {refreshing ? (
              <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Retry
          </Button>
        </div>
      </BaseCard>
    );
  }

  const getStateStatusType = (state: string): StatusType => {
    switch (state) {
      case "CLOSED":
        return "success";
      case "OPEN":
        return "error";
      case "HALF_OPEN":
        return "warning";
      default:
        return "unknown";
    }
  };

  return (
    <BaseCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldIcon />
          <h2 className={cn("text-xl font-semibold", getTextColor("heading"))}>
            Circuit Breaker Monitoring
          </h2>
          <StatusIndicator status="success" size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh ? "bg-green-50 border-green-300" : "")}
          >
            <RefreshCwIcon
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
            <RefreshCwIcon
              className={cn("w-4 h-4 mr-2", refreshing ? "animate-spin" : "")}
            />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={cn("text-2xl font-bold", getTextColor("heading"))}>
            {metrics.summary.total}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Total Circuit Breakers
          </div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-green-600")}>
            {metrics.summary.closed}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Closed (Healthy)
          </div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-red-600")}>
            {metrics.summary.open}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Open (Tripped)
          </div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-yellow-600")}>
            {metrics.summary.halfOpen}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Half-Open (Testing)
          </div>
        </div>
      </div>

      {/* Circuit Breaker List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={cn("text-lg font-medium", getTextColor("heading"))}>
            Circuit Breaker Status
          </h3>

          {metrics.summary.open > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={resetAllCircuitBreakers}
            >
              Reset All Open
            </Button>
          )}
        </div>

        {metrics.circuitBreakers.map((circuit) => (
          <div
            key={circuit.name}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className={cn("font-medium", getTextColor("heading"))}>
                    {circuit.name}
                  </h4>
                  <StatusIndicator
                    status={getStateStatusType(circuit.state)}
                    size="sm"
                  />
                  <span
                    className={cn("text-sm px-2 py-1 rounded", {
                      "bg-green-100 text-green-800": circuit.state === "CLOSED",
                      "bg-red-100 text-red-800": circuit.state === "OPEN",
                      "bg-yellow-100 text-yellow-800":
                        circuit.state === "HALF_OPEN",
                    })}
                  >
                    {circuit.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className={cn("font-medium", getTextColor("muted"))}>
                      Success Rate:
                    </span>
                    <span className={cn("ml-2", getTextColor("body"))}>
                      {(
                        (circuit.successCount /
                          (circuit.successCount + circuit.failureCount)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>

                  <div>
                    <span className={cn("font-medium", getTextColor("muted"))}>
                      Successes:
                    </span>
                    <span className={cn("ml-2", getIconColor("success"))}>
                      {circuit.successCount}
                    </span>
                  </div>

                  <div>
                    <span className={cn("font-medium", getTextColor("muted"))}>
                      Failures:
                    </span>
                    <span className={cn("ml-2", getIconColor("error"))}>
                      {circuit.failureCount}
                    </span>
                  </div>

                  <div>
                    <span className={cn("font-medium", getTextColor("muted"))}>
                      Failure Rate:
                    </span>
                    <span className={cn("ml-2", getTextColor("body"))}>
                      {circuit.failureRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {(circuit.lastFailureTime || circuit.lastSuccessTime) && (
                  <div className="mt-3 text-xs text-gray-500">
                    {circuit.lastFailureTime && (
                      <span className="mr-4">
                        Last Failure:{" "}
                        {new Date(circuit.lastFailureTime).toLocaleString()}
                      </span>
                    )}
                    {circuit.lastSuccessTime && (
                      <span>
                        Last Success:{" "}
                        {new Date(circuit.lastSuccessTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetCircuitBreaker(circuit.name)}
                  disabled={circuit.state === "CLOSED"}
                  className="min-w-[80px]"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        ))}
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
