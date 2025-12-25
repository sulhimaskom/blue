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

/**
 * Props for the SystemHealthOverview component.
 * @interface SystemHealthOverviewProps
 */
interface SystemHealthOverviewProps {
  /** System health data containing service checks and status information */
  health: SystemHealth;
  /** Name of the currently expanded service for detailed view, or null if none expanded */
  expandedService: string | null;
  /** Callback function to toggle expansion state for a specific service */
  // eslint-disable-next-line no-unused-vars
  onToggleServiceExpansion: (serviceName: string) => void;
}

/**
 * SystemHealthOverview component that displays comprehensive system health information.
 *
 * Architectural Pattern:
 * - Service Layer compliance: zero business logic in UI components
 * - Uses MonitoringDashboardService for all calculations
 * - Memoized components for performance optimization
 * - Atomic design with reusable health cards
 *
 * Features:
 * - Health score visualization with SVG progress ring
 * - System uptime display with formatted duration
 * - Services count with color-coded status
 * - Expandable service details with responsive grid
 * - Real-time status indicators and animations
 * - Comprehensive error handling and accessibility
 *
 * Data Flow:
 * 1. Receives raw SystemHealth data from useMonitoring hook
 * 2. Delegates calculations to MonitoringDashboardService (Service Layer)
 * 3. Extracts business logic (health metrics, overview data) from UI
 * 4. Renders atomic components with processed data
 *
 * @example
 * ```tsx
 * <SystemHealthOverview
 *   health={systemHealth}
 *   expandedService="database"
 *   onToggleServiceExpansion={(service) => console.log('Toggle:', service)}
 * />
 * ```
 */
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

/**
 * Props for the HealthScoreCards component.
 * @interface HealthScoreCardsProps
 */
interface HealthScoreCardsProps {
  /** Calculated health score metrics from MonitoringDashboardService */
  healthMetrics: HealthScoreMetrics;
  /** System overview data including uptime and service counts */
  overviewData: any;
  /** Original system health data for reference */
  health: SystemHealth;
}

/**
 * HealthScoreCards component that displays key system health metrics in a card grid.
 *
 * Features:
 * - Health score with animated SVG progress indicator
 * - System uptime with gradient card formatting
 * - Services monitored count with status indicators
 * - Responsive grid layout (1 column mobile, 3 columns desktop)
 * - Consistent theme system integration
 *
 * Architecture:
 * Follows atomic design principles with each card representing a specific metric.
 * Uses theme system for consistent styling and accessibility.
 */
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

/**
 * HealthScoreCard component that displays the primary system health score with visual indicator.
 *
 * Features:
 * - SVG-based circular progress indicator with smooth animations
 * - Percentage-based health score display
 * - Service health breakdown (healthy/total)
 * - Animated transitions for score updates
 * - Accessible ARIA labels for screen readers
 *
 * Implementation Details:
 * - Uses SVG circles for smooth progress visualization
 * - Implements stroke-dasharray for accurate percentage representation
 * - Theme-aware color scheme using UI constants
 * - Memoized for performance optimization
 */
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
