import React from "react";
import {
  cn,
  getTextColor,
  getTrendColor,
  getBackgroundColor,
} from "@/lib/constants/ui-themes";

export interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
  loading?: boolean;
}

/**
 * Reusable stats card component for metric displays
 * Provides consistent styling for stat items across dashboard
 *
 * Features:
 * - Enhanced hover effects with subtle animations
 * - Smooth transition for trend indicators
 * - Consistent design system alignment
 * - Optional trend indicator with animation
 * - Design token-based coloring
 * - Keyboard navigation support
 * - Loading state support
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  trend,
  className,
  loading = false,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === "up")
      return <span className="inline-block transform transition-transform duration-300">↑</span>;
    if (trend.direction === "down")
      return <span className="inline-block transform transition-transform duration-300">↓</span>;
    return null;
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02] group",
        getBackgroundColor("card"),
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={loading}
    >
      <p
        className={cn(
          "text-sm font-medium transition-colors duration-200 group-hover:text-gray-700",
          getTextColor("body"),
        )}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        {loading ? (
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
        ) : (
          <p
            className={cn(
              "text-2xl font-bold transition-all duration-300 group-hover:scale-105",
              getTextColor("heading"),
            )}
          >
            {value}
          </p>
        )}
        {trend && !loading && (
          <span
            className={cn(
              "text-sm font-medium flex items-center gap-1 transition-transform duration-300 group-hover:scale-110",
              getTrendColor(trend.direction),
            )}
            aria-label={`Trend ${trend.direction}: ${trend.value}`}
          >
            {getTrendIcon()}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

StatsCard.displayName = "StatsCard";
