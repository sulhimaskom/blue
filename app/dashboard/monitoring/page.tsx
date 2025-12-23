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

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetch("/api/health?detailed=true")
          .then((res) => res.json())
          .then((data) => setHealth(data))
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch health:", error);
          }),
        fetch("/api/metrics")
          .then((res) => res.json())
          .then((data) => setMetrics(data))
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch metrics:", error);
          }),
      ]);
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
        return "text-green-600 bg-green-100";
      case "degraded":
        return "text-yellow-600 bg-yellow-100";
      case "unhealthy":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              System Monitoring Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time system health and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-blue-50" : ""}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button onClick={refreshData} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Now"}
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        {health && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusColor(health.status)}`}
                >
                  {health.status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">Overall Status</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-blue-600">
                  {formatUptime(health.uptime)}
                </div>
                <div className="text-sm text-gray-600">System Uptime</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold text-gray-700">
                  {health.checks.length}
                </div>
                <div className="text-sm text-gray-600">Services Monitored</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Service Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health.checks.map((check, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {check.service}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.status)}`}
                      >
                        {check.status}
                      </span>
                    </div>
                    {check.responseTime && (
                      <div className="text-sm text-gray-600">
                        Response time: {formatDuration(check.responseTime)}
                      </div>
                    )}
                    {check.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {check.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(metrics.summaries).map(([name, summary]) => (
                <div key={name} className="border rounded-lg p-4">
                  <h3 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                    {name.replace(/_/g, " ")}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span className="text-sm font-medium">
                        {summary.count}
                      </span>
                    </div>
                    {summary.unit !== "count" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg:</span>
                          <span className="text-sm font-medium">
                            {summary.unit === "ms"
                              ? formatDuration(summary.avg)
                              : summary.avg}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Min/Max:
                          </span>
                          <span className="text-sm font-medium">
                            {summary.unit === "ms"
                              ? `${formatDuration(summary.min)}/${formatDuration(summary.max)}`
                              : `${summary.min}/${summary.max}`}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unit:</span>
                      <span className="text-sm font-medium">
                        {summary.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Recent Activity</h3>
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
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {metric.name.replace(/_/g, " ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.unit === "ms"
                            ? formatDuration(metric.value)
                            : metric.value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {metric.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
