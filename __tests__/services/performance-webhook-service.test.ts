import { performanceWebhookService } from "@/lib/services/performance-webhook-service";
import { webhookQueueService } from "@/lib/services/webhook-queue-service";
import type { PerformanceAlert } from "@/lib/services/real-time-performance-monitor";
import { CircuitBreakerMetrics } from "@/lib/circuit-breaker";

// Mock dependencies
jest.mock("@/lib/services/webhook-queue-service");
jest.mock("@/lib/logger");

const mockWebhookQueueService = webhookQueueService as jest.Mocked<typeof webhookQueueService>;

describe("PerformanceWebhookService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the webhook queue service
    mockWebhookQueueService.enqueueWebhook.mockResolvedValue({
      enqueued: true,
      eventId: "test-event-id",
    });
  });

  describe("emitApiResponseSlowAlert", () => {
    it("should emit high severity alert when response time exceeds threshold", async () => {
      const result = await performanceWebhookService.emitApiResponseSlowAlert(
        600, // 600ms
        500, // 500ms threshold
        "/api/test",
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("test-event-id");
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.api_response_slow",
        expect.objectContaining({
          eventType: "performance.api_response_slow",
          severity: "high",
          metric: {
            name: "api_response_time",
            current: 600,
            threshold: 500,
            unit: "ms",
          },
          service: "/api/test",
          description: "API response time 600ms exceeds threshold 500ms",
        }),
        {},
      );
    });

    it("should emit critical severity alert when response time exceeds 1.5x threshold", async () => {
      await performanceWebhookService.emitApiResponseSlowAlert(
        800, // 800ms (1.6x threshold)
        500, // 500ms threshold
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          severity: "critical",
        }),
        expect.anything(),
      );
    });
  });

  describe("emitCacheHitRateLowAlert", () => {
    it("should emit low severity alert when cache hit rate is below threshold", async () => {
      const result = await performanceWebhookService.emitCacheHitRateLowAlert(
        0.5, // 50%
        0.6, // 60% threshold
        "test-key",
      );

      expect(result.success).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.cache_hit_rate_low",
        expect.objectContaining({
          eventType: "performance.cache_hit_rate_low",
          severity: "low",
          metric: {
            name: "cache_hit_rate",
            current: 0.5,
            threshold: 0.6,
            unit: "ratio",
          },
          description: "Cache hit rate 50.0% below threshold 60.0%",
        }),
        expect.anything(),
      );
    });

    it("should emit medium severity alert when cache hit rate is very low", async () => {
      await performanceWebhookService.emitCacheHitRateLowAlert(
        0.3, // 30% (0.5x threshold)
        0.6, // 60% threshold
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          severity: "medium",
        }),
        expect.anything(),
      );
    });
  });

  describe("emitCircuitBreakerTrippedAlert", () => {
    it("should emit high severity alert when circuit breaker trips", async () => {
      const circuitMetrics: CircuitBreakerMetrics = {
        state: "OPEN" as any,
        failureCount: 5,
        successCount: 0,
        totalCalls: 10,
        totalFailures: 5,
        totalSuccesses: 5,
        lastFailureTime: Date.now() - 1000,
      };

      const result = await performanceWebhookService.emitCircuitBreakerTrippedAlert(
        "TestService",
        circuitMetrics,
      );

      expect(result.success).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.circuit_breaker_tripped",
        expect.objectContaining({
          eventType: "performance.circuit_breaker_tripped",
          severity: "high",
          service: "TestService",
          description: "Circuit breaker \"TestService\" tripped due to 5 failures",
          context: expect.objectContaining({
            serviceName: "TestService",
            state: "OPEN",
            failureCount: 5,
            totalCalls: 10,
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe("emitDatabaseQuerySlowAlert", () => {
    it("should emit high severity alert for slow database query", async () => {
      const result = await performanceWebhookService.emitDatabaseQuerySlowAlert(
        2000, // 2000ms
        1000, // 1000ms threshold
        "SELECT * FROM users WHERE id = ?",
      );

      expect(result.success).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.database_query_slow",
        expect.objectContaining({
          eventType: "performance.database_query_slow",
          severity: "high",
          metric: {
            name: "database_query_time",
            current: 2000,
            threshold: 1000,
            unit: "ms",
          },
          description: "Database query 2000ms exceeds threshold 1000ms",
          context: {
            query: "SELECT * FROM users WHERE id = ?",
          },
        }),
        expect.anything(),
      );
    });

    it("should truncate long queries in context", async () => {
      const longQuery = "SELECT * FROM users WHERE " + "a".repeat(300);
      
      await performanceWebhookService.emitDatabaseQuerySlowAlert(
        2000,
        1000,
        longQuery,
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          context: {
            query: expect.stringMatching(/^SELECT \* FROM users WHERE a+/),
          },
        }),
        expect.anything(),
      );
    });
  });

  describe("emitMemoryHighAlert", () => {
    it("should emit critical severity alert for high memory usage", async () => {
      const result = await performanceWebhookService.emitMemoryHighAlert(
        0.9, // 90%
        0.8, // 80% threshold
      );

      expect(result.success).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.memory_high",
        expect.objectContaining({
          eventType: "performance.memory_high",
          severity: "critical", // 90% is > 1.1 * 80% threshold, so it's critical
          metric: {
            name: "memory_usage",
            current: 0.9,
            threshold: 0.8,
            unit: "ratio",
          },
          description: "Memory usage 90.0% exceeds threshold 80.0%",
        }),
        expect.anything(),
      );
    });

    it("should emit high severity alert for moderately high memory usage", async () => {
      await performanceWebhookService.emitMemoryHighAlert(
        0.85, // 85% (just above threshold)
        0.8, // 80% threshold
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          severity: "high",
        }),
        expect.anything(),
      );
    });
  });

  describe("processPerformanceAlerts", () => {
    it("should process multiple performance alerts and emit corresponding webhooks", async () => {
      const alerts: PerformanceAlert[] = [
        {
          type: "response_time",
          severity: "high",
          message: "API response time slow",
          value: 600,
          threshold: 500,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
        {
          type: "cache_hit_rate",
          severity: "low",
          message: "Cache hit rate low",
          value: 0.5,
          threshold: 0.6,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
        {
          type: "error_rate",
          severity: "high",
          message: "Error rate high",
          value: 0.1,
          threshold: 0.05,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
      ];

      const results = await performanceWebhookService.processPerformanceAlerts(alerts);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledTimes(3);

      // Check that correct webhook types were called
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.api_response_slow",
        expect.anything(),
        expect.anything(),
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.cache_hit_rate_low",
        expect.anything(),
        expect.anything(),
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.error_rate_high",
        expect.anything(),
        expect.anything(),
      );
    });

    it("should handle resource usage alerts for CPU and memory", async () => {
      const alerts: PerformanceAlert[] = [
        {
          type: "resource_usage",
          severity: "medium",
          message: "CPU usage 85% exceeds threshold 80%",
          value: 0.85,
          threshold: 0.8,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
        {
          type: "resource_usage",
          severity: "high",
          message: "Memory usage 90% exceeds threshold 80%",
          value: 0.9,
          threshold: 0.8,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
      ];

      const results = await performanceWebhookService.processPerformanceAlerts(alerts);

      expect(results).toHaveLength(2);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.cpu_high",
        expect.anything(),
        expect.anything(),
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.memory_high",
        expect.anything(),
        expect.anything(),
      );
    });

    it("should skip unknown alert types and continue processing", async () => {
      const alerts: PerformanceAlert[] = [
        {
          type: "response_time" as any,
          severity: "high",
          message: "API response time slow",
          value: 600,
          threshold: 500,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
        {
          type: "unknown_type" as any,
          severity: "medium",
          message: "Unknown alert type",
          value: 100,
          threshold: 50,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
      ];

      const results = await performanceWebhookService.processPerformanceAlerts(alerts);

      expect(results).toHaveLength(1); // Only the known type is processed
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledTimes(1);
    });

    it("should handle webhook emission failures gracefully", async () => {
      mockWebhookQueueService.enqueueWebhook.mockRejectedValueOnce(
        new Error("Webhook service unavailable")
      );

      const alerts: PerformanceAlert[] = [
        {
          type: "response_time",
          severity: "high",
          message: "API response time slow",
          value: 600,
          threshold: 500,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
      ];

      const results = await performanceWebhookService.processPerformanceAlerts(alerts);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors).toContain("Webhook service unavailable");
    });
  });

  describe("emitHealthScoreLowAlert", () => {
    it("should emit high severity alert for low health score", async () => {
      const alerts: PerformanceAlert[] = [
        {
          type: "response_time",
          severity: "high",
          message: "API response time slow",
          value: 600,
          threshold: 500,
          timestamp: new Date().toISOString(),
          adjustments: [],
        },
      ];

      const result = await performanceWebhookService.emitHealthScoreLowAlert(
        65, // health score
        70, // threshold
        alerts,
      );

      expect(result.success).toBe(true);
      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        "PerformanceMonitor" as any,
        "performance.health_score_low",
        expect.objectContaining({
          eventType: "performance.health_score_low",
          severity: "high",
          metric: {
            name: "health_score",
            current: 65,
            threshold: 70,
            unit: "score",
          },
          description: "System health score 65 below threshold 70",
          context: {
            alertCount: 1,
            alertTypes: ["response_time"],
          },
        }),
        expect.anything(),
      );
    });

    it("should emit critical severity alert for very low health score", async () => {
      await performanceWebhookService.emitHealthScoreLowAlert(
        30, // health score (0.43x threshold)
        70, // threshold
        [],
      );

      expect(mockWebhookQueueService.enqueueWebhook).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          severity: "critical",
        }),
        expect.anything(),
      );
    });
  });

  describe("error handling", () => {
    it("should handle webhook queue service failures", async () => {
      mockWebhookQueueService.enqueueWebhook.mockRejectedValue(
        new Error("Redis connection failed")
      );

      const result = await performanceWebhookService.emitApiResponseSlowAlert(
        600,
        500,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Redis connection failed");
    });
  });
});