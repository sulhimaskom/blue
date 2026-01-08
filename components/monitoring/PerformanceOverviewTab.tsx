"use client";

import React from "react";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { cn } from "@/lib/constants/ui-themes";
import { UnifiedMetricsCalculator } from "@/lib/services/unified-metrics-calculator";
import { usePerformanceStatus } from "@/lib/hooks/use-performance-status";
import type { AdvancedPerformanceMetrics } from "./advanced-performance-dashboard.types";

interface PerformanceOverviewTabProps {
  metrics: AdvancedPerformanceMetrics;
}

export const PerformanceOverviewTab: React.FC<PerformanceOverviewTabProps> = ({
  metrics,
}) => {
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
