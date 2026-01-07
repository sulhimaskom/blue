/**
 * Request Deduplication Service
 *
 * Optimizes data fetching by deduplicating identical in-flight requests
 * Prevents redundant API calls and improves overall system efficiency
 */

import { logger } from "../logger";

interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
  // eslint-disable-next-line no-unused-vars
  resolve: (value: T) => void;
  // eslint-disable-next-line no-unused-vars
  reject: (reason: any) => void;
}

interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  activeRequests: number;
  averageResponseTime: number;
  deduplicationRate: number;
}

export class RequestDeduplicationService {
  private static instance: RequestDeduplicationService;
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private metrics: DeduplicationMetrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    activeRequests: 0,
    averageResponseTime: 0,
    deduplicationRate: 0,
  };

  private constructor() {}

  static getInstance(): RequestDeduplicationService {
    if (!RequestDeduplicationService.instance) {
      RequestDeduplicationService.instance = new RequestDeduplicationService();
    }
    return RequestDeduplicationService.instance;
  }

  /**
   * Execute a request with deduplication
   * Identical requests will be deduplicated while in-flight
   */
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    timeoutMs: number = this.DEFAULT_TIMEOUT,
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.activeRequests++;

    try {
      // Check if identical request is already in flight
      const existingRequest = this.pendingRequests.get(key);
      if (existingRequest) {
        this.metrics.deduplicatedRequests++;

        logger.debug("Request deduplicated", {
          key,
          waitTime: Date.now() - existingRequest.timestamp,
          activeRequests: this.pendingRequests.size,
        });

        // Reset timeout for the waiting request
        clearTimeout(existingRequest.timeoutId);
        existingRequest.timeoutId = setTimeout(() => {
          this.timeoutRequest(key);
        }, timeoutMs);

        return existingRequest.promise;
      }

      // Create new request promise
      // eslint-disable-next-line no-unused-vars
      let resolve: (value: T) => void;
      // eslint-disable-next-line no-unused-vars
      let reject: (reason: any) => void;

      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.timeoutRequest(key);
      }, timeoutMs);

      // Store pending request
      const pendingRequest: PendingRequest<T> = {
        promise,
        timestamp: Date.now(),
        timeoutId,
        resolve: resolve!,
        reject: reject!,
      };

      this.pendingRequests.set(key, pendingRequest);

      logger.debug("New request initiated", {
        key,
        activeRequests: this.pendingRequests.size,
        timeout: timeoutMs,
      });

      // Execute the actual request
      try {
        const result = await requestFn();
        const duration = Date.now() - startTime;

        // Update metrics
        this.updateAverageResponseTime(duration);
        this.metrics.activeRequests--;

        // Resolve all waiting requests
        const pending = this.pendingRequests.get(key);
        if (pending) {
          pending.resolve(result);
          this.pendingRequests.delete(key);
          clearTimeout(pending.timeoutId);
        }

        logger.debug("Request completed successfully", {
          key,
          duration,
          activeRequests: this.pendingRequests.size,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.metrics.activeRequests--;

        // Reject all waiting requests
        const pending = this.pendingRequests.get(key);
        if (pending) {
          pending.reject(error);
          this.pendingRequests.delete(key);
          clearTimeout(pending.timeoutId);
        }

        logger.debug("Request failed", {
          key,
          duration,
          error: error instanceof Error ? error.message : "Unknown error",
          activeRequests: this.pendingRequests.size,
        });

        throw error;
      }
    } catch (error) {
      this.metrics.activeRequests--;
      throw error;
    }
  }

  /**
   * Handle request timeout
   */
  private timeoutRequest(key: string): void {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      const error = new Error(
        `Request timeout: ${key} after ${this.DEFAULT_TIMEOUT}ms`,
      );
      pending.reject(error);
      this.pendingRequests.delete(key);
      this.metrics.activeRequests--;

      logger.warn("Request timed out", {
        key,
        waitTime: Date.now() - pending.timestamp,
      });
    }
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(duration: number): void {
    const totalRequests =
      this.metrics.totalRequests - this.metrics.deduplicatedRequests;
    if (totalRequests === 1) {
      this.metrics.averageResponseTime = duration;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (totalRequests - 1) + duration) /
        totalRequests;
    }
  }

  /**
   * Generate cache key for request deduplication
   */
  static generateKey(
    endpoint: string,
    params?: Record<string, any>,
    method: string = "GET",
  ): string {
    const normalizedParams = params
      ? JSON.stringify(params, Object.keys(params).sort())
      : "";
    return `${method}:${endpoint}:${normalizedParams}`;
  }

  /**
   * Get current metrics
   */
  getMetrics(): DeduplicationMetrics {
    this.metrics.deduplicationRate =
      this.metrics.totalRequests > 0
        ? this.metrics.deduplicatedRequests / this.metrics.totalRequests
        : 0;

    return { ...this.metrics };
  }

  /**
   * Clear expired requests
   */
  clearExpiredRequests(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.DEFAULT_TIMEOUT) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.timeoutRequest(key);
    }

    if (expiredKeys.length > 0) {
      logger.info("Cleared expired requests", {
        expiredCount: expiredKeys.length,
        remainingRequests: this.pendingRequests.size,
      });
    }
  }

  /**
   * Force clear all pending requests (emergency use)
   */
  clearAllRequests(): void {
    const count = this.pendingRequests.size;

    for (const [, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeoutId);
      request.reject(new Error("Request cancelled: service shutdown"));
    }

    this.pendingRequests.clear();
    this.metrics.activeRequests = 0;

    logger.warn("All pending requests cleared", {
      clearedCount: count,
    });
  }

  /**
   * Get pending request count
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Check if specific request is pending
   */
  isRequestPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }
}

// Export singleton instance
export const requestDeduplicationService =
  RequestDeduplicationService.getInstance();

// Start cleanup interval
setInterval(() => {
  requestDeduplicationService.clearExpiredRequests();
}, 60000); // Clean up every minute
