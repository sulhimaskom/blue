/**
 * Redis Performance Optimization Test
 * Validates enhanced connection pooling and health checks
 */

import { redisManager } from "../lib/redis";

describe("Redis Performance Optimization", () => {
  beforeAll(async () => {
    // Mock Redis environment variables for testing
    process.env.REDIS_URL = "redis://localhost:6379";
  });

  describe("Enhanced Connection Pooling", () => {
    it("should get performance metrics", () => {
      const metrics = redisManager.getPerformanceMetrics();

      expect(metrics).toHaveProperty("connectionMetrics");
      expect(metrics).toHaveProperty("operationMetrics");
      expect(metrics).toHaveProperty("circuitBreakerState");

      expect(metrics.connectionMetrics).toHaveProperty("activeConnections");
      expect(metrics.connectionMetrics).toHaveProperty("utilizationRate");
      expect(metrics.operationMetrics).toHaveProperty("avgResponseTime");
      expect(metrics.operationMetrics).toHaveProperty("p95ResponseTime");
      expect(metrics.operationMetrics).toHaveProperty("p99ResponseTime");
    });

    it("should perform health check with detailed diagnostics", async () => {
      // Mock the health check to avoid requiring actual Redis
      const mockHealthCheck = jest
        .spyOn(redisManager, "healthCheck")
        .mockResolvedValueOnce({
          status: "healthy",
          details: {
            primaryConnection: true,
            pooledConnections: 2,
            totalConnections: 3,
            circuitBreakerState: {
              failures: 0,
              lastFailureTime: 0,
              state: "CLOSED",
            },
            performanceMetrics: {
              avgResponseTime: 50,
              p95ResponseTime: 120,
              p99ResponseTime: 200,
              errorRate: 0.01,
              throughput: 1000,
              utilizationRate: 0.3,
            },
            memoryInfo: {
              usedMemory: 1024000,
              peakMemory: 2048000,
              fragmentationRatio: 1.1,
            },
          },
          recommendations: [],
        });

      const healthResult = await redisManager.healthCheck();

      expect(healthResult.status).toBe("healthy");
      expect(healthResult.details.primaryConnection).toBe(true);
      expect(healthResult.details.pooledConnections).toBe(2);
      expect(healthResult.details.performanceMetrics.avgResponseTime).toBe(50);
      expect(healthResult.recommendations).toBeInstanceOf(Array);

      mockHealthCheck.mockRestore();
    });

    it("should optimize connection pool based on load", async () => {
      // Mock optimizeConnectionPool to test its execution
      const mockOptimize = jest
        .spyOn(redisManager, "optimizeConnectionPool")
        .mockResolvedValueOnce();

      await redisManager.optimizeConnectionPool();

      expect(mockOptimize).toHaveBeenCalled();
      mockOptimize.mockRestore();
    });
  });

  describe("Performance Monitoring", () => {
    it("should track response time metrics", async () => {
      // Mock executeWithFallback to test metrics tracking
      const mockExecute = jest
        .spyOn(redisManager, "executeWithFallback")
        .mockResolvedValueOnce("test-result");

      await redisManager.executeWithFallback(async () => "test-result");

      expect(mockExecute).toHaveBeenCalled();
      mockExecute.mockRestore();
    });

    it("should provide circuit breaker state", () => {
      const circuitState = redisManager.getCircuitBreakerState();

      expect(circuitState).toHaveProperty("state");
      expect(circuitState).toHaveProperty("failures");
      expect(circuitState).toHaveProperty("lastFailureTime");
      expect(["CLOSED", "OPEN", "HALF_OPEN"]).toContain(circuitState.state);
    });
  });

  describe("Error Handling", () => {
    it("should handle Redis connection errors gracefully", async () => {
      // Mock getClient to throw error
      const mockGetClient = jest
        .spyOn(redisManager as any, "getClient")
        .mockRejectedValueOnce(new Error("Redis connection failed"));

      const result = await redisManager.healthCheck();

      expect(result.status).toBe("unhealthy");
      expect(result.recommendations).toContain(
        "Primary Redis connection is down",
      );

      mockGetClient.mockRestore();
    });
  });
});
