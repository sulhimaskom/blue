import { logger } from "./logger";

export interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "count" | "percent" | "bytes";
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MonitoringEvent {
  type: "error" | "performance" | "business" | "security";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  service: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();

  private constructor() {
    // Initialize monitoring on startup
    this.setupHealthChecks();
    this.setupPerformanceTracking();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private setupHealthChecks(): void {
    // Database health check
    this.scheduleHealthCheck("database", async () => {
      const startTime = Date.now();
      try {
        const { checkDbHealth } = await import("./db");
        const isHealthy = await checkDbHealth();
        return {
          service: "database",
          status: isHealthy ? ("healthy" as const) : ("unhealthy" as const),
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          service: "database",
          status: "unhealthy" as const,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Redis health check
    this.scheduleHealthCheck("redis", async () => {
      const startTime = Date.now();
      try {
        const { redisManager } = await import("./redis");
        const client = await redisManager.getClient();
        await client.ping();
        return {
          service: "redis",
          status: "healthy" as const,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          service: "redis",
          status: "degraded" as const,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Redis unavailable",
        };
      }
    });

    // External AI services health check
    this.scheduleHealthCheck("ai-services", async () => {
      const startTime = Date.now();
      try {
        // Simple health check - verify configuration
        const iflowConfigured = !!process.env.IFLOW_API_KEY;
        const tavilyConfigured = !!process.env.TAVILY_API_KEY;

        return {
          service: "ai-services",
          status:
            iflowConfigured && tavilyConfigured
              ? ("healthy" as const)
              : ("degraded" as const),
          responseTime: Date.now() - startTime,
          metadata: {
            iflow: iflowConfigured,
            tavily: tavilyConfigured,
          },
        };
      } catch (error) {
        return {
          service: "ai-services",
          status: "degraded" as const,
          responseTime: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "AI services unavailable",
        };
      }
    });
  }

  private scheduleHealthCheck(
    service: string,
    checkFn: () => Promise<HealthCheck>,
    interval: number = 30000, // 30 seconds
  ): void {
    // Run immediately, then schedule
    checkFn().then((result) => {
      this.healthChecks.set(service, result);
    });

    setInterval(async () => {
      try {
        const result = await checkFn();
        this.healthChecks.set(service, result);

        // Log if service is unhealthy
        if (result.status !== "healthy") {
          logger.warn(`Health check failed for ${service}`, {
            service,
            status: result.status,
            responseTime: result.responseTime,
            error: result.error,
          });
        }
      } catch (error) {
        logger.error(`Health check error for ${service}`, {
          service,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, interval);
  }

  private setupPerformanceTracking(): void {
    // Track common metrics
    this.startMetricCollection("api_requests");
    this.startMetricCollection("api_response_time");
    this.startMetricCollection("blueprint_generation_time");
    this.startMetricCollection("github_operations");
    this.startMetricCollection("ai_api_calls");
  }

  private startMetricCollection(name: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
  }

  // Public API methods

  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric["unit"],
    tags?: Record<string, string>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    };

    const existing = this.metrics.get(name) || [];
    existing.push(metric);

    // Keep only last 1000 metrics to prevent memory bloat
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }

    this.metrics.set(name, existing);

    // Log significant metrics
    if (name.includes("time") && value > 5000) {
      logger.warn(`Slow operation detected: ${name}`, {
        metric: name,
        value,
        unit,
        tags,
      });
    }
  }

  trackApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    this.recordMetric("api_requests", 1, "count", {
      method,
      path,
      status: statusCode.toString(),
    });

    this.recordMetric("api_response_time", duration, "ms", {
      method,
      path,
      status: statusCode.toString(),
    });

    // Track errors
    if (statusCode >= 400) {
      this.trackError("api_error", `${method} ${path} returned ${statusCode}`, {
        method,
        path,
        statusCode,
        duration,
        userId,
      });
    }
  }

  trackAIOperation(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric("ai_api_calls", 1, "count", {
      operation,
      success: success.toString(),
    });

    if (operation.includes("blueprint")) {
      this.recordMetric("blueprint_generation_time", duration, "ms", {
        success: success.toString(),
      });
    }

    if (!success) {
      this.trackError(
        "ai_operation_failed",
        `AI operation ${operation} failed`,
        {
          operation,
          duration,
          ...metadata,
        },
      );
    }
  }

  trackGitHubOperation(
    operation: string,
    success: boolean,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric("github_operations", 1, "count", {
      operation,
      success: success.toString(),
    });

    if (!success) {
      this.trackError(
        "github_operation_failed",
        `GitHub operation ${operation} failed`,
        {
          operation,
          duration,
          ...metadata,
        },
      );
    }
  }

  trackError(
    type: string,
    message: string,
    metadata?: Record<string, any>,
    severity: MonitoringEvent["severity"] = "medium",
  ): void {
    const event: MonitoringEvent = {
      type: "error",
      severity,
      message,
      timestamp: new Date().toISOString(),
      service: "architect-platform",
      metadata: {
        errorType: type,
        ...metadata,
      },
    };

    // Log through existing logger
    logger.error(`Monitoring: ${message}`, event.metadata);

    // In production, this would send to Sentry/DataDog/etc.
    if (process.env.NODE_ENV === "production" && severity === "critical") {
      // Future: Send to external monitoring service
      // eslint-disable-next-line no-console
      console.error("CRITICAL ERROR:", event);
    }
  }

  trackBusinessEvent(
    event: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): void {
    logger.userAction(event, userId || "system", metadata);
  }

  trackSecurityEvent(
    event: string,
    severity: MonitoringEvent["severity"] = "medium",
    metadata?: Record<string, any>,
  ): void {
    const monitoringEvent: MonitoringEvent = {
      type: "security",
      severity,
      message: `Security event: ${event}`,
      timestamp: new Date().toISOString(),
      service: "architect-platform",
      metadata,
    };

    logger.security(event, metadata);

    if (severity === "critical") {
      // eslint-disable-next-line no-console
      console.error("CRITICAL SECURITY EVENT:", monitoringEvent);
    }
  }

  // Health check API
  async getHealthChecks(): Promise<HealthCheck[]> {
    return Array.from(this.healthChecks.values());
  }

  async getSystemHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: HealthCheck[];
    uptime: number;
    timestamp: string;
  }> {
    const checks = await this.getHealthChecks();
    const statuses = checks.map((check) => check.status);

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (statuses.every((status) => status === "healthy")) {
      overallStatus = "healthy";
    } else if (statuses.some((status) => status === "unhealthy")) {
      overallStatus = "unhealthy";
    } else {
      overallStatus = "degraded";
    }

    return {
      status: overallStatus,
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  // Metrics API
  getMetrics(name?: string, limit: number = 100): PerformanceMetric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return metrics.slice(-limit);
    }

    const all: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      all.push(...metrics.slice(-Math.ceil(limit / this.metrics.size)));
    }
    return all.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getMetricSummary(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    unit: string;
  } | null {
    const metrics = this.metrics.get(name) || [];
    if (metrics.length === 0) return null;

    const values = metrics.map((m) => m.value);
    const unit = metrics[0]?.unit || "count";

    return {
      count: metrics.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      unit,
    };
  }
}

export const monitoringService = MonitoringService.getInstance();

// Helper function to create performance timers
export function createTimer(label: string): {
  end: () => number;
} {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      monitoringService.recordMetric(label, duration, "ms");
      return duration;
    },
  };
}

// Decorator for automatic timing
export function timed(metricName?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const timer = createTimer(name);
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        monitoringService.trackError(
          "method_execution_failed",
          `Method ${name} failed`,
          {
            method: propertyName,
            className: target.constructor.name,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        );
        throw error;
      } finally {
        timer.end();
      }
    };

    return descriptor;
  };
}
