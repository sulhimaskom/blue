/**
 * Time Measurement Service
 *
 * Centralized timing utilities for consistent performance tracking,
 * duration calculation, and timestamp management across the application.
 *
 * Replaces scattered Date.now() patterns with atomic, testable timing operations.
 */

export interface TimeMeasurementConfig {
  precision?: number; // Decimal places for duration formatting
  unit?: "ms" | "s" | "auto"; // Output unit
}

export interface PerformanceTimer {
  startTime: number;
  label?: string;
}

export interface TimeWindow {
  start: number;
  end: number;
  duration: number;
}

/**
 * Centralized time measurement utilities
 */
export class TimeMeasurement {
  private static timers = new Map<string, PerformanceTimer>();

  /**
   * Get current timestamp with high precision
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Start a named performance timer
   */
  static startTimer(label: string): PerformanceTimer {
    const timer: PerformanceTimer = {
      startTime: this.now(),
      label,
    };

    this.timers.set(label, timer);
    return timer;
  }

  /**
   * End a timer and return duration
   */
  static endTimer(label: string, config: TimeMeasurementConfig = {}): number {
    const timer = this.timers.get(label);
    if (!timer) {
      throw new Error(`Timer "${label}" not found`);
    }

    const duration = this.now() - timer.startTime;
    this.timers.delete(label);

    return this.formatDuration(duration, config);
  }

  /**
   * Get duration from a start time
   */
  static getDuration(
    startTime: number,
    config: TimeMeasurementConfig = {},
  ): number {
    const rawDuration = this.now() - startTime;
    return this.formatDuration(rawDuration, config);
  }

  /**
   * Format duration according to configuration
   */
  static formatDuration(
    durationMs: number,
    config: TimeMeasurementConfig = {},
  ): number {
    const { precision = 0, unit = "ms" } = config;

    switch (unit) {
      case "s":
        return Number((durationMs / 1000).toFixed(precision));
      case "auto":
        if (durationMs < 1000) {
          return Number(durationMs.toFixed(precision));
        } else {
          return Number((durationMs / 1000).toFixed(precision));
        }
      case "ms":
      default:
        return Number(durationMs.toFixed(precision));
    }
  }

  /**
   * Format duration for human-readable display
   */
  static formatDurationHuman(
    durationMs: number,
    config: TimeMeasurementConfig = {},
  ): string {
    const { precision = 1 } = config;

    if (durationMs < 1000) {
      return `${durationMs.toFixed(precision)}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(precision)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = ((durationMs % 60000) / 1000).toFixed(precision);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Create a time window object
   */
  static createTimeWindow(): TimeWindow {
    const start = this.now();
    return {
      start,
      end: 0,
      duration: 0,
    };
  }

  /**
   * Close a time window
   */
  static closeTimeWindow(window: TimeWindow): TimeWindow {
    window.end = this.now();
    window.duration = window.end - window.start;
    return window;
  }

  /**
   * Check if a timestamp is recent (within threshold)
   */
  static isRecent(timestamp: number, thresholdMs: number = 5000): boolean {
    return this.now() - timestamp < thresholdMs;
  }

  /**
   * Calculate age of a timestamp
   */
  static getAge(timestamp: number): number {
    return this.now() - timestamp;
  }

  /**
   * Check if timestamp is expired
   */
  static isExpired(timestamp: number, ttlMs: number): boolean {
    return this.getAge(timestamp) > ttlMs;
  }

  /**
   * Add time to current timestamp
   */
  static addTime(msToAdd: number): number {
    return this.now() + msToAdd;
  }

  /**
   * Subtract time from current timestamp
   */
  static subtractTime(msToSubtract: number): number {
    return this.now() - msToSubtract;
  }

  /**
   * Get timestamp for future time
   */
  static getFutureTimestamp(msInFuture: number): number {
    return this.now() + msInFuture;
  }

  /**
   * Get timestamp for past time
   */
  static getPastTimestamp(msInPast: number): number {
    return this.now() - msInPast;
  }

  /**
   * Clear all active timers
   */
  static clearAllTimers(): void {
    this.timers.clear();
  }

  /**
   * Get all active timer labels
   */
  static getActiveTimerLabels(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Check if timer exists
   */
  static hasTimer(label: string): boolean {
    return this.timers.has(label);
  }

  /**
   * Get timer info without ending it
   */
  static getTimerInfo(
    label: string,
  ): { duration: number; label?: string } | null {
    const timer = this.timers.get(label);
    if (!timer) {
      return null;
    }

    return {
      duration: this.getDuration(timer.startTime),
      label: timer.label,
    };
  }
}

// Predefined timing configurations for common use cases
export const TimingConfigs = {
  PERFORMANCE: { precision: 0, unit: "ms" as const },
  API_RESPONSE: { precision: 1, unit: "ms" as const },
  DATABASE_QUERY: { precision: 0, unit: "ms" as const },
  CACHE_TTL: { precision: 0, unit: "s" as const },
  HUMAN_READABLE: { precision: 1, unit: "auto" as const },
} as const;

// Convenience methods for common timing patterns
export const Timing = {
  /**
   * Quick duration measurement
   */
  duration: (startTime: number) => TimeMeasurement.getDuration(startTime),

  /**
   * Human-readable duration
   */
  human: (durationMs: number) =>
    TimeMeasurement.formatDurationHuman(durationMs),

  /**
   * Performance timing
   */
  perf: (startTime: number) =>
    TimeMeasurement.getDuration(startTime, TimingConfigs.PERFORMANCE),

  /**
   * API response timing
   */
  api: (startTime: number) =>
    TimeMeasurement.getDuration(startTime, TimingConfigs.API_RESPONSE),

  /**
   * Database query timing
   */
  db: (startTime: number) =>
    TimeMeasurement.getDuration(startTime, TimingConfigs.DATABASE_QUERY),

  /**
   * Check if recent (5 second default)
   */
  recent: (timestamp: number, thresholdMs?: number) =>
    TimeMeasurement.isRecent(timestamp, thresholdMs),

  /**
   * Get current timestamp
   */
  now: () => TimeMeasurement.now(),

  /**
   * Start timer with auto-generated label
   */
  start: (prefix = "timer") =>
    TimeMeasurement.startTimer(`${prefix}_${TimeMeasurement.now()}`),

  /**
   * End timer and get human-readable result
   */
  end: (label: string) => {
    const duration = TimeMeasurement.endTimer(label);
    return TimeMeasurement.formatDurationHuman(duration);
  },
} as const;
