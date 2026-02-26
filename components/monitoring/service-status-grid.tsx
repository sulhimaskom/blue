"use client";

import React, { useMemo } from "react";
import { ServerIcon, ExpandIcon } from "@/components/ui/icons";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { BaseCard } from "@/components/ui/base-card";
import type { StatusType } from "@/lib/services/service-types";
import { MonitoringDashboardService } from "@/lib/services/monitoring-dashboard-service";
import { UI_TEXT } from "@/lib/constants/ui-text";
import type { SystemHealth } from "@/lib/hooks/use-monitoring";
import {
  STATUS_THEMES,
  ANIMATION_STATES,
  getTextColor,
  cn,
} from "@/lib/constants/ui-themes";

/**
 * Props for the ServiceStatusGrid component.
 * @interface ServiceStatusGridProps
 */
interface ServiceStatusGridProps {
  /** System health data containing all service checks and status information */
  health: SystemHealth;
  /** Name of the currently expanded service for detailed view, or null if none expanded */
  expandedService: string | null;
  /** Callback function to toggle expansion state for a specific service */
  // eslint-disable-next-line no-unused-vars
  onToggleServiceExpansion: (serviceName: string) => void;
}

/**
 * ServiceStatusGrid component that displays individual service status in a responsive grid layout.
 *
 * Architectural Pattern:
 * - Service Layer compliance: delegates all data processing to MonitoringDashboardService
 * - Atomic design with composable ServiceCard components
 * - Memoized components for performance optimization
 * - Accessible interactions with proper ARIA labels
 *
 * Features:
 * - Responsive grid layout (1 column mobile, 2 tablet, 3 desktop)
 * - Each service displays status, response time, and live indicator
 * - Expandable cards with detailed service information
 * - Real-time status indicators with animations
 * - Comprehensive error details in expanded view
 * - Hover effects and keyboard navigation
 *
 * Data Flow:
 * 1. Receives SystemHealth data from parent component
 * 2. Checks data freshness using MonitoringDashboardService.isDataLive()
 * 3. Maps each service check to ServiceCard component
 * 4. Handles expansion state and user interactions
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - useMemo for data freshness calculation
 * - Individual ServiceCard memoization
 * - Efficient state management
 *
 * @example
 * ```tsx
 * <ServiceStatusGrid
 *   health={systemHealth}
 *   expandedService="database"
 *   onToggleServiceExpansion={(service) => console.log('Toggle:', service)}
 * />
 * ```
 */
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

/**
 * Props for the ServiceCard component.
 * @interface ServiceCardProps
 */
interface ServiceCardProps {
  /** Individual service check data containing status, response time, and error information */
  check: SystemHealth["checks"][0];
  /** Complete system health data for context and additional calculations */
  health: SystemHealth;
  /** Whether this service card is currently expanded to show details */
  isExpanded: boolean;
  /** Whether the monitoring data is currently live (fresh) */
  isLive: boolean;
  /** Callback function to toggle the expansion state of this service */
  onToggle: () => void;
}

/**
 * ServiceCard component that displays individual service status with expandable details.
 *
 * Features:
 * - Service status with color-coded indicators
 * - Response time display with formatted units
 * - Live data indicator with animation
 * - Expandable details panel with comprehensive information
 * - Keyboard accessible and screen reader friendly
 * - Hover effects and visual feedback
 * - Error details display with proper formatting
 *
 * Data Processing:
 * - Uses MonitoringDashboardService.formatServiceData() for display formatting
 * - Delegates detail data calculation to Service Layer
 * - Formats response times using service methods
 * - Processes error information for user display
 *
 * Architecture:
 * Follows atomic design principles with focused single responsibility.
 * Extracts all business logic to MonitoringDashboardService per Service Layer principles.
 */
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
        aria-expanded={isExpanded}
        aria-controls={`service-details-${check.service}`}
        aria-label={`Toggle details for ${check.service} service, currently ${isExpanded ? "expanded" : "collapsed"}`}
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
              status={check.status}
              size="sm"
              showText={false}
              aria-label={`${check.service} service status: ${check.status}`}
            />
            {check.service}
          </h4>
          <div className="flex items-center gap-3">
            {isLive && (
              <div
                className="flex items-center gap-1"
                aria-live="polite"
                aria-label="Data is live"
              >
                <div
                  className={ANIMATION_STATES.liveAnimated}
                  aria-hidden="true"
                />
                <span className={cn("text-xs", getTextColor("muted"))}>
                  Live
                </span>
              </div>
            )}
            <StatusIndicator
              status={check.status}
              size="sm"
              showIcon={false}
              aria-label={`Service status: ${check.status}`}
            />
            <ExpandIcon isExpanded={isExpanded} aria-hidden="true" />
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
        <div id={`service-details-${check.service}`}>
          <ServiceDetailPanel detailData={detailData} error={check.error} />
        </div>
      )}
    </BaseCard>
  );
});

/**
 * Props for the ServiceDetailPanel component.
 * @interface ServiceDetailPanelProps
 */
interface ServiceDetailPanelProps {
  /** Array of formatted detail items for the service */
  detailData: Array<{
    name: string;
    label: string;
    value: string | number;
    status?: StatusType | string;
  }>;
  /** Optional error message to display for failed services */
  error?: string;
}

/**
 * ServiceDetailPanel component that displays expanded service information with error handling.
 *
 * Features:
 * - Comprehensive service details in card format
 * - Status indicators with color coding
 * - Error information display with proper formatting
 * - Consistent spacing and theme integration
 * - Accessible error presentation
 * - Memoized for performance optimization
 *
 * Display Information:
 * - Response time with formatted duration
 * - Service status with indicators
 * - Last checked timestamp
 * - Error details with monospace formatting
 */
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
              status={['healthy', 'degraded', 'unhealthy', 'unknown'].includes(detail.status) ? detail.status : 'unknown'}
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
