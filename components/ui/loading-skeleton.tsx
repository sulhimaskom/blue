import React, { memo } from "react";
import { cn, getBackgroundColor } from "@/lib/constants/ui-themes";

interface LoadingSkeletonProps {
  /** Whether to show the loading state */
  loading?: boolean;
  /** Number of skeleton lines to show (default: 2) */
  lines?: number;
  /** Width of skeleton lines as CSS classes */
  lineWidths?: string[];
  /** Height of skeleton lines as CSS classes */
  lineHeights?: string[];
  /** Whether to show a pulse animation (default: true) */
  animate?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Whether to show a loading status indicator */
  showStatus?: boolean;
  /** Status text to display */
  statusText?: string;
}

/**
 * Reusable loading skeleton component for consistent loading states
 * across all monitoring and dashboard components.
 *
 * Features:
 * - Configurable number of skeleton lines
 * - Customizable widths and heights
 * - Optional pulse animation
 * - Optional status indicator
 * - Theme-aware styling
 */
export const LoadingSkeleton = memo(function LoadingSkeletonComponent({
  loading = true,
  lines = 2,
  lineWidths = ["w-1/4", "w-1/3"],
  lineHeights = ["h-4", "h-3"],
  animate = true,
  className,
  showStatus = false,
  statusText,
}: LoadingSkeletonProps) {
  if (!loading) {
    return null;
  }

  const generateLines = () => {
    const lineElements = [];
    const numLines = Math.min(
      lines,
      Math.max(lineWidths.length, lineHeights.length),
    );

    for (let i = 0; i < numLines; i++) {
      const width = lineWidths[i % lineWidths.length];
      const height = lineHeights[i % lineHeights.length];

      lineElements.push(
        <div
          key={i}
          className={cn(
            "rounded",
            height,
            width,
            animate && "animate-pulse",
            getBackgroundColor("muted"),
          )}
          style={{
            animationDelay: animate ? `${i * 0.1}s` : undefined,
          }}
        />,
      );
    }

    return lineElements;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showStatus && (
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              animate && "animate-pulse",
              getBackgroundColor("muted"),
            )}
          />
          <span className="text-sm text-muted-foreground">
            {statusText || "Loading..."}
          </span>
        </div>
      )}
      {generateLines()}
    </div>
  );
});

/**
 * Compact loading skeleton for tight spaces
 */
export const CompactLoadingSkeleton = memo(
  function CompactLoadingSkeletonComponent({
    loading = true,
    className,
  }: {
    loading?: boolean;
    className?: string;
  }) {
    return (
      <LoadingSkeleton
        loading={loading}
        lines={1}
        lineHeights={["h-3"]}
        animate={true}
        className={cn("inline-block", className)}
      />
    );
  },
);

/**
 * Card loading skeleton for dashboard cards
 */
export const CardLoadingSkeleton = memo(function CardLoadingSkeletonComponent({
  loading = true,
  className,
  showHeader = true,
  lines = 3,
}: {
  loading?: boolean;
  className?: string;
  showHeader?: boolean;
  lines?: number;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-5 h-5 rounded",
              "animate-pulse",
              getBackgroundColor("muted"),
            )}
          />
          <div
            className={cn(
              "h-5 w-32 rounded",
              "animate-pulse",
              getBackgroundColor("muted"),
            )}
          />
        </div>
      )}
      <LoadingSkeleton
        loading={loading}
        lines={lines}
        lineWidths={["w-full", "w-3/4", "w-1/2"]}
        lineHeights={["h-4", "h-3", "h-3"]}
        animate={true}
      />
    </div>
  );
});

/**
 * List loading skeleton for data tables and lists
 */
export const ListLoadingSkeleton = memo(function ListLoadingSkeletonComponent({
  loading = true,
  rowCount = 5,
  className,
}: {
  loading?: boolean;
  rowCount?: number;
  className?: string;
}) {
  if (!loading) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rowCount }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded",
              "animate-pulse",
              getBackgroundColor("muted"),
            )}
          />
          <div className="flex-1 space-y-2">
            <div
              className={cn(
                "h-4 w-3/4 rounded",
                "animate-pulse",
                getBackgroundColor("muted"),
              )}
            />
            <div
              className={cn(
                "h-3 w-1/2 rounded",
                "animate-pulse",
                getBackgroundColor("muted"),
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
});
