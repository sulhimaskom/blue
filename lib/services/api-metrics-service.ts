import { monitoringService } from "@/lib/monitoring";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { DatabasePerformanceMonitor } from "@/lib/db/performance-monitor";
import DatabaseQueryCache from "./database-cache-service";

/**
 * Centralized API metrics calculation service
 *
 * This service contains all business logic for metrics calculation,
 * eliminating code duplication across API endpoints and ensuring
 * consistent metrics across the entire platform.
 *
 * Follows Service Layer principle - all business logic isolated
 * from API routes and UI components.
 */
export class APIMetricsService {
  /**
   * Calculate comprehensive system metrics with all subsystems and intelligent caching
   */
  static async getComprehensiveMetrics(limit: number = 100) {
    return DatabaseQueryCache.executeCachedQuery(
      "comprehensive-metrics",
      async () => {
        // Get base monitoring metrics
        const metrics = monitoringService.getMetrics(undefined, limit);
        const metricNames = [...new Set(metrics.map((m) => m.name))];

        // Calculate metric summaries
        const summaries: Record<string, any> = {};
        for (const name of metricNames) {
          summaries[name] = monitoringService.getMetricSummary(name);
        }

        // Get all subsystem metrics in parallel
        const [circuitBreakerData, dbPerformanceData, redisPerformanceData] =
          await Promise.all([
            this.getCircuitBreakerMetrics(),
            this.getDatabaseMetrics(),
            this.getRedisMetrics(),
          ]);

        return {
          metrics: metricNames,
          summaries,
          circuitBreakers: circuitBreakerData,
          database: dbPerformanceData,
          redis: redisPerformanceData,
          recent: metrics.slice(0, 50), // Latest 50 metrics across all types
          timestamp: new Date().toISOString(),
        };
      },
      { limit },
      {
        ttl: 30, // 30 seconds caching for comprehensive metrics aggregation
        tags: ["metrics", "comprehensive-metrics", "aggregation"],
      },
    );
  }

  /**
   * Calculate circuit breaker metrics and health score
   */
  static getCircuitBreakerMetrics() {
    const circuitBreakerMetrics = circuitBreakerRegistry.getAllMetrics();
    const circuitBreakerSummaries: Record<string, any> = {};

    for (const [name, metrics] of Object.entries(circuitBreakerMetrics)) {
      circuitBreakerSummaries[name] = {
        state: metrics.state,
        successRate:
          metrics.totalCalls > 0
            ? Math.round((metrics.totalSuccesses / metrics.totalCalls) * 100)
            : 100,
        availability:
          metrics.state === "CLOSED" || metrics.state === "HALF_OPEN",
        totalCalls: metrics.totalCalls,
        failureCount: metrics.failureCount,
        lastFailureTime: metrics.lastFailureTime
          ? new Date(metrics.lastFailureTime).toISOString()
          : null,
        lastSuccessTime: metrics.lastSuccessTime
          ? new Date(metrics.lastSuccessTime).toISOString()
          : null,
      };
    }

    // Calculate overall circuit breaker health score
    const healthScore = this.calculateCircuitBreakerHealthScore();

    return {
      states: circuitBreakerMetrics,
      summaries: circuitBreakerSummaries,
      healthScore,
    };
  }

  /**
   * Calculate database performance metrics
   */
  static async getDatabaseMetrics() {
    const [performanceMetrics, recommendations, realTimeIndicators] =
      await Promise.all([
        Promise.resolve(DatabasePerformanceMonitor.getPerformanceMetrics()),
        Promise.resolve(
          DatabasePerformanceMonitor.getPerformanceRecommendations(),
        ),
        DatabasePerformanceMonitor.getRealTimePerformanceIndicators(),
      ]);

    return {
      performance: performanceMetrics,
      recommendations,
      realTime: realTimeIndicators,
    };
  }

  /**
   * Calculate Redis performance metrics and health score
   */
  static async getRedisMetrics() {
    const redisMetrics = await monitoringService.getRedisPerformanceMetrics();

    // Calculate Redis health score based on error rate
    const healthScore =
      redisMetrics.healthStatus.performanceMetrics.errorRate < 0.05
        ? 100
        : Math.max(
            0,
            100 - redisMetrics.healthStatus.performanceMetrics.errorRate * 100,
          );

    return {
      performance: redisMetrics,
      healthScore,
      recommendations: redisMetrics.recommendations,
    };
  }

  /**
   * Calculate circuit breaker health score (0-100)
   */
  static calculateCircuitBreakerHealthScore(): number {
    const openCircuits = circuitBreakerRegistry.getOpenCircuits();
    const totalCircuits = Object.keys(
      circuitBreakerRegistry.getAllMetrics(),
    ).length;
    const healthyCircuits = totalCircuits - openCircuits.length;

    return totalCircuits > 0
      ? Math.round((healthyCircuits / totalCircuits) * 100)
      : 100;
  }

  /**
   * Calculate circuit breaker status for health checks
   */
  static getCircuitBreakerHealthStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    metadata: any;
  } {
    const openCircuits = circuitBreakerRegistry.getOpenCircuits();
    const totalCircuits = Object.keys(
      circuitBreakerRegistry.getAllMetrics(),
    ).length;
    const healthyCount = totalCircuits - openCircuits.length;

    let status: "healthy" | "degraded" | "unhealthy";

    if (openCircuits.length === 0) {
      status = "healthy";
    } else if (healthyCount >= totalCircuits * 0.7) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      metadata: {
        totalCircuits,
        openCircuits,
        circuitBreakerStates: circuitBreakerRegistry.getAllMetrics(),
      },
    };
  }

  /**
   * Get specific metric summary with validation
   */
  static getMetricSummary(metricName: string) {
    const metricSummary = monitoringService.getMetricSummary(metricName);

    if (!metricSummary) {
      throw new Error("Metric not found");
    }

    return {
      metric: metricName,
      summary: metricSummary,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get specific metric data with limit
   */
  static getMetricData(metricName: string, limit: number) {
    const metrics = monitoringService.getMetrics(metricName, limit);

    return {
      metric: metricName,
      data: metrics,
      count: metrics.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate overall system health status for health checks
   */
  static calculateOverallSystemStatus(
    systemHealth: any,
  ): "healthy" | "degraded" | "unhealthy" {
    const statuses = systemHealth.checks.map((check: any) => check.status);

    if (statuses.every((status: string) => status === "healthy")) {
      return "healthy";
    } else if (statuses.some((status: string) => status === "unhealthy")) {
      return "unhealthy";
    } else {
      return "degraded";
    }
  }

  /**
   * Generate application-specific health checks
   */
  static getApplicationHealthChecks() {
    return {
      nextjs: {
        service: "nextjs",
        status: "healthy" as const,
        responseTime: 0,
        metadata: {
          version: process.env.npm_package_version || "1.0.0",
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        },
      },

      auth: {
        service: "auth",
        status: process.env.CLERK_SECRET_KEY
          ? ("healthy" as const)
          : ("degraded" as const),
        responseTime: 0,
        metadata: {
          configured: !!process.env.CLERK_SECRET_KEY,
          provider: "clerk",
        },
      },

      payments: {
        service: "payments",
        status: process.env.STRIPE_SECRET_KEY
          ? ("healthy" as const)
          : ("degraded" as const),
        responseTime: 0,
        metadata: {
          configured: !!process.env.STRIPE_SECRET_KEY,
          provider: "stripe",
        },
      },

      // Circuit breaker health checks (reuses centralized logic)
      circuitBreakers: {
        service: "circuit-breakers",
        ...this.getCircuitBreakerHealthStatus(),
        responseTime: 0,
      },
    };
  }
}
