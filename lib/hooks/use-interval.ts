/**
 * Reusable hook for managing periodic data fetching with intervals
 * Eliminates duplicate setInterval patterns across components
 * Follows atomic hook principles and Service Layer compliance
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MONITORING_REFRESH_INTERVAL } from "@/lib/utils/time-formatting";

export interface UseIntervalOptions {
  /** Interval duration in milliseconds */
  intervalMs?: number;
  /** Whether to auto-start the interval */
  autoStart?: boolean;
  /** Whether to run immediately on start */
  runImmediately?: boolean;
  /** Callback function for interval errors */
  // eslint-disable-next-line no-unused-vars
  onError?: (error: Error) => void;
}

export interface UseIntervalReturn {
  /** Whether the interval is currently active */
  isActive: boolean;
  /** Start the interval */
  start: () => void;
  /** Stop the interval */
  stop: () => void;
  /** Toggle the interval state */
  toggle: () => void;
  /** Manually trigger the callback */
  trigger: () => void;
  /** Restart the interval with current options */
  restart: () => void;
}

/**
 * Reusable hook for managing periodic data fetching
 * @param callback - Function to call on each interval
 * @param options - Configuration options
 * @returns Interval control methods and state
 */
export function useInterval(
  callback: () => Promise<void> | void,
  options: UseIntervalOptions = {},
): UseIntervalReturn {
  const {
    intervalMs = MONITORING_REFRESH_INTERVAL,
    autoStart = true,
    runImmediately = false,
    onError,
  } = options;

  const [isActive, setIsActive] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear interval function
  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start interval function
  const start = useCallback(() => {
    clearExistingInterval();

    // Run immediately if requested
    if (runImmediately) {
      try {
        callbackRef.current();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Set up interval
    intervalRef.current = setInterval(async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }, intervalMs);

    setIsActive(true);
  }, [intervalMs, runImmediately, onError, clearExistingInterval]);

  // Stop interval function
  const stop = useCallback(() => {
    clearExistingInterval();
    setIsActive(false);
  }, [clearExistingInterval]);

  // Toggle interval state
  const toggle = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  // Manual trigger
  const trigger = useCallback(async () => {
    try {
      await callbackRef.current();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    }
  }, [onError]);

  // Restart interval
  const restart = useCallback(() => {
    stop();
    start();
  }, [stop, start]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart) {
      start();
    }

    return () => {
      clearExistingInterval();
    };
  }, [autoStart, start, clearExistingInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearExistingInterval();
    };
  }, [clearExistingInterval]);

  return {
    isActive,
    start,
    stop,
    toggle,
    trigger,
    restart,
  };
}

/**
 * Standard intervals for different use cases
 */
export const STANDARD_INTERVALS = {
  /** Real-time updates (1 second) */
  REAL_TIME: 1000,
  /** Fast monitoring (5 seconds) */
  FAST_MONITORING: 5000,
  /** Standard monitoring (15 seconds) */
  STANDARD_MONITORING: 15000,
  /** Default monitoring (30 seconds) */
  DEFAULT_MONITORING: MONITORING_REFRESH_INTERVAL,
  /** Slow refresh (1 minute) */
  SLOW_REFRESH: 60000,
  /** Background refresh (5 minutes) */
  BACKGROUND_REFRESH: 300000,
} as const;
