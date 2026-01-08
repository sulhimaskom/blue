import React from "react";
import { cn, getTextColor, getTrendColor } from "@/lib/constants/ui-themes";

export interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}

/**
 * Reusable stats card component for metric displays
 * Provides consistent styling for stat items across the dashboard
 *
 * Features:
 * - Consistent design system alignment
 * - Optional trend indicator
 * - Design token-based coloring
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  trend,
  className,
}) => {
  return (
    <div className={cn("", className)}>
      <p className={cn("text-sm", getTextColor("body"))}>{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={cn("text-2xl font-bold", getTextColor("heading"))}>
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              "text-sm font-medium",
              getTrendColor(trend.direction),
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

StatsCard.displayName = "StatsCard";
