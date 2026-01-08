"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CircuitBreakerStatusPanel } from "@/components/monitoring/circuit-breaker-status-panel";
import { CircuitBreakerResetControl } from "@/components/monitoring/circuit-breaker-reset-control";
import { CircuitBreakerEventHistory } from "@/components/monitoring/circuit-breaker-event-history";
import { DashboardHeader } from "@/components/monitoring/dashboard-layout";
import { DashboardFooter } from "@/components/monitoring/dashboard-footer";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/constants/ui-themes";

// Circuit breaker data types
interface CircuitBreakerMetrics {
  timestamp: string;
  healthScore: number;
  totalCircuits: number;
  openCircuits: string[];
  healthyCircuits: number;
  circuitBreakers: Record<string, any>;
  status: string;
}

export default function CircuitBreakersPage() {
  const [metrics, setMetrics] = useState<CircuitBreakerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(15000); // 15 seconds

  // Fetch circuit breaker metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/circuit-breakers/metrics");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(
          data.error || "Failed to fetch circuit breaker metrics",
        );
      }
    } catch (error) {
      // Error handled silently for UI stability
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshData = () => {
    setLoading(true);
    fetchMetrics();
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics(); // Initial fetch

    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handle reset completion
  const handleResetComplete = () => {
    // Metrics will auto-refresh after reset via the component
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <DashboardHeader
            autoRefresh={autoRefresh}
            loading={loading}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onManualRefresh={refreshData}
            title="Circuit Breaker Monitoring"
            description="Real-time monitoring and control of service circuit breakers"
          />

          {/* Refresh Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Refresh interval:</span>
                <select
                  value={refreshInterval / 1000}
                  onChange={(e) =>
                    setRefreshInterval(parseInt(e.target.value) * 1000)
                  }
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="5">5s</option>
                  <option value="15">15s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                </select>
              </label>

              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Quick Status Badge */}
            {metrics && (
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  metrics.openCircuits.length === 0
                    ? "bg-green-100 text-green-800"
                    : metrics.openCircuits.length >= metrics.totalCircuits / 2
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800",
                )}
              >
                {metrics.openCircuits.length === 0
                  ? "All Healthy"
                  : metrics.openCircuits.length === 1
                    ? "1 Circuit Open"
                    : `${metrics.openCircuits.length} Circuits Open`}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && !metrics && <DashboardSkeleton />}

        {/* Error State */}
        {!loading && !metrics && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-800">
              <h3 className="text-lg font-medium mb-2">
                Unable to Load Circuit Breaker Metrics
              </h3>
              <p className="text-red-600 mb-4">
                There was an error fetching circuit breaker status. Please try
                again.
              </p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {metrics && (
          <div className="space-y-8">
            {/* Circuit Breaker Status Panel */}
            <CircuitBreakerStatusPanel
              metrics={metrics}
              showDetails={true}
              refreshInterval={autoRefresh ? refreshInterval : undefined}
              onMetricsUpdate={(newMetrics) => {
                setMetrics(newMetrics);
                setLastRefresh(new Date());
              }}
            />

            {/* Circuit Breaker Reset Control */}
            <CircuitBreakerResetControl
              onResetComplete={handleResetComplete}
              onRefreshMetrics={refreshData}
              requireConfirmation={true}
            />

            {/* Circuit Breaker Event History */}
            <CircuitBreakerEventHistory
              metrics={metrics}
              maxEvents={50}
              showDetails={true}
            />

            {/* Additional Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Circuit Breaker Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    What are Circuit Breakers?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Circuit breakers protect your system from cascading failures
                    by temporarily stopping requests to failing services. When a
                    service starts failing repeatedly, the circuit breaker
                    &ldquo;opens&rdquo; to prevent further damage, allowing the
                    service time to recover.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Circuit Breaker States
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      <span className="font-medium text-green-600">
                        CLOSED (Healthy):
                      </span>{" "}
                      Normal operation, requests flow through
                    </li>
                    <li>
                      <span className="font-medium text-yellow-600">
                        HALF_OPEN (Testing):
                      </span>{" "}
                      Testing if service has recovered
                    </li>
                    <li>
                      <span className="font-medium text-red-600">
                        OPEN (Failing):
                      </span>{" "}
                      Blocking requests to prevent further damage
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Quick Actions
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    window.open("/api/health", "_blank");
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  View System Health
                </button>
                <button
                  onClick={() => {
                    window.open("/api/metrics", "_blank");
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  View API Metrics
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/dashboard/monitoring";
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Main Monitoring
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8">
          <DashboardFooter
            loading={loading}
            autoRefresh={autoRefresh}
            lastRefresh={lastRefresh}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
