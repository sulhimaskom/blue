/**
 * Enhanced Circuit Breaker with Performance Optimization
 *
 * Extends existing circuit breaker with intelligent request batching,
 * adaptive timeouts, and performance monitoring
 */

import { logger } from "../logger";
import { DatabaseError } from "@/lib/api-utils";

export interface EnhancedCircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  adaptiveTimeout?: boolean;
  batchRequests?: boolean;
  maxBatchSize?: number;
  batchWindow?: number;
}

export interface CircuitBreakerMetrics {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount: number;
  successCount: number;
  totalRequests: number;
  failureRate: number;
  averageResponseTime: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  isAvailable: boolean;
  adaptiveTimeout: number;
  batchMetrics?: {
    batchedRequests: number;
    batchEfficiency: number;
  };
}

export class EnhancedCircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private failureThreshold: number;
  private resetTimeout: number;
  private monitoringPeriod: number;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttempt = 0;
  private responseTimes: number[] = [];
  private adaptiveTimeoutEnabled: boolean;
  private currentTimeout: number;
  private batchRequestsEnabled: boolean;
  private maxBatchSize: number;
  private batchWindow: number;
  private batchQueue: Array<{
    request: () => Promise<any>;
    // eslint-disable-next-line no-unused-vars
    resolve: (value: any) => void;
    // eslint-disable-next-line no-unused-vars
    reject: (reason: any) => void;
    timestamp: number;
  }> = [];
  private batchTimeout?: NodeJS.Timeout;
  private batchedRequestsCount = 0;
  private successfulBatches = 0;

  constructor(config: EnhancedCircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeout = config.resetTimeout;
    this.monitoringPeriod = config.monitoringPeriod;
    this.adaptiveTimeoutEnabled = config.adaptiveTimeout ?? false;
    this.currentTimeout = this.resetTimeout;
    this.batchRequestsEnabled = config.batchRequests ?? false;
    this.maxBatchSize = config.maxBatchSize || 10;
    this.batchWindow = config.batchWindow || 100; // 100ms batch window

    logger.debug("Enhanced circuit breaker initialized", {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      adaptiveTimeout: this.adaptiveTimeoutEnabled,
      batchRequests: this.batchRequestsEnabled,
    });
  }

  /**
   * Execute a request with enhanced circuit breaker protection
   */
  async execute<T>(request: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Check if circuit is open
    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttempt) {
        this.state = "HALF_OPEN";
        logger.info("Circuit breaker transitioning to HALF_OPEN", {
          nextState: "HALF_OPEN",
          openDuration: Date.now() - (this.lastFailureTime || 0),
        });
      } else {
        throw new DatabaseError(
          `Circuit breaker is OPEN (next attempt: ${new Date(this.nextAttempt).toISOString()})`,
        );
      }
    }

    this.totalRequests++;

    try {
      let result: T;

      if (this.batchRequestsEnabled && this.shouldBatchRequest()) {
        result = await this.executeBatchedRequest(request);
      } else {
        result = await this.executeWithTimeout(request);
      }

      // Track success
      this.successCount++;
      this.lastSuccessTime = Date.now();
      const responseTime = Date.now() - startTime;
      this.trackResponseTime(responseTime);

      // Reset to CLOSED on success in HALF_OPEN state
      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
        this.failureCount = 0;
        logger.info("Circuit breaker reset to CLOSED", {
          successCount: this.successCount,
          responseTime,
        });
      }

      return result;
    } catch (error) {
      // Track failure
      this.failureCount++;
      this.lastFailureTime = Date.now();

      const responseTime = Date.now() - startTime;
      this.trackResponseTime(responseTime);

      logger.warn("Circuit breaker request failed", {
        state: this.state,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Trip circuit if failure threshold exceeded
      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
        this.nextAttempt = Date.now() + this.calculateAdaptiveTimeout();

        logger.error("Circuit breaker tripped to OPEN", {
          failureCount: this.failureCount,
          threshold: this.failureThreshold,
          resetTimeout: this.nextAttempt - Date.now(),
          adaptiveTimeout: this.adaptiveTimeoutEnabled,
        });
      }

      throw error;
    }
  }

  /**
   * Execute request with adaptive timeout
   */
  private async executeWithTimeout<T>(request: () => Promise<T>): Promise<T> {
    const timeout = this.adaptiveTimeoutEnabled
      ? this.currentTimeout
      : this.resetTimeout;

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      request()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Determine if request should be batched
   */
  private shouldBatchRequest(): boolean {
    return (
      this.batchRequestsEnabled &&
      this.state === "CLOSED" &&
      this.failureCount === 0
    );
  }

  /**
   * Execute batched request
   */
  private async executeBatchedRequest<T>(
    request: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.batchQueue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.batchedRequestsCount++;

      // Execute batch if max size reached or start batch window
      if (this.batchQueue.length >= this.maxBatchSize) {
        this.executeBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, this.batchWindow);
      }
    });
  }

  /**
   * Execute the current batch of requests
   */
  private async executeBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    const batch = this.batchQueue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    try {
      // Execute all requests in parallel (or optimize for specific request types)
      const results = await Promise.allSettled(
        batch.map((item) => item.request()),
      );

      // Process results
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });

      this.successfulBatches++;

      logger.debug("Batch executed successfully", {
        batchSize: batch.length,
        successfulBatches: this.successfulBatches,
      });
    } catch (error) {
      // If entire batch fails, reject all requests
      batch.forEach((item) => {
        item.reject(error);
      });

      logger.warn("Batch execution failed", {
        batchSize: batch.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Track response time for adaptive timeout calculation
   */
  private trackResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only recent response times for adaptive calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }

    // Update adaptive timeout based on recent performance
    if (this.adaptiveTimeoutEnabled && this.responseTimes.length > 10) {
      this.updateAdaptiveTimeout();
    }
  }

  /**
   * Update adaptive timeout based on recent response times
   */
  private updateAdaptiveTimeout(): void {
    const avgResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;
    const p95ResponseTime = this.calculatePercentile(this.responseTimes, 0.95);

    // Set timeout to 2x P95 response time with bounds
    const newTimeout = Math.min(
      Math.max(p95ResponseTime * 2, this.resetTimeout * 0.5),
      this.resetTimeout * 3,
    );

    if (
      Math.abs(newTimeout - this.currentTimeout) >
      this.currentTimeout * 0.1
    ) {
      const oldTimeout = this.currentTimeout;
      this.currentTimeout = newTimeout;

      logger.debug("Adaptive timeout updated", {
        oldTimeout,
        newTimeout,
        avgResponseTime,
        p95ResponseTime,
      });
    }
  }

  /**
   * Calculate adaptive timeout with failure consideration
   */
  private calculateAdaptiveTimeout(): number {
    if (!this.adaptiveTimeoutEnabled) {
      return this.resetTimeout;
    }

    const failureRate =
      this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0;

    // Increase timeout exponentially with failure rate
    const failureMultiplier = 1 + failureRate * 2;
    const adaptiveTimeout = Math.min(
      this.currentTimeout * failureMultiplier,
      this.resetTimeout * 5, // Max 5x base timeout
    );

    logger.debug("Adaptive timeout calculated", {
      baseTimeout: this.currentTimeout,
      failureRate,
      multiplier: failureMultiplier,
      result: adaptiveTimeout,
    });

    return adaptiveTimeout;
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Check if circuit breaker is available
   */
  isAvailable(): boolean {
    return this.state !== "OPEN" || Date.now() >= this.nextAttempt;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const failureRate =
      this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0;
    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length
        : 0;

    const batchEfficiency =
      this.batchedRequestsCount > 0
        ? this.successfulBatches / this.batchedRequestsCount
        : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      failureRate,
      averageResponseTime,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      isAvailable: this.isAvailable(),
      adaptiveTimeout: this.currentTimeout,
      batchMetrics: this.batchRequestsEnabled
        ? {
            batchedRequests: this.batchedRequestsCount,
            batchEfficiency,
          }
        : undefined,
    };
  }

  /**
   * Reset circuit breaker state
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttempt = 0;
    this.responseTimes = [];
    this.currentTimeout = this.resetTimeout;
    this.batchQueue = [];
    this.batchedRequestsCount = 0;
    this.successfulBatches = 0;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    logger.info("Enhanced circuit breaker reset");
  }

  /**
   * Enable or disable request batching
   */
  setBatching(enabled: boolean): void {
    this.batchRequestsEnabled = enabled;

    // Execute any pending batch if disabling
    if (!enabled && this.batchQueue.length > 0) {
      this.executeBatch();
    }

    logger.info("Request batching changed", { enabled });
  }

  /**
   * Enable or disable adaptive timeout
   */
  setAdaptiveTimeout(enabled: boolean): void {
    this.adaptiveTimeoutEnabled = enabled;

    if (!enabled) {
      this.currentTimeout = this.resetTimeout;
    }

    logger.info("Adaptive timeout changed", { enabled });
  }
}
