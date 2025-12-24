"use client";

import React, { useMemo } from "react";
import { ChartIcon } from "@/components/ui/icons";
import { MetricSummaryCard } from "@/components/ui/metric-card";
import { BaseCard } from "@/components/ui/base-card";
import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
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

interface PerformanceMetricsProps {
  metrics?: MetricsData;
  loading?: boolean;
}

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

    if (loading || !metrics) {
      return (
        <BaseCard className="mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ChartIcon />
            <h2 className="text-xl font-semibold text-gray-900">
              {UI_TEXT.monitoring.performanceMetrics}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
          <BaseCard>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {UI_TEXT.monitoring.recentActivity}
            </h3>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <Skeleton variant="text" className="h-4 w-16" />
                    <Skeleton variant="text" className="h-4 w-12" />
                    <Skeleton variant="text" className="h-4 w-10" />
                    <Skeleton variant="text" className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </BaseCard>
        </BaseCard>
      );
    }

    return (
      <BaseCard className="mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ChartIcon />
          <h2 className="text-xl font-semibold text-gray-900">
            {UI_TEXT.monitoring.performanceMetrics}
          </h2>
        </div>

        <MetricsCards cards={metricsCards || []} />

        <RecentActivityTable activityData={activityData || []} />
      </BaseCard>
    );
  },
);

interface MetricsCardsProps {
  cards: Array<{
    name: string;
    displayName: string;
    summary: any;
  }>;
}

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

interface RecentActivityTableProps {
  activityData: Array<{
    id: number;
    name: string;
    value: string | number;
    unit: string;
    timestamp: string;
    formattedTime: string;
  }>;
}

const RecentActivityTable = React.memo(function RecentActivityTableComponent({
  activityData,
}: RecentActivityTableProps) {
  return (
    <BaseCard>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
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
              <TableCell className="font-semibold text-gray-900 capitalize">
                {item.name}
              </TableCell>
              <TableCell nowrap={false}>
                <span className="text-lg font-bold text-blue-600">
                  {item.value}
                </span>
              </TableCell>
              <TableCell nowrap={false}>
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  {item.unit}
                </span>
              </TableCell>
              <TableCell className="text-gray-500">
                {item.formattedTime}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </BaseTable>
    </BaseCard>
  );
});
