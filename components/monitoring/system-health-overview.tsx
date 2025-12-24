"use client";

import React, { useMemo } from "react";
import { ServerIcon } from "@/components/ui/icons";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { BaseCard } from "@/components/ui/base-card";
import { GradientCard } from "@/components/ui/gradient-card";
import { UI_TEXT } from "@/lib/constants/ui-text";
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
import {
  getTextColor,
  getIconColor,
  getAccentColor,
  cn,
} from "@/lib/constants/ui-themes";

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
          <h2 className={cn("text-xl font-semibold", getTextColor("heading"))}>
            {UI_TEXT.monitoring.systemHealth}
          </h2>
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
        <div className={cn("text-3xl font-bold mb-3", getIconColor("success"))}>
          {overviewData.uptime}
        </div>
        <div className={cn("text-sm font-medium", getTextColor("body"))}>
          {UI_TEXT.monitoring.systemUptime}
        </div>
        <div className={cn("text-xs mt-1", getTextColor("muted"))}>
          {UI_TEXT.monitoring.continuousOperation}
        </div>
      </GradientCard>

      {/* Services Monitored */}
      <GradientCard variant="purple">
        <div className={cn("text-3xl font-bold mb-3", getIconColor("accent"))}>
          {health.checks.length}
        </div>
        <div className={cn("text-sm font-medium", getTextColor("body"))}>
          {UI_TEXT.monitoring.servicesMonitored}
        </div>
        <div className={cn("text-xs mt-1", getTextColor("muted"))}>
          {UI_TEXT.monitoring.activeEndpoints}
        </div>
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
            className={getAccentColor("blue", "subtle")}
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
            className={cn(
              `${getAccentColor("blue", "primary")} transition-all ${ANIMATION_TIMING.HEALTH_SCORE_UPDATE}`,
            )}
          />
        </svg>
        <div className="absolute">
          <span className={cn("text-2xl font-bold", getTextColor("heading"))}>
            {healthMetrics.score}%
          </span>
        </div>
      </div>
      <div className={cn("text-sm font-medium", getTextColor("body"))}>
        {UI_TEXT.monitoring.healthScore}
      </div>
      <div className={cn("text-xs mt-1", getTextColor("muted"))}>
        {healthMetrics.healthyServices}/{healthMetrics.totalServices} services
        healthy
      </div>
    </GradientCard>
  );
});
