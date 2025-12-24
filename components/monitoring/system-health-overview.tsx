"use client";

import React, { useMemo } from "react";
import { ServerIcon } from "@/components/ui/icons";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { BaseCard } from "@/components/ui/base-card";
import { GradientCard } from "@/components/ui/gradient-card";
import {
  MonitoringDashboardService,
  type HealthScoreMetrics,
} from "@/lib/services/monitoring-dashboard-service";
import type { SystemHealth } from "@/lib/hooks/use-monitoring";
import { ServiceStatusGrid } from "./service-status-grid";
import {
  HealthScoreCalculator,
  SVG_CIRCLES,
  SVG_STROKES,
  ANIMATION_TIMING,
} from "@/lib/constants/svg-calculations";

interface SystemHealthOverviewProps {
  health: SystemHealth;
  expandedService: string | null;
  // eslint-disable-next-line no-unused-vars
  onToggleServiceExpansion: (serviceName: string) => void;
}

export const SystemHealthOverview = React.memo(
  function SystemHealthOverviewComponent({
    health,
    expandedService,
    onToggleServiceExpansion,
  }: SystemHealthOverviewProps) {
    const healthMetrics = useMemo(
      () => MonitoringDashboardService.calculateHealthScoreMetrics(health),
      [health],
    );

    const overviewData = useMemo(
      () => MonitoringDashboardService.getSystemOverviewData(health),
      [health],
    );

    return (
      <BaseCard className="mb-8 shadow-sm">
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
          onToggleServiceExpansion={onToggleServiceExpansion}
        />
      </BaseCard>
    );
  },
);

interface HealthScoreCardsProps {
  healthMetrics: HealthScoreMetrics;
  overviewData: any;
  health: SystemHealth;
}

const HealthScoreCards = React.memo(function HealthScoreCardsComponent({
  healthMetrics,
  overviewData,
  health,
}: HealthScoreCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Health Score */}
      <HealthScoreCard healthMetrics={healthMetrics} />

      {/* System Uptime */}
      <GradientCard variant="green">
        <div className="text-3xl font-bold text-green-600 mb-3">
          {overviewData.uptime}
        </div>
        <div className="text-sm font-medium text-gray-700">System Uptime</div>
        <div className="text-xs text-gray-500 mt-1">Continuous operation</div>
      </GradientCard>

      {/* Services Monitored */}
      <GradientCard variant="purple">
        <div className="text-3xl font-bold text-purple-600 mb-3">
          {health.checks.length}
        </div>
        <div className="text-sm font-medium text-gray-700">
          Services Monitored
        </div>
        <div className="text-xs text-gray-500 mt-1">Active endpoints</div>
      </GradientCard>
    </div>
  );
});

const HealthScoreCard = React.memo(function HealthScoreCardComponent({
  healthMetrics,
}: {
  healthMetrics: HealthScoreMetrics;
}) {
  return (
    <GradientCard variant="blue">
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-3">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle
            cx={SVG_STROKES.CENTER_POSITION}
            cy={SVG_STROKES.CENTER_POSITION}
            r={SVG_CIRCLES.CIRCLE_RADIUS}
            stroke="currentColor"
            strokeWidth={SVG_STROKES.DEFAULT_WIDTH}
            fill="none"
            className="text-blue-100"
          />
          <circle
            cx={SVG_STROKES.CENTER_POSITION}
            cy={SVG_STROKES.CENTER_POSITION}
            r={SVG_CIRCLES.CIRCLE_RADIUS}
            stroke="currentColor"
            strokeWidth={SVG_STROKES.DEFAULT_WIDTH}
            fill="none"
            strokeDasharray={HealthScoreCalculator.calculateStrokeDasharray(
              healthMetrics.score,
            )}
            className={`text-blue-600 transition-all ${ANIMATION_TIMING.HEALTH_SCORE_UPDATE}`}
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
    </GradientCard>
  );
});
