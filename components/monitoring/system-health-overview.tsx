"use client";

import { ServerIcon } from "@/components/ui/icons";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import {
  MonitoringDashboardService,
  type HealthScoreMetrics,
} from "@/lib/services/monitoring-dashboard-service";
import type { SystemHealth } from "@/lib/hooks/use-monitoring";
import { ServiceStatusGrid } from "./service-status-grid";

/* eslint-disable no-unused-vars */
interface SystemHealthOverviewProps {
  health: SystemHealth;
  expandedService: string | null;
  onToggleServiceExpansion: (serviceName: string) => void;
}
/* eslint-enable no-unused-vars */

export function SystemHealthOverview({
  health,
  expandedService,
  onToggleServiceExpansion: handleToggleExpansion,
}: SystemHealthOverviewProps) {
  const healthMetrics =
    MonitoringDashboardService.calculateHealthScoreMetrics(health);
  const overviewData = MonitoringDashboardService.getSystemOverviewData(health);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <ServerIcon />
        <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
        <div className="ml-auto">
          <StatusIndicator status={health.status as StatusType} size="md" />
        </div>
      </div>

      <HealthScoreCards
        healthMetrics={healthMetrics}
        overviewData={overviewData}
        health={health}
      />

      <ServiceStatusGrid
        health={health}
        expandedService={expandedService}
        onToggleServiceExpansion={handleToggleExpansion}
      />
    </div>
  );
}

interface HealthScoreCardsProps {
  healthMetrics: HealthScoreMetrics;
  overviewData: any;
  health: SystemHealth;
}

function HealthScoreCards({
  healthMetrics,
  overviewData,
  health,
}: HealthScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Health Score */}
      <HealthScoreCard healthMetrics={healthMetrics} />

      {/* System Uptime */}
      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div className="text-3xl font-bold text-green-600 mb-3">
          {overviewData.uptime}
        </div>
        <div className="text-sm font-medium text-gray-700">System Uptime</div>
        <div className="text-xs text-gray-500 mt-1">Continuous operation</div>
      </div>

      {/* Services Monitored */}
      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
        <div className="text-3xl font-bold text-purple-600 mb-3">
          {health.checks.length}
        </div>
        <div className="text-sm font-medium text-gray-700">
          Services Monitored
        </div>
        <div className="text-xs text-gray-500 mt-1">Active endpoints</div>
      </div>
    </div>
  );
}

function HealthScoreCard({
  healthMetrics,
}: {
  healthMetrics: HealthScoreMetrics;
}) {
  return (
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
            strokeDasharray={`${healthMetrics.score * 2.26} 226`}
            className="text-blue-600 transition-all duration-500"
          />
        </svg>
        <div className="absolute">
          <span className="text-2xl font-bold text-gray-900">
            {healthMetrics.score}%
          </span>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-700">Health Score</div>
      <div className="text-xs text-gray-500 mt-1">
        {healthMetrics.healthyServices}/{healthMetrics.totalServices} services
        healthy
      </div>
    </div>
  );
}
