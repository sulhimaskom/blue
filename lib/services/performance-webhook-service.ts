import { logger } from "@/lib/logger";
import { IdGenerators } from "@/lib/utils/id-generator";
import { webhookQueueService } from "./webhook-queue-service";
import type { PerformanceAlert } from "./real-time-performance-monitor";
import { CircuitBreakerMetrics } from "../circuit-breaker";

export interface PerformanceWebhookPayload extends Record<string, unknown> {
  id: string;
  eventType: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  metric: {
    name: string;
    current: number;
    threshold: number;
    unit: string;
  };
  service?: string;
  description: string;
  context?: Record<string, unknown>;
  healthScore?: number;
  recommendations?: string[];
}

export interface WebhookDeliveryResult {
  success: boolean;
  eventId: string;
  webhookIds: string[];
  errors?: string[];
}

/**
 * Performance Webhook Service - Emits webhook events for performance degradation
 * 
 * Integrates with the existing webhook infrastructure to notify external systems
 * when performance metrics exceed configured thresholds. Supports all performance
 * scenarios outlined in the issue requirements.
 */
export class PerformanceWebhookService {
  private static instance: PerformanceWebhookService;
  private readonly serviceName = "PerformanceMonitor";

  private constructor() {}

  static getInstance(): PerformanceWebhookService {
    if (!PerformanceWebhookService.instance) {
      PerformanceWebhookService.instance = new PerformanceWebhookService();
    }
    return PerformanceWebhookService.instance;
  }

  /**
   * Emit webhook event for API response time degradation
   */
  async emitApiResponseSlowAlert(
    responseTime: number,
    threshold: number,
    endpoint?: string,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.api_response_slow",
      timestamp: new Date().toISOString(),
      severity: responseTime > threshold * 1.5 ? "critical" : "high",
      metric: {
        name: "api_response_time",
        current: responseTime,
        threshold,
        unit: "ms",
      },
      service: endpoint,
      description: `API response time ${responseTime.toFixed(0)}ms exceeds threshold ${threshold}ms`,
      context: { endpoint },
      recommendations: [
        "Consider enabling aggressive prefetching",
        "Review endpoint performance optimization",
        "Check for external service dependencies",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for cache hit rate degradation
   */
  async emitCacheHitRateLowAlert(
    hitRate: number,
    threshold: number,
    cacheKey?: string,
  ): Promise<WebhookDeliveryResult> {
    const severity = hitRate < threshold * 0.7 ? "medium" : "low";
    
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.cache_hit_rate_low",
      timestamp: new Date().toISOString(),
      severity,
      metric: {
        name: "cache_hit_rate",
        current: hitRate,
        threshold,
        unit: "ratio",
      },
      service: "CacheService",
      description: `Cache hit rate ${(hitRate * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`,
      context: { cacheKey },
      recommendations: [
        "Enable intelligent prefetching",
        "Review cache TTL settings",
        "Warm up frequently accessed cache entries",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for circuit breaker trips
   */
  async emitCircuitBreakerTrippedAlert(
    serviceName: string,
    metrics: CircuitBreakerMetrics,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.circuit_breaker_tripped",
      timestamp: new Date().toISOString(),
      severity: "high",
      metric: {
        name: "circuit_breaker_state",
        current: 0, // 0 = OPEN (tripped)
        threshold: 1, // 1 = CLOSED (normal)
        unit: "state",
      },
      service: serviceName,
      description: `Circuit breaker "${serviceName}" tripped due to ${metrics.failureCount} failures`,
      context: {
        serviceName,
        state: metrics.state,
        failureCount: metrics.failureCount,
        totalCalls: metrics.totalCalls,
        lastFailureTime: metrics.lastFailureTime,
        nextAttempt: new Date(Date.now() + 60000).toISOString(), // Default 1 minute
      },
      recommendations: [
        "Investigate service connectivity issues",
        "Check external service health status",
        "Review circuit breaker configuration",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for slow database queries
   */
  async emitDatabaseQuerySlowAlert(
    queryTime: number,
    threshold: number,
    query?: string,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.database_query_slow",
      timestamp: new Date().toISOString(),
      severity: queryTime > threshold * 2 ? "critical" : "high",
      metric: {
        name: "database_query_time",
        current: queryTime,
        threshold,
        unit: "ms",
      },
      service: "DatabaseService",
      description: `Database query ${queryTime.toFixed(0)}ms exceeds threshold ${threshold}ms`,
      context: { 
        query: query?.substring(0, 200) // Limit query length in payload
      },
      recommendations: [
        "Review query execution plan",
        "Check database index optimization",
        "Consider query result caching",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for high memory usage
   */
  async emitMemoryHighAlert(
    memoryUsage: number,
    threshold: number,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.memory_high",
      timestamp: new Date().toISOString(),
      severity: memoryUsage > threshold * 1.1 ? "critical" : "high",
      metric: {
        name: "memory_usage",
        current: memoryUsage,
        threshold,
        unit: "ratio",
      },
      service: "SystemMonitor",
      description: `Memory usage ${(memoryUsage * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%`,
      recommendations: [
        "Enable aggressive cache compression",
        "Review memory allocation patterns",
        "Consider implementing memory cleanup routines",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for high error rate
   */
  async emitErrorRateHighAlert(
    errorRate: number,
    threshold: number,
    errorType?: string,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.error_rate_high",
      timestamp: new Date().toISOString(),
      severity: errorRate > threshold * 2 ? "critical" : "high",
      metric: {
        name: "error_rate",
        current: errorRate,
        threshold,
        unit: "ratio",
      },
      service: errorType || "ApplicationMonitor",
      description: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(threshold * 100).toFixed(2)}%`,
      context: { errorType },
      recommendations: [
        "Investigate error sources and patterns",
        "Review application logs for error context",
        "Consider adjusting circuit breaker sensitivity",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for high CPU usage
   */
  async emitCpuHighAlert(
    cpuUsage: number,
    threshold: number,
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.cpu_high",
      timestamp: new Date().toISOString(),
      severity: "medium",
      metric: {
        name: "cpu_usage",
        current: cpuUsage,
        threshold,
        unit: "ratio",
      },
      service: "SystemMonitor",
      description: `CPU usage ${(cpuUsage * 100).toFixed(1)}% exceeds threshold ${(threshold * 100).toFixed(1)}%`,
      recommendations: [
        "Review computationally intensive operations",
        "Consider implementing asynchronous processing",
        "Monitor for potential infinite loops",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Emit webhook event for low overall health score
   */
  async emitHealthScoreLowAlert(
    healthScore: number,
    threshold: number,
    alerts: PerformanceAlert[],
  ): Promise<WebhookDeliveryResult> {
    const payload: PerformanceWebhookPayload = {
      id: IdGenerators.GENERIC("webhook"),
      eventType: "performance.health_score_low",
      timestamp: new Date().toISOString(),
      severity: healthScore < threshold * 0.5 ? "critical" : "high",
      metric: {
        name: "health_score",
        current: healthScore,
        threshold,
        unit: "score",
      },
      service: "HealthMonitor",
      description: `System health score ${healthScore} below threshold ${threshold}`,
      context: { 
        alertCount: alerts.length,
        alertTypes: alerts.map(a => a.type),
      },
      recommendations: [
        "Review all active performance alerts",
        "Prioritize critical system health issues",
        "Consider incident response protocols",
      ],
    };

    return this.emitWebhook(payload);
  }

  /**
   * Process performance alerts and emit appropriate webhook events
   */
  async processPerformanceAlerts(alerts: PerformanceAlert[]): Promise<WebhookDeliveryResult[]> {
    const results: WebhookDeliveryResult[] = [];

    for (const alert of alerts) {
      try {
        let result: WebhookDeliveryResult;

        switch (alert.type) {
          case "response_time":
            result = await this.emitApiResponseSlowAlert(
              alert.value,
              alert.threshold,
            );
            break;

          case "cache_hit_rate":
            result = await this.emitCacheHitRateLowAlert(
              alert.value,
              alert.threshold,
            );
            break;

          case "error_rate":
            result = await this.emitErrorRateHighAlert(
              alert.value,
              alert.threshold,
            );
            break;

          case "resource_usage":
            // Determine if this is CPU or memory based on context
            if (alert.message.toLowerCase().includes("cpu")) {
              result = await this.emitCpuHighAlert(alert.value, alert.threshold);
            } else if (alert.message.toLowerCase().includes("memory")) {
              result = await this.emitMemoryHighAlert(alert.value, alert.threshold);
            } else {
              continue; // Skip unknown resource usage alert
            }
            break;

          default:
            logger.warn("Unknown performance alert type", { alertType: alert.type });
            continue;
        }

        results.push(result);
      } catch (error) {
        logger.error("Failed to process performance alert", {
          alert,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Emit webhook event using the existing webhook queue infrastructure
   */
  private async emitWebhook(
    payload: PerformanceWebhookPayload,
  ): Promise<WebhookDeliveryResult> {
    try {
      // Enqueue webhook event for reliable delivery
      const result = await webhookQueueService.enqueueWebhook(
        "PerformanceMonitor" as "Clerk" | "Stripe" | "GitHub" | "PerformanceMonitor",
        payload.eventType,
        payload,
        {}, // Empty headers for system-generated webhooks
      );

      logger.systemEvent("Performance webhook emitted", {
        eventId: result.eventId,
        eventType: payload.eventType,
        severity: payload.severity,
        metric: payload.metric,
        service: payload.service,
        enqueued: result.enqueued,
      });

      return {
        success: true,
        eventId: result.eventId,
        webhookIds: [], // Will be populated by webhook router based on subscriptions
      };
    } catch (error) {
      logger.error("Failed to emit performance webhook", {
        payload: {
          id: payload.id,
          eventType: payload.eventType,
          metric: payload.metric,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        eventId: payload.id,
        webhookIds: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }
}

// Export singleton instance
export const performanceWebhookService = PerformanceWebhookService.getInstance();