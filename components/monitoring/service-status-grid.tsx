"use client";

import React, { useMemo } from "react";
import { ServerIcon, ExpandIcon } from "@/components/ui/icons";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { BaseCard } from "@/components/ui/base-card";
import { MonitoringDashboardService } from "@/lib/services/monitoring-dashboard-service";
import { UI_TEXT } from "@/lib/constants/ui-text";
import type { SystemHealth } from "@/lib/hooks/use-monitoring";
import {
  STATUS_THEMES,
  ANIMATION_STATES,
  getTextColor,
  cn,
} from "@/lib/constants/ui-themes";

interface ServiceStatusGridProps {
  health: SystemHealth;
  expandedService: string | null;
  // eslint-disable-next-line no-unused-vars
  onToggleServiceExpansion: (serviceName: string) => void;
}

export const ServiceStatusGrid = React.memo(
  function ServiceStatusGridComponent({
    health,
    expandedService,
    onToggleServiceExpansion,
  }: ServiceStatusGridProps) {
    const isLive = useMemo(
      () => MonitoringDashboardService.isDataLive(health.timestamp),
      [health.timestamp],
    );

    return (
      <div>
        <h3
          className={cn(
            "text-lg font-medium mb-4 flex items-center gap-2",
            getTextColor("heading"),
          )}
        >
          <ServerIcon />
          {UI_TEXT.monitoring.serviceStatusDetails}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.checks.map((check, index) => {
            const isExpanded = expandedService === check.service;

            return (
              <ServiceCard
                key={index}
                check={check}
                health={health}
                isExpanded={isExpanded}
                isLive={isLive}
                onToggle={() =>
                  onToggleServiceExpansion(isExpanded ? "" : check.service)
                }
              />
            );
          })}
        </div>
      </div>
    );
  },
);

interface ServiceCardProps {
  check: SystemHealth["checks"][0];
  health: SystemHealth;
  isExpanded: boolean;
  isLive: boolean;
  onToggle: () => void;
}

const ServiceCard = React.memo(function ServiceCardComponent({
  check,
  health,
  isExpanded,
  isLive,
  onToggle,
}: ServiceCardProps) {
  const serviceData = useMemo(
    () => MonitoringDashboardService.formatServiceData(health, check.service),
    [health, check.service],
  );

  const detailData = useMemo(
    () => MonitoringDashboardService.getServiceDetailData(serviceData),
    [serviceData],
  );

  return (
    <BaseCard variant="hover" padding="sm">
      <button
        onClick={onToggle}
        className={cn(
          "w-full text-left focus:outline-none focus:ring-2 focus:ring-inset",
          "focus:ring-blue-500",
        )}
      >
        <div className="flex items-center justify-between">
          <h4
            className={cn(
              "font-semibold capitalize flex items-center gap-2",
              getTextColor("heading"),
            )}
          >
            <StatusIndicator
              status={check.status as StatusType}
              size="sm"
              showText={false}
            />
            {check.service}
          </h4>
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-1">
                <div className={ANIMATION_STATES.liveAnimated} />
                <span className={cn("text-xs", getTextColor("muted"))}>
                  Live
                </span>
              </div>
            )}
            <StatusIndicator
              status={check.status as StatusType}
              size="sm"
              showIcon={false}
            />
            <ExpandIcon isExpanded={isExpanded} />
          </div>
        </div>
        {check.responseTime && (
          <div className={cn("mt-2 text-sm", getTextColor("body"))}>
            Response:{" "}
            {MonitoringDashboardService.formatResponseTime(check.responseTime)}
          </div>
        )}
      </button>

      {isExpanded && (
        <ServiceDetailPanel detailData={detailData} error={check.error} />
      )}
    </BaseCard>
  );
});

interface ServiceDetailPanelProps {
  detailData: Array<{
    name: string;
    label: string;
    value: string | number;
    status?: string;
  }>;
  error?: string;
}

const ServiceDetailPanel = React.memo(function ServiceDetailPanelComponent({
  detailData,
  error,
}: ServiceDetailPanelProps) {
  return (
    <div className={cn("px-4 pb-4 border-t bg-gray-50", "border-gray-100")}>
      <div className="pt-4 space-y-3">
        {detailData.map((detail) => (
          <BaseCard key={detail.name} padding="sm">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm", getTextColor("body"))}>
                {detail.label}
              </span>
              {detail.status ? (
                <StatusIndicator
                  status={detail.status as StatusType}
                  size="sm"
                  showIcon={false}
                  className="px-2 py-1 rounded text-xs font-medium"
                />
              ) : (
                <span
                  className={cn("text-sm font-medium", getTextColor("heading"))}
                >
                  {detail.value}
                </span>
              )}
            </div>
          </BaseCard>
        ))}
        {error && (
          <div
            className={`p-3 rounded-lg border ${STATUS_THEMES.unhealthy.background} ${STATUS_THEMES.unhealthy.border}`}
          >
            <div className={`text-sm ${STATUS_THEMES.unhealthy.text}`}>
              <strong>Error Details:</strong>
            </div>
            <div
              className={`text-sm mt-1 font-mono ${STATUS_THEMES.unhealthy.text.replace("700", "600")}`}
            >
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
