import { memo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { type StatusType } from "@/components/ui/status-indicator";

interface PerformanceScoreOverviewProps {
  performanceScore: number;
  bundleSizeKB: number;
  bundleSizeGzippedKB: number;
  compressionRate: number;
  bandwidthSavedKB: number;
  alertCount: number;
  performanceStatus: StatusType;
}

/**
 * Performance score overview cards for performance dashboard
 * Displays key performance metrics using atomic MetricCard components
 */
export const PerformanceScoreOverview = memo(
  function PerformanceScoreOverviewComponent({
    performanceScore,
    bundleSizeKB,
    bundleSizeGzippedKB,
    compressionRate,
    bandwidthSavedKB,
    alertCount,
    performanceStatus,
  }: PerformanceScoreOverviewProps) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Performance Score"
          value={`${performanceScore}%`}
          status={performanceStatus}
        />

        <MetricCard
          title="Bundle Size"
          value={`${bundleSizeKB}KB`}
          subtitle={`${bundleSizeGzippedKB}KB gzipped`}
          status={bundleSizeKB > 1024 ? "unhealthy" : "healthy"}
        />

        <MetricCard
          title="Compression"
          value={`${compressionRate}%`}
          subtitle={`${bandwidthSavedKB}KB saved`}
          status={compressionRate > 30 ? "healthy" : "degraded"}
        />

        <MetricCard
          title="Active Alerts"
          value={alertCount}
          subtitle="critical warnings"
          status={alertCount === 0 ? "healthy" : "degraded"}
        />
      </div>
    );
  },
);
