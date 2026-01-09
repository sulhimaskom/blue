import { memo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { type StatusType } from "@/lib/services/service-types";

/**
 * Props interface for PerformanceScoreOverview component.
 * @interface PerformanceScoreOverviewProps
 */
interface PerformanceScoreOverviewProps {
  /** Overall performance score (0-100) based on system metrics */
  performanceScore: number;
  /** Total bundle size in kilobytes */
  bundleSizeKB: number;
  /** Gzipped bundle size in kilobytes */
  bundleSizeGzippedKB: number;
  /** Compression rate percentage (0-100) */
  compressionRate: number;
  /** Total bandwidth saved in KB from compression */
  bandwidthSavedKB: number;
  /** Number of active critical alerts */
  alertCount: number;
  /** Overall performance status for status indicator */
  performanceStatus: StatusType;
}

/**
 * PerformanceScoreOverview component that displays key performance metrics in card grid.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Zero business logic in UI component
 * - Atomic design with reusable MetricCard components
 * - Memoized component to prevent unnecessary re-renders
 * - Theme-aware status calculations with consistent thresholds
 *
 * Features:
 * - Performance score display with status indicator
 * - Bundle size analysis with gzipped comparison
 * - Compression metrics with bandwidth savings
 * - Active alert count with severity status
 * - Responsive grid layout (1 column mobile, 4 desktop)
 * - Status-based color coding for visual feedback
 *
 * Status Thresholds:
 * - Performance Score: Status determined by parent component
 * - Bundle Size: Unhealthy if >1024KB, Healthy otherwise
 * - Compression: Healthy if >30%, Degraded otherwise
 * - Alerts: Healthy if 0, Degraded if >0
 *
 * Metric Display:
 * - Performance Score: Percentage with status indicator
 * - Bundle Size: KB with gzipped subtitle
 * - Compression: Percentage with KB saved subtitle
 * - Alerts: Count with "critical warnings" subtitle
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - Stable prop references prevent re-renders
 * - Efficient rendering with atomic components
 *
 * @example
 * ```tsx
 * <PerformanceScoreOverview
 *   performanceScore={85}
 *   bundleSizeKB={512}
 *   bundleSizeGzippedKB={128}
 *   compressionRate={75}
 *   bandwidthSavedKB={384}
 *   alertCount={0}
 *   performanceStatus="healthy"
 * />
 * ```
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
