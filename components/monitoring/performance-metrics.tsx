"use client";

import { ChartIcon } from "@/components/ui/icons";
import { MetricSummaryCard } from "@/components/ui/metric-card";
import { BaseCard } from "@/components/ui/base-card";
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
  metrics: MetricsData;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const metricsCards = MonitoringDashboardService.getMetricsCardsData(metrics);
  const activityData =
    MonitoringDashboardService.getRecentActivityData(metrics);

  return (
    <BaseCard className="mb-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <ChartIcon />
        <h2 className="text-xl font-semibold text-gray-900">
          Performance Metrics
        </h2>
      </div>

      <MetricsCards cards={metricsCards} />

      <RecentActivityTable activityData={activityData} />
    </BaseCard>
  );
}

interface MetricsCardsProps {
  cards: Array<{
    name: string;
    displayName: string;
    summary: any;
  }>;
}

function MetricsCards({ cards }: MetricsCardsProps) {
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
}

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

function RecentActivityTable({ activityData }: RecentActivityTableProps) {
  return (
    <BaseCard>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Recent Activity Log
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
}
