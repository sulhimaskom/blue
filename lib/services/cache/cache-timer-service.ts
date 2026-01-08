import { logger } from "../../logger";

/**
 * Performance measurement utility for cache operations
 *
 * Provides precise timing measurements with structured logging
 * for cache operation performance monitoring and optimization.
 */
export class CacheTimerService {
  private operation: string;
  private start: number;
  private metadata?: Record<string, any>;

  constructor(operation: string, metadata?: Record<string, any>) {
    this.operation = operation;
    this.start = Date.now();
    this.metadata = metadata;
  }

  /**
   * Complete the timer measurement and log the duration
   */
  finish(additionalMetadata?: Record<string, any>): void {
    const duration = Date.now() - this.start;

    logger.debug(`Cache operation completed: ${this.operation}`, {
      duration,
      operation: this.operation,
      ...this.metadata,
      ...additionalMetadata,
    });

    // Track performance metrics for optimization
    if (duration > 1000) {
      logger.warn(`Slow cache operation detected: ${this.operation}`, {
        duration,
        threshold: 1000,
        operation: this.operation,
      });
    }
  }

  /**
   * Get current duration without finishing the timer
   */
  getCurrentDuration(): number {
    return Date.now() - this.start;
  }

  /**
   * Create a timer for cache GET operations
   */
  static forGet(
    key: string,
    metadata?: Record<string, any>,
  ): CacheTimerService {
    return new CacheTimerService("cache:get", { key, ...metadata });
  }

  /**
   * Create a timer for cache SET operations
   */
  static forSet(
    key: string,
    metadata?: Record<string, any>,
  ): CacheTimerService {
    return new CacheTimerService("cache:set", { key, ...metadata });
  }

  /**
   * Create a timer for cache RESPONSE operations
   */
  static forResponse(
    operation: "get" | "set",
    url?: string,
    metadata?: Record<string, any>,
  ): CacheTimerService {
    return new CacheTimerService(`cache:response:${operation}`, {
      url,
      ...metadata,
    });
  }

  /**
   * Create a timer for invalidation operations
   */
  static forInvalidation(
    type: "key" | "tag" | "event",
    target: string,
    metadata?: Record<string, any>,
  ): CacheTimerService {
    return new CacheTimerService(`cache:invalidate:${type}`, {
      target,
      ...metadata,
    });
  }

  /**
   * Create a timer for warming operations
   */
  static forWarming(
    warmingType: "intelligent" | "adaptive" | "pattern",
    metadata?: Record<string, any>,
  ): CacheTimerService {
    return new CacheTimerService(`cache:warming:${warmingType}`, metadata);
  }

  /**
   * Measure async operation execution time
   */
  static async measureAsync<T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const timer = new CacheTimerService(operation, metadata);

    try {
      const result = await asyncFn();
      timer.finish();
      return result;
    } catch (error) {
      timer.finish({ error: error instanceof Error ? error.message : error });
      throw error;
    }
  }
}
