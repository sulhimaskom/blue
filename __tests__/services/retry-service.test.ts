/**
 * RetryService Test Suite
 *
 * @author AI Agent Engineer
 * @date 2026-02-25
 * @domain ai-agent-engineer
 *
 * Business Impact:
 * - Validates retry logic for external service resilience
 * - Ensures proper exponential backoff behavior
 * - Confirms error classification for retry decisions
 */

import { RetryService, RETRY_CONFIGS } from '@/lib/services/retry-service';

describe('RetryService', () => {
  // Test constants
  const FAST_OPTIONS = RETRY_CONFIGS.FAST;
  const STANDARD_OPTIONS = RETRY_CONFIGS.STANDARD;
  const SLOW_OPTIONS = RETRY_CONFIGS.SLOW;
  const NETWORK_OPTIONS = RETRY_CONFIGS.NETWORK_SENSITIVE;

  describe('RETRY_CONFIGS', () => {
    it('should have FAST config with correct defaults', () => {
      expect(FAST_OPTIONS.maxAttempts).toBe(2);
      expect(FAST_OPTIONS.baseDelayMs).toBe(500);
      expect(FAST_OPTIONS.maxDelayMs).toBe(5000);
      expect(FAST_OPTIONS.backoffMultiplier).toBe(2);
    });

    it('should have STANDARD config with correct defaults', () => {
      expect(STANDARD_OPTIONS.maxAttempts).toBe(3);
      expect(STANDARD_OPTIONS.baseDelayMs).toBe(1000);
      expect(STANDARD_OPTIONS.maxDelayMs).toBe(10000);
      expect(STANDARD_OPTIONS.backoffMultiplier).toBe(2);
    });

    it('should have SLOW config with correct defaults', () => {
      expect(SLOW_OPTIONS.maxAttempts).toBe(5);
      expect(SLOW_OPTIONS.baseDelayMs).toBe(2000);
      expect(SLOW_OPTIONS.maxDelayMs).toBe(30000);
      expect(SLOW_OPTIONS.backoffMultiplier).toBe(2);
    });

    it('should have NETWORK_SENSITIVE config with correct defaults', () => {
      expect(NETWORK_OPTIONS.maxAttempts).toBe(4);
      expect(NETWORK_OPTIONS.baseDelayMs).toBe(1000);
      expect(NETWORK_OPTIONS.maxDelayMs).toBe(15000);
      expect(NETWORK_OPTIONS.backoffMultiplier).toBe(2.5);
    });
  });

  describe('executeWithRetry - Success Cases', () => {
    it('should execute successfully on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return correct data on success', async () => {
      const operation = jest.fn().mockResolvedValue({ key: 'value' });
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toEqual({ key: 'value' });
    });

    it('should handle async operations correctly', async () => {
      const operation = jest.fn().mockImplementation(() => Promise.resolve('async success'));
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toBe('async success');
    });

    it('should handle promise that resolves immediately', async () => {
      const operation = jest.fn().mockResolvedValue('immediate');
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toBe('immediate');
    });
  });

  describe('executeWithRetry - Non-Retryable Errors', () => {
    it('should not retry on non-retryable errors immediately', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation error: invalid input'));

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow(
        'Validation error: invalid input'
      );

      // Should only attempt once for non-retryable errors
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 4xx client errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('400 Bad Request'));

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow(
        '400 Bad Request'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on authentication errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow(
        '401 Unauthorized'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 Forbidden', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('403 Forbidden'));

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow(
        '403 Forbidden'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 Not Found', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('404 Not Found'));

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow(
        '404 Not Found'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithRetrySafe', () => {
    it('should return success result on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('data');
      const result = await RetryService.executeWithRetrySafe(operation, STANDARD_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.data).toBe('data');
      expect(result.attempts).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should return failure result on failed operation', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failure'));
      const result = await RetryService.executeWithRetrySafe(operation, STANDARD_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.attempts).toBe(STANDARD_OPTIONS.maxAttempts);
    });

    it('should not throw on failure - returns error in result', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));

      // This should not throw
      const result = await RetryService.executeWithRetrySafe(operation, STANDARD_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
    });

    it('should return success with correct attempts after retry success', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT - temporary'))
        .mockResolvedValue('data');

      const result = await RetryService.executeWithRetrySafe(operation, {
        ...STANDARD_OPTIONS,
        maxAttempts: 2,
        baseDelayMs: 10, // Very small delay for fast test
        maxDelayMs: 100,
      });

      // Give time for retry
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(result.success).toBe(true);
      expect(result.data).toBe('data');
    });
  });

  describe('isRetryableError', () => {
    it('should retry on network errors - ECONNRESET', () => {
      const result = RetryService.isRetryableError(new Error('ECONNRESET'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - ETIMEDOUT', () => {
      const result = RetryService.isRetryableError(new Error('ETIMEDOUT'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - ENOTFOUND', () => {
      const result = RetryService.isRetryableError(new Error('ENOTFOUND'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - ECONNREFUSED', () => {
      const result = RetryService.isRetryableError(new Error('ECONNREFUSED'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - generic network', () => {
      const result = RetryService.isRetryableError(new Error('Network error'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - timeout', () => {
      const result = RetryService.isRetryableError(new Error('Timeout error'));
      expect(result).toBe(true);
    });

    it('should retry on network errors - fetch failed', () => {
      const result = RetryService.isRetryableError(new Error('fetch failed'));
      expect(result).toBe(true);
    });

    it('should retry on 5xx server errors - 500', () => {
      const result = RetryService.isRetryableError(new Error('500 Internal Server Error'));
      expect(result).toBe(true);
    });

    it('should retry on 5xx server errors - 502', () => {
      const result = RetryService.isRetryableError(new Error('502 Bad Gateway'));
      expect(result).toBe(true);
    });

    it('should retry on 5xx server errors - 503', () => {
      const result = RetryService.isRetryableError(new Error('503 Service Unavailable'));
      expect(result).toBe(true);
    });

    it('should retry on 5xx server errors - 504', () => {
      const result = RetryService.isRetryableError(new Error('504 Gateway Timeout'));
      expect(result).toBe(true);
    });

    it('should retry on rate limit errors - 429', () => {
      const result = RetryService.isRetryableError(new Error('429 Too Many Requests'));
      expect(result).toBe(true);
    });

    it('should retry on rate limit errors - rate limit text', () => {
      const result = RetryService.isRetryableError(new Error('Rate limit exceeded'));
      expect(result).toBe(true);
    });

    it('should not retry on 4xx client errors - 400', () => {
      const result = RetryService.isRetryableError(new Error('400 Bad Request'));
      expect(result).toBe(false);
    });

    it('should not retry on 4xx client errors - 401', () => {
      const result = RetryService.isRetryableError(new Error('401 Unauthorized'));
      expect(result).toBe(false);
    });

    it('should not retry on 4xx client errors - 403', () => {
      const result = RetryService.isRetryableError(new Error('403 Forbidden'));
      expect(result).toBe(false);
    });

    it('should not retry on 4xx client errors - 404', () => {
      const result = RetryService.isRetryableError(new Error('404 Not Found'));
      expect(result).toBe(false);
    });

    it('should not retry on validation errors', () => {
      const result = RetryService.isRetryableError(new Error('Validation error'));
      expect(result).toBe(false);
    });

    it('should not retry on invalid input errors', () => {
      const result = RetryService.isRetryableError(new Error('Invalid input'));
      expect(result).toBe(false);
    });

    it('should not retry on missing required field errors', () => {
      const result = RetryService.isRetryableError(new Error('Missing required field'));
      expect(result).toBe(false);
    });

    it('should not retry on authentication errors', () => {
      const result = RetryService.isRetryableError(new Error('Authentication failed'));
      expect(result).toBe(false);
    });

    it('should not retry on invalid token errors', () => {
      const result = RetryService.isRetryableError(new Error('Invalid token'));
      expect(result).toBe(false);
    });

    it('should not retry on unauthorized access errors', () => {
      const result = RetryService.isRetryableError(new Error('Unauthorized access'));
      expect(result).toBe(false);
    });
  });

  describe('createErrorFilter', () => {
    it('should create custom filter with retryable messages', () => {
      const filter = RetryService.createErrorFilter({
        retryableMessages: ['custom retry'],
      });

      expect(filter(new Error('custom retry error'))).toBe(true);
      expect(filter(new Error('some other error'))).toBe(false);
    });

    it('should create custom filter with non-retryable messages', () => {
      const filter = RetryService.createErrorFilter({
        nonRetryableMessages: ['never retry this'],
      });

      expect(filter(new Error('never retry this error'))).toBe(false);
    });

    it('should prioritize non-retryable over retryable patterns', () => {
      const filter = RetryService.createErrorFilter({
        retryableMessages: ['retry me'],
        nonRetryableMessages: ['but not this'],
      });

      // nonRetryable takes precedence
      expect(filter(new Error('but not this and retry me'))).toBe(false);
    });

    it('should fall back to default retry detection', () => {
      const filter = RetryService.createErrorFilter({});

      // Should use default isRetryableError behavior
      expect(filter(new Error('ETIMEDOUT'))).toBe(true);
      expect(filter(new Error('400 Bad Request'))).toBe(false);
    });

    it('should handle empty options gracefully', () => {
      const filter = RetryService.createErrorFilter();

      expect(filter(new Error('ETIMEDOUT'))).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      const filter = RetryService.createErrorFilter({
        retryableMessages: ['CUSTOM ERROR'],
      });

      expect(filter(new Error('custom error'))).toBe(true);
    });
  });

  describe('Custom Retry Options', () => {
    it('should use custom retryableErrors function', async () => {
      const customFilter = jest.fn().mockReturnValue(true);
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RetryService.executeWithRetry(operation, {
        maxAttempts: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        backoffMultiplier: 2,
        retryableErrors: customFilter,
      });

      expect(result).toBe('success');
    });

    it('should respect custom context in options', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = {
        service: 'test-service',
        operation: 'test-operation',
      };

      await RetryService.executeWithRetry(operation, {
        ...STANDARD_OPTIONS,
        context,
      });

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle operation returning null', async () => {
      const operation = jest.fn().mockResolvedValue(null);
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toBeNull();
    });

    it('should handle operation returning undefined', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);
      const result = await RetryService.executeWithRetry(operation, STANDARD_OPTIONS);

      expect(result).toBeUndefined();
    });

    it('should handle operation throwing non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow();
    });

    it('should handle object error', async () => {
      const operation = jest.fn().mockRejectedValue({ code: 'ERR' });

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow();
    });

    it('should handle array error', async () => {
      const operation = jest.fn().mockRejectedValue(['error', 'array']);

      await expect(RetryService.executeWithRetry(operation, STANDARD_OPTIONS)).rejects.toThrow();
    });
  });
});
