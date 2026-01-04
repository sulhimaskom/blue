import type {
  SystemHealth,
  MetricsData,
  HealthScoreMetrics,
  ServiceStatusData,
  FormattedServiceData,
} from "./service-types";
import {
  formatDuration,
  formatMetricDisplayName,
  MONITORING_THRESHOLDS,
} from "@/lib/utils/time-formatting";

// Re-export for backward compatibility
export type {
  HealthScoreMetrics,
  ServiceStatusData,
  FormattedServiceData,
} from "./service-types";

/**
 * Service class for monitoring dashboard business logic.
 *
 * Service Layer Implementation (blueprint.md compliance):
 * - Extracts ALL business calculations from UI components
 * - Centralizes data processing and formatting logic
 * - Zero business logic in UI components principle
 * - Provides reusable methods for data transformation
 * - Maintains separation between presentation and business logic
 *
 * Architectural Benefits:
 * - Eliminates code duplication across components
 * - Ensures consistent data processing
 * - Improves testability with isolated business logic
 * - Enables easier maintenance and refactoring
 * - Follows single responsibility principle
 *
 * Data Processing Responsibilities:
 * - Health score calculations and status determination
 * - Service data formatting for display
 * - Metrics data processing for cards and tables
 * - Time formatting and duration calculations
 * - Data freshness validation
 * - Response time formatting
 *
 * Usage Pattern:
 * - All methods are static for stateless operations
 * - Pure functions with predictable output
 * - No side effects or external dependencies
 * - Type-safe interfaces for all data transformations
 *
 * @example
 * ```typescript
 * // Health score calculation
 * const metrics = MonitoringDashboardService.calculateHealthScoreMetrics(health);
 *
 * // Service data formatting
 * const serviceData = MonitoringDashboardService.formatServiceData(health, 'database');
 *
 * // Metrics processing
 * const cards = MonitoringDashboardService.getMetricsCardsData(metrics);
 * ```
 */
export class MonitoringDashboardService {
  /**
   * Calculate comprehensive health score metrics from system health data.
   *
   * Calculation Logic:
   * - Health score = (healthy services / total services) * 100
   * - Rounded to nearest integer for display
   * - Status text determined by score thresholds
   * - Handles null/undefined health data gracefully
   *
   * Score Thresholds:
   * - 90-100: "Excellent"
   * - 70-89: "Good"
   * - 50-69: "Degraded"
   * - 0-49: "Critical"
   *
   * @param health - System health data containing service checks
   * @returns HealthScoreMetrics object with calculated values
   *
   * @example
   * ```typescript
   * const health = { checks: [
   *   { service: 'api', status: 'healthy' },
   *   { service: 'db', status: 'unhealthy' }
   * ]};
   * const metrics = MonitoringDashboardService.calculateHealthScoreMetrics(health);
   * // Result: { score: 50, healthyServices: 1, totalServices: 2, statusText: 'Degraded' }
   * ```
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
   * Format service data for UI display with comprehensive status information.
   *
   * Processing Logic:
   * - Finds service check in health data array
   * - Extracts status, response time, and error information
   * - Adds timestamp and live data indicators
   * - Provides default values for missing services
   *
   * Data Structure:
   * - Status string for UI indicators
   * - Response time in milliseconds for performance metrics
   * - Error message for troubleshooting
   * - Last checked timestamp for freshness
   * - Live flag for real-time indicators
   *
   * @param health - System health data containing all service checks
   * @param serviceName - Name of the service to format data for
   * @returns ServiceStatusData object with formatted service information
   *
   * @example
   * ```typescript
   * const serviceData = MonitoringDashboardService.formatServiceData(
   *   health,
   *   'database'
   * );
   * // Result: { name: 'database', status: 'healthy', responseTime: 150, ... }
   * ```
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
   * Format service details for expanded view with comprehensive information.
   *
   * Detail Items:
   * - Response time with formatted duration (ms or seconds)
   * - Status with color-coded indicator
   * - Last checked timestamp in local time format
   * - Additional details as needed for troubleshooting
   *
   * Formatting Rules:
   * - Response times use duration formatting for readability
   * - Timestamps use user's local timezone
   * - Status values can be displayed as indicators
   * - Consistent label naming for UI elements
   *
   * @param check - Service status data from formatServiceData()
   * @returns Array of formatted service detail items
   *
   * @example
   * ```typescript
   * const details = MonitoringDashboardService.getServiceDetailData(serviceData);
   * // Result: [
   * //   { name: 'responseTime', label: 'Response time:', value: '150ms' },
   * //   { name: 'status', label: 'Status:', value: 'healthy', status: 'healthy' },
   * //   { name: 'lastChecked', label: 'Last checked:', value: '2:30:45 PM' }
   * // ]
   * ```
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
   * Get formatted metrics summary for card components.
   *
   * Processing Logic:
   * - Transforms metrics summaries object to array format
   * - Formats metric names for human-readable display
   * - Maintains original summary data structures
   * - Provides consistent format for card rendering
   *
   * Data Structure:
   * - Name property for component keys and identification
   * - DisplayName for user-facing labels
   * - Summary object containing calculated metrics
   * - Preserves original data structure for flexibility
   *
   * @param metrics - Raw metrics data from API
   * @returns Array of formatted metric card data
   *
   * @example
   * ```typescript
   * const cards = MonitoringDashboardService.getMetricsCardsData(metrics);
   * // Result: [
   * //   { name: 'responseTime', displayName: 'Response Time', summary: {...} },
   * //   { name: 'throughput', displayName: 'Throughput', summary: {...} }
   * // ]
   * ```
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
   * Format recent activity data for table components with proper formatting.
   *
   * Processing Steps:
   * - Limits results to 10 most recent entries for UI performance
   * - Formats metric names using display name mappings
   * - Converts duration values to human-readable format
   * - Formats timestamps to local timezone
   * - Adds unique IDs for React key props
   *
   * Formatting Rules:
   * - Millisecond values use duration formatting
   * - Timestamps use user's local time format
   * - Units displayed as styled badges in UI
   * - Metric names capitalized for table headers
   * - Maintains original data structure for accuracy
   *
   * @param metrics - Raw metrics data containing recent activity array
   * @returns Array of formatted activity data for table display
   *
   * @example
   * ```typescript
   * const activity = MonitoringDashboardService.getRecentActivityData(metrics);
   * // Result: [
   * //   { id: 0, name: 'Response Time', value: '150ms', unit: 'ms', ... },
   * //   { id: 1, name: 'CPU Usage', value: '75', unit: '%', ... }
   * // ]
   * ```
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
   * Check if monitoring data is live based on age and configured thresholds.
   *
   * Freshness Logic:
   * - Compares data timestamp to current time
   * - Uses MONITORING_THRESHOLDS.DATA_FRESHNESS for comparison
   * - Accounts for browser and server time zone differences
   * - Returns boolean for UI live indicators
   *
   * Time Calculation:
   * - Data age calculated in milliseconds accuracy
   * - Converted to seconds for threshold comparison
   * - Configurable threshold allows customization
   * - Consistent calculation across all components
   *
   * @param timestamp - ISO timestamp of when data was generated
   * @returns boolean indicating if data is considered fresh/live
   *
   * @example
   * ```typescript
   * const isLive = MonitoringDashboardService.isDataLive('2024-12-25T10:30:00Z');
   * // Returns: true if timestamp is within freshness threshold
   * ```
   */
  static isDataLive(timestamp: string): boolean {
    const now = Date.now();
    const dataAge = now - new Date(timestamp).getTime();
    const timeSinceUpdate = dataAge / 1000; // Convert to seconds

    return timeSinceUpdate < MONITORING_THRESHOLDS.DATA_FRESHNESS;
  }

  /**
   * Get system overview data for health cards.
   *
   * Service Layer Compliance:
   * Extracts data processing logic from UI components to maintain bluepring.md compliance.
   * Zero business logic principle enforced - all calculations happen here.
   *
   * Provided Data:
   * - System uptime with formatted duration
   * - Total services count from health checks
   * - Healthy services count for status calculation
   * - Overall system status for quick reference
   *
   * Processing Logic:
   * - Uptime duration formatted for human readability
   * - Service counts extracted from health check array
   * - Status preserved from original health data
   * - Additional metrics can be added as needed
   *
   * @param health - System health data containing uptime and service checks
   * @returns Object with formatted overview data for card components
   *
   * @example
   * ```typescript
   * const overview = MonitoringDashboardService.getSystemOverviewData(health);
   * // Result: { uptime: '5 days, 3 hours', totalServices: 10, healthyServices: 8, status: 'healthy' }
   * ```
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
   * Format response time for optimal display readability.
   *
   * Service Layer Compliance:
   * Extracts inline formatting logic from UI components to maintain bluepring.md compliance.
   * Centralizes formatting rules for consistency across components.
   *
   * Formatting Rules:
   * - Values < 1000ms: Display as "150ms" (millisecond format)
   * - Values >= 1000ms: Display as "1.50s" (second format with 2 decimals)
   * - Maintains precision for performance monitoring
   * - Consistent formatting across all UI components
   *
   * UX Considerations:
   * - Sub-second values use milliseconds for precision
   * - Multi-second values use seconds for readability
   * - Decimal places provide meaningful precision
   * - Unit suffix clearly indicates measurement type
   *
   * @param responseTime - Response time in milliseconds
   * @returns Formatted string with appropriate units and precision
   *
   * @example
   * ```typescript
   * const formatted = MonitoringDashboardService.formatResponseTime(1500);
   * // Returns: "1.50s"
   *
   * const formatted2 = MonitoringDashboardService.formatResponseTime(250);
   * // Returns: "250ms"
   * ```
   */
  static formatResponseTime(responseTime: number): string {
    if (responseTime < 1000) {
      return `${Math.round(responseTime)}ms`;
    } else {
      return `${(responseTime / 1000).toFixed(2)}s`;
    }
  }

  /**
   * Private helper method to determine status text based on health score.
   *
   * Status Thresholds:
   * - 90+: "Excellent" - All systems performing optimally
   * - 70-89: "Good" - Minor issues but overall good performance
   * - 50-69: "Degraded" - Significant issues requiring attention
   * - <50: "Critical" - Major problems requiring immediate action
   *
   * UX Impact:
   * Status text provides immediate understanding of system health
   * without requiring users to analyze individual component statuses.
   *
   * @private
   * @param score - Health score between 0-100
   * @returns Human-readable status string
   */
  private static getSystemStatusText(score: number): string {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Degraded";
    return "Critical";
  }
}
