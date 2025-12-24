import type { SystemHealth, MetricsData } from "../hooks/use-monitoring";

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
        value: this.formatDuration(check.responseTime),
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
      displayName: this.formatMetricDisplayName(name),
      summary,
    }));
  }

  /**
   * Format recent activity table data
   */
  static getRecentActivityData(metrics: MetricsData) {
    return metrics.recent.slice(0, 10).map((metric, index) => ({
      id: index,
      name: this.formatMetricDisplayName(metric.name),
      value:
        metric.unit === "ms" ? this.formatDuration(metric.value) : metric.value,
      unit: metric.unit,
      timestamp: metric.timestamp,
      formattedTime: new Date(metric.timestamp).toLocaleString(),
    }));
  }

  /**
   * Get system overview metrics
   */
  static getSystemOverviewData(health: SystemHealth) {
    return {
      uptime: this.formatUptime(health.uptime),
      totalServices: health.checks.length,
      healthScore: this.calculateHealthScoreMetrics(health),
      lastUpdate: new Date(health.timestamp),
    };
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

  private static isDataLive(timestamp: string): boolean {
    const timeSinceUpdate = Date.now() - new Date(timestamp).getTime();
    return timeSinceUpdate < 5000; // less than 5 seconds ago
  }

  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private static formatMetricDisplayName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
