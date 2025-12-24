import { logger } from "../logger";
import { DatabaseIndexer } from "../db/indexes";
import { IdGenerators } from "../utils/id-generator";

/**
 * Database Performance Monitoring & Alerting Configuration
 *
 * Provides intelligent monitoring with configurable thresholds and automated alerting
 * for database performance optimization and scaling readiness
 */

export interface PerformanceThresholds {
  slowQueryTime: number; // ms - alerts for queries exceeding this
  connectionUtilization: number; // % - alerts when connection pool exceeds this
  errorRate: number; // % - alerts when error rate exceeds this
  throughputMinimum: number; // queries/sec - alerts when below this
  indexUsageThreshold: number; // % - alerts for unused indexes below this
}

export interface AlertConfiguration {
  enabled: boolean;
  thresholds: PerformanceThresholds;
  alertChannels: Array<{
    type: "log" | "webhook" | "email";
    config: Record<string, any>;
    enabled: boolean;
  }>;
  cooldownPeriod: number; // ms - minimum time between similar alerts
}

export interface PerformanceMetrics {
  timestamp: string;
  queryLatency: number;
  throughput: number;
  errorRate: number;
  connectionUtilization: number;
  slowQueries: number;
  indexUsageEfficiency: number;
  scalingReadinessScore: number;
}

export interface PerformanceAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  recommendation: string;
  resolved: boolean;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slowQueryTime: 200, // 200ms query execution time
  connectionUtilization: 80, // 80% connection pool utilization
  errorRate: 5, // 5% error rate
  throughputMinimum: 10, // 10 queries/sec minimum throughput
  indexUsageThreshold: 10, // 10% minimum index usage
};

const DEFAULT_ALERT_CONFIG: AlertConfiguration = {
  enabled: true,
  thresholds: DEFAULT_THRESHOLDS,
  alertChannels: [
    {
      type: "log",
      config: { level: "warn" },
      enabled: true,
    },
  ],
  cooldownPeriod: 300000, // 5 minutes
};

export class DatabasePerformanceMonitor {
  private static alertHistory = new Map<string, number>();
  private static activeAlerts: PerformanceAlert[] = [];
  private static alertConfig: AlertConfiguration = DEFAULT_ALERT_CONFIG;

  /**
   * Initialize monitoring with custom configuration
   */
  static initialize(config?: Partial<AlertConfiguration>): void {
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...config };
    logger.info("Database performance monitor initialized", {
      enabled: this.alertConfig.enabled,
      alertChannels: this.alertConfig.alertChannels.filter((ch) => ch.enabled)
        .length,
      thresholds: this.alertConfig.thresholds,
    });
  }

  /**
   * Comprehensive performance monitoring with intelligent alerting
   * ENHANCED: Advanced alerting with threshold-based monitoring
   */
  static async monitorAndAlert(): Promise<{
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: string[];
    healthStatus: "healthy" | "warning" | "critical";
  }> {
    try {
      // Collect metrics from multiple sources
      const metrics = await this.collectPerformanceMetrics();

      // Check thresholds and generate alerts
      const newAlerts = await this.evaluateThresholds(metrics);

      // Generate contextual recommendations
      const recommendations = this.generateRecommendations(metrics, newAlerts);

      // Determine overall health status
      const healthStatus = this.calculateHealthStatus(metrics, newAlerts);

      // Store alerts and send notifications
      if (newAlerts.length > 0) {
        await this.processAlerts(newAlerts);
      }

      logger.debug("Performance monitoring completed", {
        healthStatus,
        metricsCollected: Object.keys(metrics).length,
        alertsTriggered: newAlerts.length,
        recommendationsCount: recommendations.length,
      });

      return {
        metrics,
        alerts: [...this.activeAlerts],
        recommendations,
        healthStatus,
      };
    } catch (error) {
      logger.error("Performance monitoring failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        metrics: this.getEmptyMetrics(),
        alerts: [],
        recommendations: [
          "Enable database monitoring for performance optimization",
        ],
        healthStatus: "warning",
      };
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  private static async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date().toISOString();

    try {
      // Get comprehensive scaling analysis
      const scalingAnalysis =
        await DatabaseIndexer.comprehensiveScalingAnalysis();

      // Get query performance metrics
      const queryMetrics = await DatabaseIndexer.getQueryPerformanceMetrics();

      // Calculate derived metrics
      const slowQueries = queryMetrics.slowQueries.length;
      const avgQueryTime =
        queryMetrics.slowQueries.reduce((acc, q) => acc + q.meanTime, 0) /
        Math.max(slowQueries, 1);
      const indexUsageEfficiency = this.calculateIndexUsageEfficiency(
        queryMetrics.indexUsageStats,
      );

      return {
        timestamp,
        queryLatency: avgQueryTime,
        throughput:
          scalingAnalysis.performance.avgQueryTime > 0
            ? 100 / scalingAnalysis.performance.avgQueryTime
            : 0,
        errorRate: scalingAnalysis.performance.bottlenecks.length * 2, // Simple error rate estimation
        connectionUtilization: 75, // Placeholder - would come from connection pool stats
        slowQueries,
        indexUsageEfficiency,
        scalingReadinessScore: scalingAnalysis.overallScore,
      };
    } catch (error) {
      logger.warn("Failed to collect some metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return this.getEmptyMetrics();
    }
  }

  /**
   * Evaluate thresholds and generate alerts
   */
  private static async evaluateThresholds(
    metrics: PerformanceMetrics,
  ): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const thresholds = this.alertConfig.thresholds;

    // Check each threshold and create alerts if exceeded
    if (metrics.queryLatency > thresholds.slowQueryTime) {
      alerts.push(
        this.createAlert(
          "high",
          "slow_query_performance",
          `Query latency (${metrics.queryLatency.toFixed(1)}ms) exceeds threshold (${thresholds.slowQueryTime}ms)`,
          "queryLatency",
          metrics.queryLatency,
          thresholds.slowQueryTime,
          "Consider adding indexes or optimizing slow queries",
        ),
      );
    }

    if (metrics.connectionUtilization > thresholds.connectionUtilization) {
      alerts.push(
        this.createAlert(
          "medium",
          "connection_pool_utilization",
          `Connection utilization (${metrics.connectionUtilization}%) exceeds threshold (${thresholds.connectionUtilization}%)`,
          "connectionUtilization",
          metrics.connectionUtilization,
          thresholds.connectionUtilization,
          "Consider increasing connection pool size or implementing connection pooling",
        ),
      );
    }

    if (metrics.errorRate > thresholds.errorRate) {
      alerts.push(
        this.createAlert(
          "critical",
          "high_error_rate",
          `Error rate (${metrics.errorRate.toFixed(1)}%) exceeds threshold (${thresholds.errorRate}%)`,
          "errorRate",
          metrics.errorRate,
          thresholds.errorRate,
          "Investigate and resolve database errors immediately",
        ),
      );
    }

    if (metrics.throughput < thresholds.throughputMinimum) {
      alerts.push(
        this.createAlert(
          "medium",
          "low_throughput",
          `Throughput (${metrics.throughput.toFixed(1)} queries/sec) below minimum (${thresholds.throughputMinimum} queries/sec)`,
          "throughput",
          metrics.throughput,
          thresholds.throughputMinimum,
          "Check database performance and resource allocation",
        ),
      );
    }

    if (metrics.indexUsageEfficiency < thresholds.indexUsageThreshold) {
      alerts.push(
        this.createAlert(
          "low",
          "index_usage_efficiency",
          `Index usage efficiency (${metrics.indexUsageEfficiency.toFixed(1)}%) below threshold (${thresholds.indexUsageThreshold}%)`,
          "indexUsageEfficiency",
          metrics.indexUsageEfficiency,
          thresholds.indexUsageThreshold,
          "Consider removing unused indexes or analyzing query patterns",
        ),
      );
    }

    // Filter alerts based on cooldown period
    return alerts.filter((alert) => this.shouldSendAlert(alert));
  }

  /**
   * Create a structured performance alert
   */
  private static createAlert(
    severity: "low" | "medium" | "high" | "critical",
    type: string,
    message: string,
    metric: string,
    currentValue: number,
    threshold: number,
    recommendation: string,
  ): PerformanceAlert {
    return {
      id: IdGenerators.ALERT(type),
      severity,
      type,
      message,
      metric,
      currentValue,
      threshold,
      timestamp: new Date().toISOString(),
      recommendation,
      resolved: false,
    };
  }

  /**
   * Check if alert should be sent based on cooldown period
   */
  private static shouldSendAlert(alert: PerformanceAlert): boolean {
    const alertKey = `${alert.type}_${alert.metric}`;
    const lastSent = this.alertHistory.get(alertKey);

    if (!lastSent || Date.now() - lastSent > this.alertConfig.cooldownPeriod) {
      this.alertHistory.set(alertKey, Date.now());
      return true;
    }

    return false;
  }

  /**
   * Process and send alerts through configured channels
   */
  private static async processAlerts(
    alerts: PerformanceAlert[],
  ): Promise<void> {
    for (const alert of alerts) {
      this.activeAlerts.push(alert);

      // Log alert
      this.logAlert(alert);

      // Send through other channels
      for (const channel of this.alertConfig.alertChannels) {
        if (channel.enabled && channel.type !== "log") {
          await this.sendAlertToChannel(alert, channel);
        }
      }
    }

    // Clean old alerts (keep last 100)
    if (this.activeAlerts.length > 100) {
      this.activeAlerts = this.activeAlerts.slice(-100);
    }
  }

  /**
   * Log alert with appropriate severity
   */
  private static logAlert(alert: PerformanceAlert): void {
    const logMethod =
      alert.severity === "critical"
        ? "error"
        : alert.severity === "high"
          ? "error"
          : alert.severity === "medium"
            ? "warn"
            : "info";

    logger[logMethod]("Database performance alert", {
      alertId: alert.id,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      recommendation: alert.recommendation,
    });
  }

  /**
   * Send alert to specific channel (placeholder for webhook/email integration)
   */
  private static async sendAlertToChannel(
    alert: PerformanceAlert,
    channel: any,
  ): Promise<void> {
    // Placeholder for webhook/email integration
    logger.debug("Alert sent to channel", {
      alertId: alert.id,
      channelType: channel.type,
      channelConfig: channel.config,
    });
  }

  /**
   * Generate contextual recommendations based on metrics and alerts
   */
  private static generateRecommendations(
    metrics: PerformanceMetrics,
    alerts: PerformanceAlert[],
  ): string[] {
    const recommendations: string[] = [];

    // Performance-based recommendations
    if (metrics.scalingReadinessScore < 70) {
      recommendations.push(
        "Database scaling readiness is low - implement optimization strategies",
      );
    }

    if (metrics.queryLatency > 100) {
      recommendations.push(
        "Consider query optimization and indexing strategies",
      );
    }

    if (metrics.slowQueries > 5) {
      recommendations.push(
        "Multiple slow queries detected - analyze query patterns and add indexes",
      );
    }

    // Alert-based recommendations
    alerts.forEach((alert) => {
      if (!recommendations.includes(alert.recommendation)) {
        recommendations.push(alert.recommendation);
      }
    });

    // Proactive recommendations
    if (metrics.indexUsageEfficiency < 50) {
      recommendations.push(
        "Review index usage and remove unused indexes for better performance",
      );
    }

    return recommendations;
  }

  /**
   * Calculate overall health status
   */
  private static calculateHealthStatus(
    metrics: PerformanceMetrics,
    alerts: PerformanceAlert[],
  ): "healthy" | "warning" | "critical" {
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const highAlerts = alerts.filter((a) => a.severity === "high");

    if (criticalAlerts.length > 0) return "critical";
    if (highAlerts.length > 0 || alerts.length > 3) return "warning";
    if (metrics.scalingReadinessScore < 60) return "warning";

    return "healthy";
  }

  /**
   * Calculate index usage efficiency
   */
  private static calculateIndexUsageEfficiency(
    indexStats: Record<string, any>,
  ): number {
    const indexes = Object.values(indexStats);
    if (indexes.length === 0) return 100;

    const totalScans = indexes.reduce(
      (sum: number, idx: any) => sum + (idx.scans || 0),
      0,
    );
    const totalIndexes = indexes.length;

    return totalIndexes > 0
      ? Math.min((totalScans / totalIndexes) * 10, 100)
      : 100;
  }

  /**
   * Get empty metrics object for error scenarios
   */
  private static getEmptyMetrics(): PerformanceMetrics {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      queryLatency: 0,
      throughput: 0,
      errorRate: 0,
      connectionUtilization: 0,
      slowQueries: 0,
      indexUsageEfficiency: 100,
      scalingReadinessScore: 50,
    };
  }

  /**
   * Get current alert history and status
   */
  static getAlertStatus(): {
    totalAlerts: number;
    activeAlerts: PerformanceAlert[];
    recentAlerts: PerformanceAlert[];
    alertsBySeverity: Record<string, number>;
  } {
    const recentAlerts = this.activeAlerts.filter(
      (alert) => Date.now() - new Date(alert.timestamp).getTime() < 3600000, // Last hour
    );

    const alertsBySeverity = this.activeAlerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalAlerts: this.activeAlerts.length,
      activeAlerts: this.activeAlerts.filter((a) => !a.resolved),
      recentAlerts,
      alertsBySeverity,
    };
  }

  /**
   * Update configuration at runtime
   */
  static updateConfig(config: Partial<AlertConfiguration>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    logger.info("Database performance monitor configuration updated", {
      enabled: this.alertConfig.enabled,
      updatedKeys: Object.keys(config),
    });
  }
}
