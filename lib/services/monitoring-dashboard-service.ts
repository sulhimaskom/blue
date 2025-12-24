import type { SystemHealth, MetricsData } from "../hooks/use-monitoring";
import {
  formatDuration,
  formatMetricDisplayName,
  MONITORING_THRESHOLDS,
} from "@/lib/utils/time-formatting";

export interface HealthScoreMetrics {
  score: number;
  healthyServices: number;
  totalServices: number;
  statusText: string;
}

export interface ServiceStatusData {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  lastChecked: Date;
  isLive: boolean;
}

export interface FormattedServiceData {
  name: string;
  label: string;
  value: string | number;
  unit?: string;
  badge?: string;
  status?: string;
}

/**
 * Service class for monitoring dashboard business logic
 * Extracts business calculations from UI components
 */
export class MonitoringDashboardService {
  /**
   * Calculate comprehensive health score metrics
   */
  static calculateHealthScoreMetrics(
    health: SystemHealth | null,
  ): HealthScoreMetrics {
    if (!health) {
      return {
        score: 0,
        healthyServices: 0,
        totalServices: 0,
        statusText: "Unknown",
      };
    }

    const healthyServices = health.checks.filter(
      (check) => check.status === "healthy",
    ).length;
    const totalServices = health.checks.length;
    const score = Math.round((healthyServices / totalServices) * 100);

    return {
      score,
      healthyServices,
      totalServices,
      statusText: this.getSystemStatusText(score),
    };
  }

  /**
   * Format service data for UI display
   */
  static formatServiceData(
    health: SystemHealth,
    serviceName: string,
  ): ServiceStatusData {
    const check = health.checks.find((c) => c.service === serviceName);

    if (!check) {
      return {
        name: serviceName,
        status: "unhealthy",
        lastChecked: new Date(health.timestamp),
        isLive: this.isDataLive(health.timestamp),
      };
    }

    return {
      name: serviceName,
      status: check.status,
      responseTime: check.responseTime,
      error: check.error,
      lastChecked: new Date(health.timestamp),
      isLive: this.isDataLive(health.timestamp),
    };
  }

  /**
   * Format service details for expanded view
   */
  static getServiceDetailData(
    check: ServiceStatusData,
  ): FormattedServiceData[] {
    const details: FormattedServiceData[] = [];

    // Response time
    if (check.responseTime) {
      details.push({
        name: "responseTime",
        label: "Response time:",
        value: formatDuration(check.responseTime),
      });
    }

    // Status
    details.push({
      name: "status",
      label: "Status:",
      value: check.status,
      status: check.status,
    });

    // Last checked
    details.push({
      name: "lastChecked",
      label: "Last checked:",
      value: check.lastChecked.toLocaleTimeString(),
    });

    return details;
  }

  /**
   * Get formatted metrics summary for cards
   */
  static getMetricsCardsData(metrics: MetricsData): Array<{
    name: string;
    displayName: string;
    summary: any;
  }> {
    return Object.entries(metrics.summaries).map(([name, summary]) => ({
      name,
      displayName: formatMetricDisplayName(name),
      summary,
    }));
  }

  /**
   * Format recent activity table data
   */
  static getRecentActivityData(metrics: MetricsData) {
    return metrics.recent.slice(0, 10).map((metric, index) => ({
      id: index,
      name: formatMetricDisplayName(metric.name),
      value: metric.unit === "ms" ? formatDuration(metric.value) : metric.value,
      unit: metric.unit,
      timestamp: metric.timestamp,
      formattedTime: new Date(metric.timestamp).toLocaleString(),
    }));
  }

  /**
   * Check if monitoring data is live based on age
   */
  static isDataLive(timestamp: string): boolean {
    const now = Date.now();
    const dataAge = now - new Date(timestamp).getTime();
    const timeSinceUpdate = dataAge / 1000; // Convert to seconds

    return timeSinceUpdate < MONITORING_THRESHOLDS.DATA_FRESHNESS;
  }

  /**
   * Get system overview data for health cards
   * Extracts data processing logic from UI components to maintain Service Layer compliance
   */
  static getSystemOverviewData(health: SystemHealth) {
    return {
      uptime: formatDuration(health.uptime),
      // Add other overview metrics as needed
      totalServices: health.checks.length,
      healthyServices: health.checks.filter(
        (check) => check.status === "healthy",
      ).length,
      status: health.status,
    };
  }

  /**
   * Format response time for display
   * Extracts inline formatting logic from UI components to maintain Service Layer compliance
   */
  static formatResponseTime(responseTime: number): string {
    if (responseTime < 1000) {
      return `${Math.round(responseTime)}ms`;
    } else {
      return `${(responseTime / 1000).toFixed(2)}s`;
    }
  }

  /**
   * Private helper methods
   */
  private static getSystemStatusText(score: number): string {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Degraded";
    return "Critical";
  }
}
