import type { SystemHealth } from "../hooks/use-monitoring";

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function calculateHealthPercentage(health: SystemHealth | null): number {
  if (!health) return 0;
  const healthyServices = health.checks.filter(
    (check) => check.status === "healthy",
  ).length;
  return Math.round((healthyServices / health.checks.length) * 100);
}

export function calculateLiveStatus(timestamp: string): boolean {
  const timeSinceUpdate = Date.now() - new Date(timestamp).getTime();
  return timeSinceUpdate < 5000; // less than 5 seconds ago
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
