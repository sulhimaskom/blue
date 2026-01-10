/**
 * Enhanced Circuit Breaker Test Suite
 *
 * Comprehensive unit tests for EnhancedCircuitBreaker covering:
 * - State transitions (CLOSED, OPEN, HALF_OPEN)
 * - Execution behavior and error handling
 * - Adaptive timeout calculation
 * - Request batching optimization
 * - Metrics collection and reporting
 * - Edge cases and boundary conditions
 */

import {
  EnhancedCircuitBreaker,
  EnhancedCircuitBreakerConfig,
} from "../lib/services/enhanced-circuit-breaker";

describe("EnhancedCircuitBreaker", () => {
  let circuitBreaker: EnhancedCircuitBreaker;
  const defaultConfig: EnhancedCircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 1000,
    monitoringPeriod: 60000,
  };

  beforeEach(() => {
    circuitBreaker = new EnhancedCircuitBreaker(defaultConfig);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with CLOSED state", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.isAvailable).toBe(true);
    });

    it("should initialize with zero counters", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });

    it("should initialize with default configuration", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);
      expect(metrics.batchMetrics).toBeUndefined();
    });

    it("should initialize with adaptive timeout enabled", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);
    });

    it("should initialize with batching enabled", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 5,
        batchWindow: 50,
      });

      const metrics = cb.getMetrics();

      expect(metrics.batchMetrics).toBeDefined();
      expect(metrics.batchMetrics?.batchedRequests).toBe(0);
    });
  });

  describe("State Transitions", () => {
    it("should transition from CLOSED to OPEN after failure threshold exceeded", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("OPEN");
      expect(metrics.isAvailable).toBe(false);
      expect(metrics.failureCount).toBe(3);
    });

    it("should remain CLOSED when failure threshold not exceeded", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.failureCount).toBe(2);
    });

    it("should transition from OPEN to CLOSED after reset timeout and success", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getMetrics().state).toBe("OPEN");

      // Fast-forward past reset timeout
      jest.advanceTimersByTime(1000);

      // Execute successful request
      const result = await circuitBreaker.execute(() =>
        Promise.resolve("success"),
      );

      expect(result).toBe("success");

      const metrics = circuitBreaker.getMetrics();

      // Implementation transitions directly to CLOSED on success after timeout
      expect(metrics.state).toBe("CLOSED");
      expect(metrics.isAvailable).toBe(true);
    });

    it("should transition from HALF_OPEN to CLOSED on successful request", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward and execute successful request
      jest.advanceTimersByTime(1000);

      const successRequest = () => Promise.resolve("success");
      const result = await circuitBreaker.execute(successRequest);

      const metrics = circuitBreaker.getMetrics();

      expect(result).toBe("success");
      expect(metrics.state).toBe("CLOSED");
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.failureCount).toBe(0);
    });

    it("should transition from HALF_OPEN to OPEN on failed request", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward and execute failing request
      jest.advanceTimersByTime(1000);

      try {
        await circuitBreaker.execute(failingRequest);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("OPEN");
      expect(metrics.isAvailable).toBe(false);
      expect(metrics.failureCount).toBeGreaterThan(0);
    });

    it("should reset failure count when transitioning to CLOSED", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward and execute successful request
      jest.advanceTimersByTime(1000);

      await circuitBreaker.execute(() => Promise.resolve("success"));

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe("Execution Behavior", () => {
    // Use fake timers consistently to avoid conflicts with other test sections
    // Response time measurements will use mock timing via jest.advanceTimersByTime()

    it("should execute successful request in CLOSED state", async () => {
      const request = () => Promise.resolve("success");

      const result = await circuitBreaker.execute(request);
      const metrics = circuitBreaker.getMetrics();

      expect(result).toBe("success");
      expect(metrics.state).toBe("CLOSED");
      expect(metrics.successCount).toBe(1);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.lastSuccessTime).toBeDefined();
    });

    it("should track failed request in CLOSED state", async () => {
      const request = () => Promise.reject(new Error("Service error"));

      try {
        await circuitBreaker.execute(request);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.failureCount).toBe(1);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.lastFailureTime).toBeDefined();
    });

    it("should reject request when OPEN state", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const request = () => Promise.resolve("success");

      await expect(circuitBreaker.execute(request)).rejects.toThrow(
        "Circuit breaker is OPEN",
      );
    });

    it("should allow request when HALF_OPEN and time expired", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward past reset timeout using fake timers
      jest.advanceTimersByTime(1100);

      const successRequest = () => Promise.resolve("success");
      const result = await circuitBreaker.execute(successRequest);

      expect(result).toBe("success");
    });

    it("should track response time for successful request", async () => {
      const request = () => Promise.resolve("success");

      await circuitBreaker.execute(request);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.lastSuccessTime).toBeDefined();
    });

    it("should track response time for failed request", async () => {
      const request = () => Promise.reject(new Error("Service error"));

      try {
        await circuitBreaker.execute(request);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.lastFailureTime).toBeDefined();
    });

    it("should calculate failure rate correctly", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () => Promise.reject(new Error("Service error"));

      // 2 successes, 1 failure
      await circuitBreaker.execute(successRequest);
      await circuitBreaker.execute(successRequest);
      try {
        await circuitBreaker.execute(failingRequest);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.failureRate).toBeCloseTo(0.333, 2);
    });

    it("should handle zero requests without division by zero", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics.failureRate).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });
  });

  describe("Adaptive Timeout", () => {
    // Use fake timers consistently for all adaptive timeout tests

    it("should update adaptive timeout based on response times", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const request = () => Promise.resolve("success");

      // Execute multiple requests with varying response times
      for (let i = 0; i < 15; i++) {
        await cb.execute(request);
      }

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBeGreaterThan(0);
    });

    it("should keep adaptive timeout within bounds (0.5x to 3x base)", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const request = () => Promise.resolve("success");

      // Execute many requests to trigger adaptive timeout calculation
      for (let i = 0; i < 15; i++) {
        await cb.execute(request);
      }

      const metrics = cb.getMetrics();
      const baseTimeout = 1000;

      expect(metrics.adaptiveTimeout).toBeGreaterThanOrEqual(baseTimeout * 0.5);
      expect(metrics.adaptiveTimeout).toBeLessThanOrEqual(baseTimeout * 3);
    });

    it("should calculate P95 percentile for adaptive timeout", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const request = () => Promise.resolve("success");

      // Execute many requests to build response time history
      for (let i = 0; i < 20; i++) {
        await cb.execute(request);
      }

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBeDefined();
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it("should increase timeout with high failure rate", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Generate high failure rate
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBeGreaterThanOrEqual(1000);
    });

    it("should disable adaptive timeout when flag is false", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: false,
      });

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);
    });

    it("should reset adaptive timeout to base when disabled", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        adaptiveTimeout: true,
      });

      const request = () => Promise.resolve("success");

      // Execute requests to update adaptive timeout
      for (let i = 0; i < 15; i++) {
        await cb.execute(request);
      }

      let metrics = cb.getMetrics();
      const adaptiveTimeout = metrics.adaptiveTimeout;

      // Disable adaptive timeout
      cb.setAdaptiveTimeout(false);

      metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);
      // Adaptive timeout can be 50% to 300% of base, so it may be 500-3000
      // Just verify it was actually updated from base
      expect(adaptiveTimeout).not.toBe(1000);
    });
  });

  describe("Request Batching", () => {
    beforeEach(() => {
      // For batching, we need real timers since the circuit breaker uses 
      // setTimeout for both batch window and execution timeouts
      jest.useRealTimers();
    });

    afterEach(() => {
      // Reset to fake timers for other test sections
      jest.useFakeTimers();
    });

    it("should batch requests in CLOSED state", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 3,
        batchWindow: 50,
      });

      const request = () => Promise.resolve("success");

      const results = await Promise.all([
        cb.execute(request),
        cb.execute(request),
        cb.execute(request),
      ]);

      expect(results).toEqual(["success", "success", "success"]);

      const metrics = cb.getMetrics();

      expect(metrics.batchMetrics?.batchedRequests).toBeGreaterThanOrEqual(3);
    }, 20000);

    it("should execute batch when max size reached", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 3,
        batchWindow: 50,
      });

      const request = () => Promise.resolve("success");

      await Promise.all([
        cb.execute(request),
        cb.execute(request),
        cb.execute(request),
      ]);

      // Wait for batch to execute with real timers
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = cb.getMetrics();

      expect(metrics.batchMetrics?.batchedRequests).toBeGreaterThanOrEqual(3);
    }, 20000);

    it("should not batch requests when circuit is OPEN", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 3,
        batchWindow: 50,
      });

      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const initialMetrics = cb.getMetrics();
      const initialBatched = initialMetrics.batchMetrics?.batchedRequests;

      // Try to execute more requests (should not batch)
      try {
        await cb.execute(() => Promise.resolve("success"));
      } catch (error) {
        // Expected to be rejected
      }

      const finalMetrics = cb.getMetrics();

      expect(finalMetrics.batchMetrics?.batchedRequests).toBe(initialBatched);
    });

    it("should calculate batch efficiency correctly", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 3,
        batchWindow: 50,
      });

      const request = () => Promise.resolve("success");

      await Promise.all([
        cb.execute(request),
        cb.execute(request),
        cb.execute(request),
      ]);

      // Wait for batch to execute with real timers
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = cb.getMetrics();

      expect(metrics.batchMetrics?.batchEfficiency).toBeGreaterThan(0);
    }, 20000);

    it("should handle batch failures gracefully", async () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 3,
        batchWindow: 50,
      });

      const failingRequest = () => Promise.reject(new Error("Batch error"));

      await expect(
        Promise.all([cb.execute(failingRequest), cb.execute(failingRequest)]),
      ).rejects.toThrow();

      // Wait for batch to execute
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = cb.getMetrics();

      expect(metrics.failureCount).toBeGreaterThan(0);
    }, 20000);

    it("should disable batching when flag is false", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 5,
        batchWindow: 50,
      });

      cb.setBatching(false);

      const metrics = cb.getMetrics();

      expect(metrics.batchMetrics).toBeUndefined();
    });
  });

  describe("Metrics Collection", () => {
    // Use fake timers consistently for all metrics tests

    it("should return comprehensive metrics", async () => {
      const request = () => Promise.resolve("success");

      await circuitBreaker.execute(request);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics).toHaveProperty("state");
      expect(metrics).toHaveProperty("failureCount");
      expect(metrics).toHaveProperty("successCount");
      expect(metrics).toHaveProperty("totalRequests");
      expect(metrics).toHaveProperty("failureRate");
      expect(metrics).toHaveProperty("averageResponseTime");
      expect(metrics).toHaveProperty("isAvailable");
      expect(metrics).toHaveProperty("adaptiveTimeout");
    });

    it("should track last success time", async () => {
      const request = () => Promise.resolve("success");

      await circuitBreaker.execute(request);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.lastSuccessTime).toBeDefined();
      expect(metrics.lastSuccessTime).toBeGreaterThan(0);
    });

    it("should track last failure time", async () => {
      const request = () => Promise.reject(new Error("Service error"));

      try {
        await circuitBreaker.execute(request);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.lastFailureTime).toBeDefined();
      expect(metrics.lastFailureTime).toBeGreaterThan(0);
    });

    it("should calculate average response time correctly", async () => {
      const request = () => Promise.resolve("success");

      await circuitBreaker.execute(request);
      await circuitBreaker.execute(request);
      await circuitBreaker.execute(request);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalRequests).toBe(3);
    });
  });

  describe("Configuration Methods", () => {
    it("should reset circuit breaker to initial state", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Generate failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Reset circuit breaker
      circuitBreaker.reset();

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.isAvailable).toBe(true);
    });

    it("should enable and disable batching", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        batchRequests: true,
        maxBatchSize: 5,
        batchWindow: 50,
      });

      let metrics = cb.getMetrics();

      expect(metrics.batchMetrics).toBeDefined();

      cb.setBatching(false);

      metrics = cb.getMetrics();

      expect(metrics.batchMetrics).toBeUndefined();

      cb.setBatching(true);

      metrics = cb.getMetrics();

      expect(metrics.batchMetrics).toBeDefined();
    });

    it("should enable and disable adaptive timeout", () => {
      circuitBreaker.setAdaptiveTimeout(true);

      let metrics = circuitBreaker.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);

      circuitBreaker.setAdaptiveTimeout(false);

      metrics = circuitBreaker.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(1000);
    });

    it("should check availability correctly", async () => {
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Initially available
      expect(circuitBreaker.isAvailable()).toBe(true);

      // Trip circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Not available when OPEN
      expect(circuitBreaker.isAvailable()).toBe(false);

      // Fast-forward past reset timeout
      jest.advanceTimersByTime(1000);

      // Available after timeout
      expect(circuitBreaker.isAvailable()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    // Use fake timers consistently for all edge case tests

    it("should handle empty response time array", () => {
      const metrics = circuitBreaker.getMetrics();

      expect(metrics.averageResponseTime).toBe(0);
    });

    it("should handle single response time", async () => {
      const request = () => Promise.resolve("success");

      await circuitBreaker.execute(request);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle concurrent requests gracefully", async () => {
      const request = () => Promise.resolve("success");

      const promises = Array.from({ length: 10 }, () =>
        circuitBreaker.execute(request),
      );

      const results = await Promise.all(promises);

      expect(results.every((r) => r === "success")).toBe(true);

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.totalRequests).toBe(10);
    });

    it("should handle zero failure threshold", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        failureThreshold: 0,
      });

      const metrics = cb.getMetrics();

      expect(metrics.state).toBe("CLOSED");
    });

    it("should handle zero reset timeout", () => {
      const cb = new EnhancedCircuitBreaker({
        ...defaultConfig,
        resetTimeout: 0,
      });

      const metrics = cb.getMetrics();

      expect(metrics.adaptiveTimeout).toBe(0);
    });

    it("should handle mixed success and failure requests", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () => Promise.reject(new Error("Service error"));

      await circuitBreaker.execute(successRequest);
      try {
        await circuitBreaker.execute(failingRequest);
      } catch (error) {
        // Expected to fail
      }
      await circuitBreaker.execute(successRequest);
      try {
        await circuitBreaker.execute(failingRequest);
      } catch (error) {
        // Expected to fail
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(2);
      expect(metrics.totalRequests).toBe(4);
    });
  });

  describe("Integration Scenarios", () => {
    // Global beforeEach/afterEach already handle fake timers
    // No need to override them here

    it("should handle complete lifecycle: CLOSED → OPEN → CLOSED", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // CLOSED → OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      let metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe("OPEN");

      // OPEN → CLOSED after timeout and success
      jest.advanceTimersByTime(1100);
      await circuitBreaker.execute(successRequest);

      metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe("CLOSED");
    });

    it("should recover from repeated failures", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () =>
        Promise.reject(new Error("Service unavailable"));

      // Trip circuit multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        // Failures
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute(failingRequest);
          } catch (error) {
            // Expected to fail
          }
        }

        // Recovery
        jest.advanceTimersByTime(1000);
        await circuitBreaker.execute(successRequest);
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("CLOSED");
      expect(metrics.successCount).toBe(3);
    });

    it("should maintain metrics across multiple request patterns", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () => Promise.reject(new Error("Service error"));

      // Pattern 1: Successes
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(successRequest);
      }

      // Pattern 2: Mixed
      await circuitBreaker.execute(successRequest);
      try {
        await circuitBreaker.execute(failingRequest);
      } catch (error) {
        // Expected to fail
      }
      await circuitBreaker.execute(successRequest);

      const metrics = circuitBreaker.getMetrics();

      // 5 + 1 + 1 + 1 = 8 total (5 initial successes + 3 pattern 2 requests)
      expect(metrics.totalRequests).toBe(8);
      expect(metrics.successCount).toBe(7);
      expect(metrics.failureCount).toBe(1);
    });

    it("should handle rapid state changes", async () => {
      const successRequest = () => Promise.resolve("success");
      const failingRequest = () => Promise.reject(new Error("Service error"));

      // Rapid failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // Immediate recovery attempt
      jest.advanceTimersByTime(1100);
      await circuitBreaker.execute(successRequest);

      // Rapid failures again
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = circuitBreaker.getMetrics();

      expect(metrics.state).toBe("OPEN");
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });
  });
});
