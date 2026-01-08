/**
 * Reusable hook for periodic data fetching with loading and error states
 * Eliminates duplicate data fetching patterns across monitoring components
 * Follows Service Layer principles with centralized state management
 */

import { useState, useCallback, useRef } from "react";
import { useInterval, type UseIntervalOptions } from "./use-interval";

export interface UsePeriodicFetchOptions<T> extends UseIntervalOptions {
  /** Fetch function that returns data */
  fetchFn: () => Promise<T>;
  /** Whether to enabled periodic fetching */
  enabled?: boolean;
  /** Maximum number of retry attempts on failure */
  maxRetries?: number;
  /** Delay between retry attempts */
  retryDelay?: number;
}

export interface UsePeriodicFetchReturn<T> {
  /** Current data */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Last successful fetch timestamp */
  lastFetch: Date | null;
  /** Number of consecutive failures */
  failureCount: number;
  /** Whether the fetcher is active */
  isActive: boolean;
  /** Manual refetch */
  refetch: () => Promise<void>;
  /** Start periodic fetching */
  start: () => void;
  /** Stop periodic fetching */
  stop: () => void;
  /** Toggle fetching state */
  toggle: () => void;
}

/**
 * Reusable hook for periodic data fetching with error handling and retries
 * @param options - Configuration options including fetch function
 * @returns Data fetching state and control methods
 */
export function usePeriodicFetch<T>(
  options: UsePeriodicFetchOptions<T>,
): UsePeriodicFetchReturn<T> {
  const {
    fetchFn,
    intervalMs,
    autoStart = true,
    runImmediately = true,
    enabled = true,
    maxRetries = 3,
    retryDelay = 5000,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  const consecutiveFailuresRef = useRef(0);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
    setFailureCount(0);
    consecutiveFailuresRef.current = 0;
  }, []);

  // Fetch data with retry logic
  const fetchData = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    setIsLoading(true);
    resetError();

    try {
      const result = await fetchFn();
      setData(result);
      setLastFetch(new Date());
      setFailureCount(0);
      consecutiveFailuresRef.current = 0;
    } catch (fetchError) {
      const error =
        fetchError instanceof Error
          ? fetchError
          : new Error(String(fetchError));
      setError(error);
      setFailureCount(++consecutiveFailuresRef.current);

      onError?.(error);

      // Stop fetching if max retries exceeded
      if (consecutiveFailuresRef.current >= maxRetries) {
        // Max retries exceeded - logging handled by error callback
        return;
      }

      // Schedule retry if under max retries
      if (consecutiveFailuresRef.current < maxRetries) {
        setTimeout(() => {
          fetchData();
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchFn, maxRetries, retryDelay, onError, resetError]);

  // Manual refetch
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  // Set up interval
  const {
    isActive,
    start: startInterval,
    stop: stopInterval,
    toggle: toggleInterval,
  } = useInterval(fetchData, {
    intervalMs,
    autoStart: autoStart && enabled,
    runImmediately,
    onError: (error) => {
      setError(error);
      setFailureCount(++consecutiveFailuresRef.current);
    },
  });

  // Start/stop functions
  const start = useCallback(() => {
    if (enabled) {
      startInterval();
    }
  }, [enabled, startInterval]);

  const stop = useCallback(() => {
    stopInterval();
  }, [stopInterval]);

  const toggle = useCallback(() => {
    if (enabled) {
      toggleInterval();
    }
  }, [enabled, toggleInterval]);

  return {
    data,
    isLoading,
    error,
    lastFetch,
    failureCount,
    isActive: isActive && enabled,
    refetch,
    start,
    stop,
    toggle,
  };
}

/**
 * Hook for real-time data fetching with immediate updates
 * Optimized for monitoring dashboards that need current data
 */
export function useRealTimeData<T>(
  fetchFn: () => Promise<T>,
  options: Partial<
    Omit<UsePeriodicFetchOptions<T>, "autoStart" | "runImmediately">
  > = {},
): UsePeriodicFetchReturn<T> {
  return usePeriodicFetch({
    fetchFn,
    intervalMs: 1000, // 1 second for real-time
    autoStart: true,
    runImmediately: true,
    maxRetries: 5,
    retryDelay: 1000,
    ...options,
  });
}

/**
 * Hook for monitoring data with standard intervals
 * Optimized for performance monitoring and health checks
 */
export function useMonitoringData<T>(
  fetchFn: () => Promise<T>,
  options: Partial<
    Omit<UsePeriodicFetchOptions<T>, "autoStart" | "runImmediately">
  > = {},
): UsePeriodicFetchReturn<T> {
  return usePeriodicFetch({
    fetchFn,
    intervalMs: 30000, // 30 seconds for monitoring
    autoStart: true,
    runImmediately: true,
    maxRetries: 3,
    retryDelay: 5000,
    ...options,
  });
}
