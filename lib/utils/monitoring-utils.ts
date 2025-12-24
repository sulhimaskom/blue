import type { SystemHealth } from "../hooks/use-monitoring";
import {
  formatDuration,
  formatUptime,
  MONITORING_THRESHOLDS,
} from "./time-formatting";

// Re-export for backward compatibility
export { formatDuration, formatUptime };

export function calculateHealthPercentage(health: SystemHealth | null): number {
  if (!health) return 0;
  const healthyServices = health.checks.filter(
    (check) => check.status === "healthy",
  ).length;
  return Math.round((healthyServices / health.checks.length) * 100);
}

export function calculateLiveStatus(timestamp: string): boolean {
  const timeSinceUpdate = Date.now() - new Date(timestamp).getTime();
  return timeSinceUpdate < MONITORING_THRESHOLDS.DATA_FRESHNESS;
}

export function getServiceHealthSummary(health: SystemHealth): {
  healthy: number;
  total: number;
  percentage: number;
} {
  const healthy = health.checks.filter(
    (c: any) => c.status === "healthy",
  ).length;
  const total = health.checks.length;
  const percentage = Math.round((healthy / total) * 100);

  return { healthy, total, percentage };
}
