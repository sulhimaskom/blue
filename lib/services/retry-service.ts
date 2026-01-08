import { logger, createRequestContext } from "@/lib/logger";

/**
 * Retry Configuration Presets
 * Pre-defined retry strategies for different operational requirements
 */
export const RETRY_CONFIGS = {
  /** Fast operations: 2 attempts, 500ms base delay, 5s max delay */
  FAST: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },
  /** Standard operations: 3 attempts, 1s base delay, 10s max delay */
  STANDARD: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
  /** Slow operations: 5 attempts, 2s base delay, 30s max delay */
  SLOW: {
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  /** Network-sensitive operations: 4 attempts, 1s base delay, 15s max delay, 2.5x multiplier */
  NETWORK_SENSITIVE: {
    maxAttempts: 4,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2.5,
  },
} as const;

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (_error: Error) => boolean;
  context?: {
    service: string;
    operation: string;
    [key: string]: unknown;
  };
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * RetryService - Simplified retry wrapper following WebhookQueueService pattern
 *
 * Design Principles:
 * - External services WILL fail; handle gracefully
 * - Exponential backoff with jitter to prevent thundering herd
 * - Max delay cap to prevent excessive retries
 * - Context-aware logging for observability
 * - Idempotency safe (caller responsibility)
 *
 * Usage Example:
 * ```typescript
 * const result = await RetryService.executeWithRetry(
 *   async () => fetch(url),
 *   RETRY_CONFIGS.STANDARD,
 *   { service: "ai", operation: "completion" }
 * );
 * ```
 */
export class RetryService {
  /**
   * Execute function with retry logic and exponential backoff
   *
   * @param operation - Async function to execute
   * @param options - Retry configuration
   * @returns Result with success status and data or error
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    const context = createRequestContext();

    const {
      maxAttempts,
      baseDelayMs,
      maxDelayMs,
      backoffMultiplier,
      retryableErrors = RetryService.isRetryableError,
      context: retryContext,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;

    for (attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Execute operation
        const result = await operation();

        // Log success on retry
        if (attempt > 1) {
          logger.info("Retry operation succeeded", {
            requestId: context?.requestId,
            attempt,
            maxAttempts,
            ...(retryContext || {}),
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!retryableErrors(lastError) || attempt === maxAttempts) {
          // Log final failure
          try {
            logger.warn("Retry operation failed - giving up", {
              requestId: context?.requestId,
              attempt,
              maxAttempts,
              error: lastError.message,
              ...(retryContext || {}),
            });
          } catch {
            // Silently fail if logging fails
          }
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = RetryService.calculateDelay(
          attempt,
          baseDelayMs,
          maxDelayMs,
          backoffMultiplier,
        );

        // Log retry attempt
        try {
          logger.info("Retrying operation after failure", {
            requestId: context?.requestId,
            attempt,
            delayMs: delay,
            error: lastError.message,
            ...(retryContext || {}),
          });
        } catch {
          // Silently fail if logging fails
        }

        // Wait before retry
        await RetryService.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error("Retry failed unexpectedly");
  }

  /**
   * Execute function with retry logic, returning result object instead of throwing
   *
   * @param operation - Async function to execute
   * @param options - Retry configuration
   * @returns Result object with success status
   */
  static async executeWithRetrySafe<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<RetryResult<T>> {
    try {
      const data = await RetryService.executeWithRetry(operation, options);
      return { success: true, data, attempts: 1 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: options.maxAttempts,
      };
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   *
   * @param attempt - Current attempt number
   * @param baseDelayMs - Base delay in milliseconds
   * @param maxDelayMs - Maximum delay in milliseconds
   * @param backoffMultiplier - Exponential multiplier
   * @returns Delay in milliseconds
   */
  private static calculateDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
  ): number {
    // Calculate exponential backoff
    const exponentialDelay =
      baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);

    // Add jitter (randomization between 0.5x and 1.0x) to prevent thundering herd
    const jitter = 0.5 + Math.random() * 0.5;
    const jitteredDelay = exponentialDelay * jitter;

    // Cap at max delay
    return Math.min(jitteredDelay, maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Default retryable error detector
   *
   * Retry on:
   * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
   * - Timeout errors
   * - 5xx server errors (via status code check)
   * - 429 rate limit errors (via status code check)
   *
   * Do not retry on:
   * - 4xx client errors (except 429)
   * - Validation errors
   * - Authentication errors
   *
   * @param error - Error to check
   * @returns True if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("econnreset") ||
      message.includes("etimedout") ||
      message.includes("enotfound") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("fetch failed")
    ) {
      return true;
    }

    // HTTP status code errors (from response.json() or similar)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true;
    }

    // Rate limit errors
    if (message.includes("429") || message.includes("rate limit")) {
      return true;
    }

    // Default: don't retry
    return false;
  }

  /**
   * Create custom retryable error filter
   *
   * @param options - Retryable and non-retryable message patterns
   * @returns Error filter function
   */
  static createErrorFilter(options?: {
    retryableMessages?: string[];
    nonRetryableMessages?: string[];
  }) {
    const { retryableMessages = [], nonRetryableMessages = [] } = options || {};

    return (error: Error): boolean => {
      const message = error.message.toLowerCase();

      // Check non-retryable patterns (higher priority)
      if (
        nonRetryableMessages &&
        nonRetryableMessages.some((pattern) =>
          message.includes(pattern.toLowerCase()),
        )
      ) {
        return false;
      }

      // Check retryable patterns
      if (
        retryableMessages &&
        retryableMessages.some((pattern) =>
          message.includes(pattern.toLowerCase()),
        )
      ) {
        return true;
      }

      // Default to retryable error detection
      return RetryService.isRetryableError(error);
    };
  }
}

// Export singleton for backward compatibility
export const retryService = RetryService;
