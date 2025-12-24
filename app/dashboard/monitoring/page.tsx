"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface SystemHealth {
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

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  unit: string;
}

interface MetricsData {
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

// Icon components for enhanced UI
const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg
    className="w-5 h-5 text-red-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const WarningIcon = () => (
  <svg
    className="w-5 h-5 text-yellow-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const ServerIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

const ChartIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [healthResponse, metricsResponse] = await Promise.allSettled([
        fetch("/api/health?detailed=true"),
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
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-700 bg-green-50 border-green-200";
      case "degraded":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "unhealthy":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckIcon />;
      case "degraded":
        return <WarningIcon />;
      case "unhealthy":
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Calculate health percentage for visual representation
  const calculateHealthPercentage = (health: SystemHealth | null) => {
    if (!health) return 0;
    const healthyServices = health.checks.filter(
      (check) => check.status === "healthy",
    ).length;
    return Math.round((healthyServices / health.checks.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8">
          <div className="mb-6 lg:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ActivityIcon />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  System Monitoring Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Real-time system health and performance metrics
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 ${autoRefresh ? "bg-green-50 border-green-200 text-green-700" : ""}`}
            >
              {autoRefresh ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Auto-refresh ON
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  Auto-refresh OFF
                </>
              )}
            </Button>
            <Button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <div className={loading ? "animate-spin" : ""}>
                <RefreshIcon />
              </div>
              {loading ? "Refreshing..." : "Refresh Now"}
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <ErrorIcon />
              <div>
                <h3 className="text-red-800 font-medium">Connection Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !health && !metrics && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 text-blue-600 animate-spin">
                <RefreshIcon />
              </div>
              <p className="text-gray-600">Loading system data...</p>
            </div>
          </div>
        )}

        {/* System Health Overview */}
        {health && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ServerIcon />
              <h2 className="text-xl font-semibold text-gray-900">
                System Health
              </h2>
              <div className="ml-auto">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(health.status)}`}
                >
                  {getStatusIcon(health.status)}
                  {health.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Health Score Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-3">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-blue-100"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${calculateHealthPercentage(health) * 2.26} 226`}
                      className="text-blue-600 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute">
                    <span className="text-2xl font-bold text-gray-900">
                      {calculateHealthPercentage(health)}%
                    </span>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  Health Score
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {health.checks.filter((c) => c.status === "healthy").length}/
                  {health.checks.length} services healthy
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="text-3xl font-bold text-green-600 mb-3">
                  {formatUptime(health.uptime)}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  System Uptime
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Continuous operation
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                <div className="text-3xl font-bold text-purple-600 mb-3">
                  {health.checks.length}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  Services Monitored
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Active endpoints
                </div>
              </div>
            </div>

            {/* Service Status Grid */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <ServerIcon />
                Service Status Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health.checks.map((check, index) => {
                  const isExpanded = expandedService === check.service;
                  const timeSinceUpdate = health.timestamp
                    ? Date.now() - new Date(health.timestamp).getTime()
                    : 0;

                  return (
                    <div
                      key={index}
                      className="relative bg-white border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                    >
                      <button
                        onClick={() =>
                          setExpandedService(isExpanded ? null : check.service)
                        }
                        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                            {getStatusIcon(check.status)}
                            {check.service}
                          </h4>
                          <div className="flex items-center gap-3">
                            {timeSinceUpdate < 5000 && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs text-gray-500">
                                  Live
                                </span>
                              </div>
                            )}
                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(check.status)}`}
                            >
                              {check.status}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                        {check.responseTime && (
                          <div className="mt-2 text-sm text-gray-600">
                            Response: {formatDuration(check.responseTime)}
                          </div>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                          <div className="pt-4 space-y-3">
                            {check.responseTime && (
                              <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border">
                                <span className="text-sm text-gray-600">
                                  Response time:
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDuration(check.responseTime)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border">
                              <span className="text-sm text-gray-600">
                                Status:
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.status)}`}
                              >
                                {check.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border">
                              <span className="text-sm text-gray-600">
                                Last checked:
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {new Date(
                                  health.timestamp,
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            {check.error && (
                              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <div className="text-sm text-red-700">
                                  <strong>Error Details:</strong>
                                </div>
                                <div className="text-sm text-red-600 mt-1 font-mono">
                                  {check.error}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ChartIcon />
              <h2 className="text-xl font-semibold text-gray-900">
                Performance Metrics
              </h2>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Object.entries(metrics.summaries).map(([name, summary]) => (
                <div
                  key={name}
                  className="bg-gradient-to-br from-white to-gray-50 border rounded-xl p-5 hover:shadow-md transition-all duration-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ChartIcon />
                    {name
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {summary.count}
                      </span>
                    </div>
                    {summary.unit !== "count" && (
                      <>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">
                            Average:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {summary.unit === "ms"
                              ? formatDuration(summary.avg)
                              : summary.avg}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">Range:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {summary.unit === "ms"
                              ? `${formatDuration(summary.min)} - ${formatDuration(summary.max)}`
                              : `${summary.min} - ${summary.max}`}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Unit:</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {summary.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity Table */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Activity Log
              </h3>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Metric
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {metrics.recent.slice(0, 10).map((metric, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 capitalize">
                            {metric.name.replace(/_/g, " ")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-bold text-blue-600">
                              {metric.unit === "ms"
                                ? formatDuration(metric.value)
                                : metric.value}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              {metric.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(metric.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with Enhanced Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm">
              <div
                className={`w-3 h-3 rounded-full ${loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"} shadow-sm`}
              />
              <span className="text-sm text-gray-600 font-medium">
                {loading ? "Updating..." : "System Live"}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-sm text-gray-600">
                Last: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            {autoRefresh && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Auto-refresh every 30 seconds
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
