/**
 * Centralized time formatting utilities
 * Consolidates duplicate time formatting functions across the codebase
 * Follows DRY principle and Atomic Modularity
 */

import { DB_TIMEOUTS } from "@/lib/constants";

/**
 * Formats milliseconds into human readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1500ms", "2.5s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats response time with appropriate units and precision.
 * @param responseTimeMs - Response time in milliseconds
 * @returns Formatted response time string (e.g., "150.5ms", "2.34s")
 */
export function formatResponseTime(responseTimeMs: number): string {
  if (responseTimeMs < 1000) {
    return `${responseTimeMs.toFixed(1)}ms`;
  }
  return `${(responseTimeMs / 1000).toFixed(2)}s`;
}

/**
 * Calculate performance duration between two timestamps.
 * @param startTime - Start timestamp in milliseconds
 * @param endTime - End timestamp in milliseconds
 * @returns Duration in milliseconds
 */
export function calculatePerformanceDuration(
  startTime: number,
  endTime: number,
): number {
  return Math.max(0, endTime - startTime);
}

/**
 * Formats seconds into human readable uptime string
 * @param seconds - Duration in seconds
 * @returns Formatted uptime string (e.g., "2d 5h 30m", "5h 30m", "30m")
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Formats metric display names for UI presentation
 * Converts snake_case to Title Case with spaces
 * @param name - Metric name in snake_case
 * @returns Formatted display name (e.g., "response_time" → "Response Time")
 */
export function formatMetricDisplayName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Standard refresh interval for monitoring dashboards
 */
export const MONITORING_REFRESH_INTERVAL = DB_TIMEOUTS.LONG; // 30 seconds

/**
 * Formats relative time for display (e.g., "2s ago", "5m ago", "1h ago")
 * @param timestamp - Date to format relative to now
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return timestamp.toLocaleDateString();
}

/**
 * Calculate time difference between two dates
 * @param from - Start date
 * @param to - End date (defaults to now)
 * @returns Time difference in milliseconds
 */
export function calculateTimeDifference(
  from: Date,
  to: Date = new Date(),
): number {
  return to.getTime() - from.getTime();
}

/**
 * Generate unique event ID for logging and tracking
 * @returns Unique event identifier string
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format timestamp for client-side display (hydration-safe)
 * @param timestamp - Date to format
 * @returns Formatted time string or "Never" if null
 */
export function formatClientTime(timestamp: Date | null): string {
  if (!timestamp) return "Never";
  return timestamp.toLocaleTimeString();
}

/**
 * Time-based thresholds for monitoring
 */
export const MONITORING_THRESHOLDS = {
  /** Response time threshold for slow operations (5 seconds) */
  SLOW_RESPONSE: DB_TIMEOUTS.SHORT,
  /** Freshness threshold for real-time data (5 seconds) */
  DATA_FRESHNESS: DB_TIMEOUTS.SHORT,
  /** Long operation duration threshold (30 seconds) */
  LONG_OPERATION: DB_TIMEOUTS.LONG,
} as const;
