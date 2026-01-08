/**
 * Comprehensive Test Suite for RetryService
 *
 * Critical Path Testing: RetryService is critical for production reliability
 * All external services (AI, GitHub, Stripe, Database) use this retry logic
 *
 * Test Coverage:
 * - Initialization & Configuration
 * - Successful Operations (no retry needed)
 * - Retry Logic (exponential backoff, jitter, max attempts)
 * - Non-Retryable Errors (immediate failure)
 * - Error Detection (isRetryableError, custom filters)
 * - executeWithRetrySafe (result object variant)
 * - Edge Cases (boundary conditions, invalid inputs)
 * - Logging & Context (observability)
 */

import {
  RetryService,
  RETRY_CONFIGS,
  type RetryOptions,
} from "../lib/services/retry-service";
import { logger, createRequestContext } from "../lib/logger";

// Mock logger
jest.mock("../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createRequestContext: jest.fn(() => ({ requestId: "test-request-id" })),
}));

describe("RetryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("RETRY_CONFIGS Presets", () => {
    test("FAST config has correct values", () => {
      expect(RETRY_CONFIGS.FAST.maxAttempts).toBe(2);
      expect(RETRY_CONFIGS.FAST.baseDelayMs).toBe(500);
      expect(RETRY_CONFIGS.FAST.maxDelayMs).toBe(5000);
      expect(RETRY_CONFIGS.FAST.backoffMultiplier).toBe(2);
    });

    test("STANDARD config has correct values", () => {
      expect(RETRY_CONFIGS.STANDARD.maxAttempts).toBe(3);
      expect(RETRY_CONFIGS.STANDARD.baseDelayMs).toBe(1000);
      expect(RETRY_CONFIGS.STANDARD.maxDelayMs).toBe(10000);
      expect(RETRY_CONFIGS.STANDARD.backoffMultiplier).toBe(2);
    });

    test("SLOW config has correct values", () => {
      expect(RETRY_CONFIGS.SLOW.maxAttempts).toBe(5);
      expect(RETRY_CONFIGS.SLOW.baseDelayMs).toBe(2000);
      expect(RETRY_CONFIGS.SLOW.maxDelayMs).toBe(30000);
      expect(RETRY_CONFIGS.SLOW.backoffMultiplier).toBe(2);
    });

    test("NETWORK_SENSITIVE config has correct values", () => {
      expect(RETRY_CONFIGS.NETWORK_SENSITIVE.maxAttempts).toBe(4);
      expect(RETRY_CONFIGS.NETWORK_SENSITIVE.baseDelayMs).toBe(1000);
      expect(RETRY_CONFIGS.NETWORK_SENSITIVE.maxDelayMs).toBe(15000);
      expect(RETRY_CONFIGS.NETWORK_SENSITIVE.backoffMultiplier).toBe(2.5);
    });
  });

  describe("Successful Operations", () => {
    test("should return result on first attempt without retry", async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should return complex object on first attempt", async () => {
      // Arrange
      const complexResult = { id: 1, name: "test", nested: { value: 42 } };
      const operation = jest.fn().mockResolvedValue(complexResult);

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.STANDARD,
      );

      // Assert
      expect(result).toEqual(complexResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should return array on first attempt", async () => {
      // Arrange
      const arrayResult = [1, 2, 3, 4, 5];
      const operation = jest.fn().mockResolvedValue(arrayResult);

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.SLOW,
      );

      // Assert
      expect(result).toEqual(arrayResult);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should log success message on retry (not first attempt)", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error: timeout"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(logger.info).toHaveBeenCalledWith(
        "Retry operation succeeded",
        expect.any(Object),
      );
    }, 3000);
  });

  describe("Retry Logic", () => {
    test("should retry on retryable network error", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValue("success after retry");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success after retry");
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        "Retrying operation after failure",
        expect.objectContaining({ attempt: 1, delayMs: expect.any(Number) }),
      );
    }, 3000);

    test("should retry on 500 server error", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("500 Internal Server Error"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    }, 3000);

    test("should retry on 429 rate limit error", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    }, 3000);

    test("should retry up to maxAttempts", async () => {
      // Arrange
      const maxAttempts = 3;
      const options = { ...RETRY_CONFIGS.FAST, maxAttempts };
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");
      expect(operation).toHaveBeenCalledTimes(maxAttempts);
    }, 3000);

    test("should use exponential backoff delay calculation", async () => {
      // Arrange
      const baseDelay = 10;
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: baseDelay,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      };
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");
      expect(operation).toHaveBeenCalledTimes(3);
    }, 3000);

    test("should cap delay at maxDelayMs", async () => {
      // Arrange
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 15,
        backoffMultiplier: 10,
      };
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");
      expect(operation).toHaveBeenCalledTimes(3);
    }, 3000);
  });

  describe("Non-Retryable Errors", () => {
    test("should fail immediately on validation error", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Validation error: invalid input"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("Validation error: invalid input");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should fail immediately on authentication error", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValue(
          new Error("Authentication failed: invalid credentials"),
        );

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("Authentication failed: invalid credentials");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should fail immediately on 404 not found error", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(new Error("404 Not Found"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("404 Not Found");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should fail immediately on custom non-retryable error", async () => {
      // Arrange
      const customFilter = jest.fn(
        (error: Error) => !error.message.includes("CustomError"),
      );
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("CustomError: do not retry"));
      const options = {
        ...RETRY_CONFIGS.STANDARD,
        retryableErrors: customFilter,
      };

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("CustomError: do not retry");
      expect(operation).toHaveBeenCalledTimes(1);
      expect(customFilter).toHaveBeenCalled();
    });
  });

  describe("Error Detection - isRetryableError", () => {
    describe("Network Errors", () => {
      test("should identify ECONNRESET as retryable", () => {
        expect(RetryService.isRetryableError(new Error("ECONNRESET"))).toBe(
          true,
        );
      });

      test("should identify ETIMEDOUT as retryable", () => {
        expect(RetryService.isRetryableError(new Error("ETIMEDOUT"))).toBe(
          true,
        );
      });

      test("should identify ENOTFOUND as retryable", () => {
        expect(RetryService.isRetryableError(new Error("ENOTFOUND"))).toBe(
          true,
        );
      });

      test("should identify ECONNREFUSED as retryable", () => {
        expect(RetryService.isRetryableError(new Error("ECONNREFUSED"))).toBe(
          true,
        );
      });

      test("should identify generic network error as retryable", () => {
        expect(RetryService.isRetryableError(new Error("Network error"))).toBe(
          true,
        );
      });

      test("should identify timeout error as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("Request timeout")),
        ).toBe(true);
      });

      test("should identify fetch failed as retryable", () => {
        expect(RetryService.isRetryableError(new Error("fetch failed"))).toBe(
          true,
        );
      });
    });

    describe("HTTP Server Errors", () => {
      test("should identify 500 as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("500 Internal Server Error")),
        ).toBe(true);
      });

      test("should identify 502 as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("502 Bad Gateway")),
        ).toBe(true);
      });

      test("should identify 503 as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("503 Service Unavailable")),
        ).toBe(true);
      });

      test("should identify 504 as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("504 Gateway Timeout")),
        ).toBe(true);
      });
    });

    describe("Rate Limit Errors", () => {
      test("should identify 429 as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("429 Too Many Requests")),
        ).toBe(true);
      });

      test("should identify rate limit error as retryable", () => {
        expect(
          RetryService.isRetryableError(new Error("Rate limit exceeded")),
        ).toBe(true);
      });
    });

    describe("Non-Retryable Errors", () => {
      test("should not retry on 400 error", () => {
        expect(
          RetryService.isRetryableError(new Error("400 Bad Request")),
        ).toBe(false);
      });

      test("should not retry on 401 error", () => {
        expect(
          RetryService.isRetryableError(new Error("401 Unauthorized")),
        ).toBe(false);
      });

      test("should not retry on 403 error", () => {
        expect(RetryService.isRetryableError(new Error("403 Forbidden"))).toBe(
          false,
        );
      });

      test("should not retry on 404 error", () => {
        expect(RetryService.isRetryableError(new Error("404 Not Found"))).toBe(
          false,
        );
      });

      test("should not retry on validation error", () => {
        expect(
          RetryService.isRetryableError(new Error("Validation error")),
        ).toBe(false);
      });

      test("should not retry on authentication error", () => {
        expect(
          RetryService.isRetryableError(new Error("Authentication failed")),
        ).toBe(false);
      });
    });
  });

  describe("Custom Error Filters", () => {
    test("should create custom error filter with retryable messages", () => {
      // Arrange
      const filter = RetryService.createErrorFilter({
        retryableMessages: ["CustomTimeout"],
      });

      // Act & Assert
      expect(filter(new Error("CustomTimeout occurred"))).toBe(true);
      expect(filter(new Error("Other error"))).toBe(false);
    });

    test("should create custom error filter with non-retryable messages", () => {
      // Arrange
      const filter = RetryService.createErrorFilter({
        nonRetryableMessages: ["PermanentError"],
      });

      // Act & Assert
      expect(filter(new Error("PermanentError occurred"))).toBe(false);
      expect(filter(new Error("ECONNRESET"))).toBe(true);
    });

    test("should prioritize non-retryable messages over retryable", () => {
      // Arrange
      const filter = RetryService.createErrorFilter({
        retryableMessages: ["network"],
        nonRetryableMessages: ["PermanentNetworkError"],
      });

      // Act & Assert
      expect(filter(new Error("PermanentNetworkError occurred"))).toBe(false);
      expect(filter(new Error("Network error"))).toBe(true);
    });

    test("should fallback to default error detection when no patterns match", () => {
      // Arrange
      const filter = RetryService.createErrorFilter({
        retryableMessages: ["CustomError"],
      });

      // Act & Assert
      expect(filter(new Error("ECONNRESET"))).toBe(true);
      expect(filter(new Error("Validation error"))).toBe(false);
    });

    test("should use custom error filter in executeWithRetry", async () => {
      // Arrange
      const customFilter = jest.fn((error: Error) =>
        error.message.includes("RetryThis"),
      );
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("RetryThis error"));
      const options = {
        ...RETRY_CONFIGS.FAST,
        maxAttempts: 3,
        retryableErrors: customFilter,
      };

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("RetryThis error");
      expect(customFilter).toHaveBeenCalledTimes(3);
      expect(operation).toHaveBeenCalledTimes(3);
    }, 3000);
  });

  describe("executeWithRetrySafe", () => {
    test("should return success result object on successful operation", async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetrySafe(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(1);
      expect(result.error).toBeUndefined();
    });

    test("should return failure result object on failed operation", async () => {
      // Arrange
      const error = new Error("Validation error");
      const operation = jest.fn().mockRejectedValue(error);

      // Act
      const result = await RetryService.executeWithRetrySafe(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.attempts).toBe(RETRY_CONFIGS.FAST.maxAttempts);
      expect(result.data).toBeUndefined();
    });

    test("should return failure result after max attempts exhausted", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act
      const result = await RetryService.executeWithRetrySafe(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(RETRY_CONFIGS.FAST.maxAttempts);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("ECONNRESET");
    }, 3000);

    test("should return success result after successful retry", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetrySafe(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.error).toBeUndefined();
    }, 3000);
  });

  describe("Logging & Context", () => {
    test("should log retry attempt with context", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));
      const context = { service: "ai", operation: "completion" };
      const options = { ...RETRY_CONFIGS.FAST, context };

      // Act
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "Retrying operation after failure",
        expect.objectContaining({
          requestId: "test-request-id",
          service: "ai",
          operation: "completion",
        }),
      );
    }, 3000);

    test("should log final failure with context", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));
      const context = { service: "database", operation: "query" };
      const options = { ...RETRY_CONFIGS.FAST, context };

      // Act
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        "Retry operation failed - giving up",
        expect.objectContaining({
          requestId: "test-request-id",
          service: "database",
          operation: "query",
        }),
      );
    }, 3000);

    test("should not log success on first attempt", async () => {
      // Arrange
      const operation = jest.fn().mockResolvedValue("success");

      // Act
      await RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD);

      // Assert
      expect(logger.info).not.toHaveBeenCalledWith(
        "Retry operation succeeded",
        expect.any(Object),
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle maxAttempts of 1 (no retry)", async () => {
      // Arrange
      const options: RetryOptions = {
        maxAttempts: 1,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      };
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should handle zero baseDelay", async () => {
      // Arrange
      const options: RetryOptions = {
        maxAttempts: 2,
        baseDelayMs: 0,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(operation, options);

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test("should handle very small maxDelayMs", async () => {
      // Arrange
      const options: RetryOptions = {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 5,
        backoffMultiplier: 10,
      };
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, options),
      ).rejects.toThrow("ECONNRESET");
      expect(operation).toHaveBeenCalledTimes(3);
    }, 3000);

    test("should handle non-Error throwables", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue("String error");

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("String error");
    });

    test("should handle null throwables", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(null);

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("null");
    });

    test("should handle undefined throwables", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(undefined);

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("undefined");
    });

    test("should handle operation that throws synchronously", async () => {
      // Arrange
      const operation = jest.fn(() => {
        throw new Error("Synchronous error");
      });

      // Act & Assert
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.STANDARD),
      ).rejects.toThrow("Synchronous error");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("should handle mixed success and failure", async () => {
      // Arrange
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValue("success");

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    }, 3000);
  });

  describe("Integration Scenarios", () => {
    test("should handle complete lifecycle: success after retry", async () => {
      // Arrange
      let attemptCount = 0;
      const operation = jest.fn(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error("ECONNRESET"));
        }
        return Promise.resolve("success");
      });

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success");
      expect(attemptCount).toBe(2);
      expect(logger.info).toHaveBeenCalledWith(
        "Retrying operation after failure",
        expect.any(Object),
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Retry operation succeeded",
        expect.any(Object),
      );
    }, 3000);

    test("should handle complete lifecycle: failure after max attempts", async () => {
      // Arrange
      const operation = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

      // Act
      await expect(
        RetryService.executeWithRetry(operation, RETRY_CONFIGS.FAST),
      ).rejects.toThrow("ECONNRESET");

      // Assert
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        "Retry operation failed - giving up",
        expect.any(Object),
      );
    }, 3000);

    test("should handle rapid state changes: alternating success/failure", async () => {
      // Arrange
      let attemptCount = 0;
      const operation = jest.fn(() => {
        attemptCount++;
        if (attemptCount % 2 === 1) {
          return Promise.reject(new Error("ECONNRESET"));
        }
        return Promise.resolve(`success-attempt-${attemptCount}`);
      });

      // Act
      const result = await RetryService.executeWithRetry(
        operation,
        RETRY_CONFIGS.FAST,
      );

      // Assert
      expect(result).toBe("success-attempt-2");
      expect(attemptCount).toBe(2);
    }, 3000);
  });
});
