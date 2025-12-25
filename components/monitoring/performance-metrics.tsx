"use client";

import React, { useMemo } from "react";
import { ChartIcon } from "@/components/ui/icons";
import { MetricSummaryCard } from "@/components/ui/metric-card";
import { BaseCard } from "@/components/ui/base-card";
import { MetricCardSkeleton } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/lib/constants/ui-text";
import {
  BaseTable,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { MonitoringDashboardService } from "@/lib/services/monitoring-dashboard-service";
import type { MetricsData } from "@/lib/hooks/use-monitoring";
import { getTextColor, cn, getAccentColor } from "@/lib/constants/ui-themes";

/**
 * Props for the PerformanceMetrics component.
 * @interface PerformanceMetricsProps
 */
interface PerformanceMetricsProps {
  /** Optional metrics data containing performance information and summaries */
  metrics?: MetricsData;
  /** Loading state indicator for metrics data fetching */
  loading?: boolean;
}

/**
 * PerformanceMetrics component that displays comprehensive system performance data.
 *
 * Architectural Pattern:
 * - Service Layer compliance: delegates all calculations to MonitoringDashboardService
 * - Zero business logic in UI components per blueprint.md requirements
 * - Memoized components for performance optimization
 * - Skeleton loading states for better UX
 *
 * Features:
 * - Metrics cards showing key performance indicators
 * - Recent activity table with formatted data
 * - Loading skeleton components during data fetch
 * - Responsive grid layout for metric cards
 * - Formatted time and duration displays
 * - Error boundaries and graceful degradation
 *
 * Data Processing Flow:
 * 1. Raw MetricsData enters component from useMonitoring hook
 * 2. MonitoringDashboardService.processMetricsCardsData() formats card data
 * 3. MonitoringDashboardService.getRecentActivityData() formats table data
 * 4. UI components render processed data with consistent styling
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - useMemo hooks for expensive calculations
 * - Skeleton loading prevents layout shifts
 * - Efficient data processing in Service Layer
 *
 * @example
 * ```tsx
 * <PerformanceMetrics
 *   metrics={metricsData}
 *   loading={isLoading}
 * />
 * ```
 */
export const PerformanceMetrics = React.memo(
  function PerformanceMetricsComponent({
    metrics,
    loading,
  }: PerformanceMetricsProps) {
    const metricsCards = useMemo(
      () =>
        metrics
          ? MonitoringDashboardService.getMetricsCardsData(metrics)
          : null,
      [metrics],
    );

    const activityData = useMemo(
      () =>
        metrics
          ? MonitoringDashboardService.getRecentActivityData(metrics)
          : null,
      [metrics],
    );

    // Memoize loading skeleton for performance - prevents recreating DOM
    const loadingSkeleton = useMemo(
      () => (
        <BaseCard className="mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ChartIcon />
            <h2
              className={cn("text-xl font-semibold", getTextColor("heading"))}
            >
              {UI_TEXT.monitoring.performanceMetrics}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
          {/* Activity table skeleton */}
          <BaseCard>
            <h3
              className={cn(
                "text-lg font-medium mb-4",
                getTextColor("heading"),
              )}
            >
              {UI_TEXT.monitoring.recentActivity}
            </h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg"
                >
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </BaseCard>
        </BaseCard>
      ),
      [], // Empty dependency array - skeleton never changes
    );

    if (loading || !metrics) {
      return loadingSkeleton;
    }

    return (
      <BaseCard className="mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ChartIcon />
          <h2 className={cn("text-xl font-semibold", getTextColor("heading"))}>
            {UI_TEXT.monitoring.performanceMetrics}
          </h2>
        </div>

        <MetricsCards cards={metricsCards || []} />

        <RecentActivityTable activityData={activityData || []} />
      </BaseCard>
    );
  },
);

/**
 * Props for the MetricsCards component.
 * @interface MetricsCardsProps
 */
interface MetricsCardsProps {
  /** Array of metric card data containing name, display name, and summary information */
  cards: Array<{
    name: string;
    displayName: string;
    summary: any;
  }>;
}

/**
 * MetricsCards component that renders a grid of metric summary cards.
 *
 * Features:
 * - Responsive grid layout (1 column mobile, 2 tablet, 4 desktop)
 * - Each card renders MetricSummaryCard with processed data
 * - Consistent spacing and theme integration
 * - Memoized for performance optimization
 */
const MetricsCards = React.memo(function MetricsCardsComponent({
  cards,
}: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <MetricSummaryCard
          key={card.name}
          title={card.displayName}
          summary={card.summary}
        />
      ))}
    </div>
  );
});

/**
 * Props for the RecentActivityTable component.
 * @interface RecentActivityTableProps
 */
interface RecentActivityTableProps {
  /** Array of activity data points with formatted metrics and timestamps */
  activityData: Array<{
    id: number;
    name: string;
    value: string | number;
    unit: string;
    timestamp: string;
    formattedTime: string;
  }>;
}

/**
 * RecentActivityTable component that displays the latest system metrics in tabular format.
 *
 * Features:
 * - Responsive table with hover effects
 * - Formatted metric names using display name mappings
 * - Color-coded values and units using theme system
 * - Human-readable timestamps with local formatting
 * - Accessible table structure with proper headers
 * - Memoized for performance optimization
 *
 * Data Processing:
 * - Metric names are formatted for human readability
 * - Values are highlighted with theme colors
 * - Units are displayed as styled badges
 * - Timestamps are formatted to local time zone
 */
const RecentActivityTable = React.memo(function RecentActivityTableComponent({
  activityData,
}: RecentActivityTableProps) {
  return (
    <BaseCard>
      <h3 className={cn("text-lg font-medium mb-4", getTextColor("heading"))}>
        {UI_TEXT.monitoring.recentActivity}
      </h3>
      <BaseTable variant="bordered">
        <TableHeader
          columns={[
            { key: "metric", label: "Metric" },
            { key: "value", label: "Value" },
            { key: "unit", label: "Unit" },
            { key: "time", label: "Time" },
          ]}
        />
        <TableBody>
          {activityData.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell
                className={cn(
                  "font-semibold capitalize",
                  getTextColor("heading"),
                )}
              >
                {item.name}
              </TableCell>
              <TableCell nowrap={false}>
                <span
                  className={cn(
                    "text-lg font-bold",
                    getAccentColor("blue", "primary"),
                  )}
                >
                  {item.value}
                </span>
              </TableCell>
              <TableCell nowrap={false}>
                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    getAccentColor("purple", "background"),
                    getAccentColor("purple", "text"),
                  )}
                >
                  {item.unit}
                </span>
              </TableCell>
              <TableCell className={getTextColor("muted")}>
                {item.formattedTime}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </BaseTable>
    </BaseCard>
  );
});
