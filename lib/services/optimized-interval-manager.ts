/**
 * Optimized Interval Manager
 *
 * Consolidates and optimizes all interval-based operations across services
 * Prevents interval drift, reduces memory usage, and provides centralized control
 */

import { logger } from "../logger";

interface IntervalConfig {
  id: string;
  fn: () => void | Promise<void>;
  interval: number;
  enabled: boolean;
  lastRun: number;
  nextRun: number;
  maxRunTime?: number; // Maximum execution time in milliseconds
  retryCount?: number;
  maxRetries?: number;
}

interface IntervalMetrics {
  totalIntervals: number;
  activeIntervals: number;
  averageRunTime: number;
  failedRuns: number;
  successfulRuns: number;
  memoryUsage: number;
}

export class OptimizedIntervalManager {
  private static instance: OptimizedIntervalManager;
  private intervals = new Map<string, IntervalConfig>();
  private isRunning = false;
  private tickInterval?: NodeJS.Timeout;
  private readonly TICK_RESOLUTION = 1000; // Check every second
  private metrics: IntervalMetrics = {
    totalIntervals: 0,
    activeIntervals: 0,
    averageRunTime: 0,
    failedRuns: 0,
    successfulRuns: 0,
    memoryUsage: 0,
  };

  private constructor() {}

  static getInstance(): OptimizedIntervalManager {
    if (!OptimizedIntervalManager.instance) {
      OptimizedIntervalManager.instance = new OptimizedIntervalManager();
    }
    return OptimizedIntervalManager.instance;
  }

  /**
   * Start the interval manager
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Interval manager already running");
      return;
    }

    this.isRunning = true;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.TICK_RESOLUTION);

    logger.info("Optimized interval manager started", {
      intervalsCount: this.intervals.size,
      tickResolution: this.TICK_RESOLUTION,
    });
  }

  /**
   * Stop the interval manager
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    this.isRunning = false;
    logger.info("Optimized interval manager stopped");
  }

  /**
   * Register a new interval
   */
  registerInterval(
    id: string,
    fn: () => void | Promise<void>,
    interval: number,
    options: {
      enabled?: boolean;
      maxRunTime?: number;
      maxRetries?: number;
    } = {},
  ): void {
    const now = Date.now();

    this.intervals.set(id, {
      id,
      fn,
      interval,
      enabled: options.enabled ?? true,
      lastRun: 0,
      nextRun: now + interval,
      maxRunTime: options.maxRunTime || 30000, // 30 seconds default
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
    });

    this.metrics.totalIntervals++;
    if (options.enabled ?? true) {
      this.metrics.activeIntervals++;
    }

    logger.debug("Interval registered", {
      id,
      interval,
      enabled: options.enabled ?? true,
      maxRunTime: options.maxRunTime,
    });
  }

  /**
   * Unregister an interval
   */
  unregisterInterval(id: string): boolean {
    const interval = this.intervals.get(id);
    if (!interval) {
      return false;
    }

    this.intervals.delete(id);
    this.metrics.totalIntervals--;
    if (interval.enabled) {
      this.metrics.activeIntervals--;
    }

    logger.debug("Interval unregistered", { id });
    return true;
  }

  /**
   * Enable or disable an interval
   */
  setIntervalEnabled(id: string, enabled: boolean): boolean {
    const interval = this.intervals.get(id);
    if (!interval) {
      return false;
    }

    const wasEnabled = interval.enabled;
    interval.enabled = enabled;

    if (wasEnabled && !enabled) {
      this.metrics.activeIntervals--;
    } else if (!wasEnabled && enabled) {
      this.metrics.activeIntervals++;
      interval.nextRun = Date.now() + interval.interval;
    }

    logger.debug("Interval enabled status changed", {
      id,
      enabled,
      wasEnabled,
    });

    return true;
  }

  /**
   * Main tick loop - executes due intervals
   */
  private async tick(): Promise<void> {
    const now = Date.now();
    const dueIntervals: IntervalConfig[] = [];

    // Find intervals that are due to run
    for (const interval of this.intervals.values()) {
      if (interval.enabled && now >= interval.nextRun) {
        dueIntervals.push(interval);
      }
    }

    if (dueIntervals.length === 0) {
      return;
    }

    // Execute due intervals in parallel with controlled concurrency
    const maxConcurrency = 5;
    const chunks = this.chunkArray(dueIntervals, maxConcurrency);

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map((interval) => this.executeInterval(interval)),
      );
    }

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Execute a single interval with timeout and retry logic
   */
  private async executeInterval(interval: IntervalConfig): Promise<void> {
    const startTime = Date.now();

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Interval execution timeout: ${interval.id}`));
        }, interval.maxRunTime);
      });

      // Execute the interval function
      await Promise.race([Promise.resolve(interval.fn()), timeoutPromise]);

      // Update interval state on success
      interval.lastRun = Date.now();
      interval.nextRun = interval.lastRun + interval.interval;
      interval.retryCount = 0;

      this.metrics.successfulRuns++;

      const runTime = Date.now() - startTime;
      this.updateAverageRunTime(runTime);

      logger.debug("Interval executed successfully", {
        id: interval.id,
        runTime,
        nextRun: interval.nextRun,
      });
    } catch (error) {
      // Handle execution failure
      interval.retryCount = (interval.retryCount || 0) + 1;
      this.metrics.failedRuns++;

      logger.warn("Interval execution failed", {
        id: interval.id,
        retryCount: interval.retryCount,
        maxRetries: interval.maxRetries,
        error: error instanceof Error ? error.message : "Unknown error",
        runTime: Date.now() - startTime,
      });

      // Decide whether to retry or disable
      if (interval.retryCount < (interval.maxRetries || 3)) {
        // Schedule retry with exponential backoff
        const backoffDelay = Math.min(
          interval.interval * Math.pow(2, interval.retryCount - 1),
          interval.interval * 4, // Max 4x backoff
        );

        interval.nextRun = Date.now() + backoffDelay;

        logger.info("Interval scheduled for retry", {
          id: interval.id,
          retryCount: interval.retryCount,
          backoffDelay,
        });
      } else {
        // Disable interval after max retries
        interval.enabled = false;
        this.metrics.activeIntervals--;

        logger.error("Interval disabled after max retries", {
          id: interval.id,
          maxRetries: interval.maxRetries,
        });
      }
    }
  }

  /**
   * Update average run time metric
   */
  private updateAverageRunTime(runTime: number): void {
    const totalRuns = this.metrics.successfulRuns;
    if (totalRuns === 1) {
      this.metrics.averageRunTime = runTime;
    } else {
      this.metrics.averageRunTime =
        (this.metrics.averageRunTime * (totalRuns - 1) + runTime) / totalRuns;
    }
  }

  /**
   * Update all metrics
   */
  private updateMetrics(): void {
    // Update active interval count
    this.metrics.activeIntervals = Array.from(this.intervals.values()).filter(
      (interval) => interval.enabled,
    ).length;

    // Estimate memory usage
    const objectSize = JSON.stringify(
      Array.from(this.intervals.values()),
    ).length;
    this.metrics.memoryUsage = objectSize;
  }

  /**
   * Split array into chunks for controlled concurrency
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get current metrics
   */
  getMetrics(): IntervalMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all interval configurations
   */
  getIntervals(): IntervalConfig[] {
    return Array.from(this.intervals.values());
  }

  /**
   * Get specific interval configuration
   */
  getInterval(id: string): IntervalConfig | undefined {
    return this.intervals.get(id);
  }

  /**
   * Health check for interval manager
   */
  healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    details: {
      isRunning: boolean;
      intervalsCount: number;
      activeIntervals: number;
      failedRuns: number;
      averageRunTime: number;
    };
  } {
    const failureRate =
      this.metrics.totalIntervals > 0
        ? this.metrics.failedRuns /
          (this.metrics.successfulRuns + this.metrics.failedRuns)
        : 0;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (failureRate > 0.5 || this.metrics.averageRunTime > 10000) {
      status = "unhealthy";
    } else if (failureRate > 0.2 || this.metrics.averageRunTime > 5000) {
      status = "degraded";
    }

    return {
      status,
      details: {
        isRunning: this.isRunning,
        intervalsCount: this.metrics.totalIntervals,
        activeIntervals: this.metrics.activeIntervals,
        failedRuns: this.metrics.failedRuns,
        averageRunTime: this.metrics.averageRunTime,
      },
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalIntervals: this.intervals.size,
      activeIntervals: Array.from(this.intervals.values()).filter(
        (interval) => interval.enabled,
      ).length,
      averageRunTime: 0,
      failedRuns: 0,
      successfulRuns: 0,
      memoryUsage: 0,
    };

    logger.info("Interval metrics reset");
  }

  /**
   * Clear all intervals (emergency use)
   */
  clearAllIntervals(): void {
    const count = this.intervals.size;
    this.intervals.clear();

    this.metrics = {
      totalIntervals: 0,
      activeIntervals: 0,
      averageRunTime: 0,
      failedRuns: 0,
      successfulRuns: 0,
      memoryUsage: 0,
    };

    logger.warn("All intervals cleared", { count });
  }
}

// Export singleton instance
export const optimizedIntervalManager = OptimizedIntervalManager.getInstance();

// Start the interval manager automatically
optimizedIntervalManager.start();
