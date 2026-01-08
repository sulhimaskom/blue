"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/ui/icons";
import { ANIMATION_STATES, getTextColor, cn } from "@/lib/constants/ui-themes";

/**
 * Props interface for DashboardFooter component.
 * @interface DashboardFooterProps
 */
interface DashboardFooterProps {
  /** Whether data is currently being loaded/refreshed */
  loading: boolean;
  /** Whether auto-refresh is currently enabled */
  autoRefresh: boolean;
  /** Timestamp of last data refresh or null if never refreshed */
  lastRefresh: Date | null;
}

/**
 * DashboardFooter component that displays system status and refresh information.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Zero business logic in UI component
 * - Client-side rendering to fix hydration issues
 * - Theme-aware UI with consistent design system integration
 * - Accessible presentation with proper ARIA labels
 *
 * Features:
 * - Live system status indicator with animation
 * - Last refresh timestamp display
 * - Auto-refresh status display
 * - Client-side time formatting to prevent hydration mismatches
 * - Animated loading indicator during data refresh
 * - Pulsing live indicator when system is operational
 * - Conditional auto-refresh display
 *
 * Hydration Fix:
 * - Time formatting happens client-side in useEffect
 * - Initial state is "Never" before client-side formatting
 * - Prevents server/client timestamp mismatches
 *
 * Visual States:
 * - Loading: Spinning animation with "Updating..." text
 * - Live: Pulsing green dot with "System Live" text
 * - Auto-refresh: Shows clock icon with refresh interval
 * - Last refresh: Formatted local time string
 *
 * Accessibility Features:
 * - aria-label for auto-refresh status section
 * - aria-hidden for decorative icons
 * - Visual status indicators with text alternatives
 *
 * Performance Optimizations:
 * - useEffect dependency array prevents unnecessary re-renders
 * - Client-side only time formatting
 * - Efficient conditional rendering
 *
 * @example
 * ```tsx
 * <DashboardFooter
 *   loading={false}
 *   autoRefresh={true}
 *   lastRefresh={new Date()}
 * />
 * ```
 */
export function DashboardFooter({
  loading,
  autoRefresh,
  lastRefresh,
}: DashboardFooterProps) {
  const [formattedTime, setFormattedTime] = useState<string>("Never");

  // Fix hydration issue by formatting time client-side only
  useEffect(() => {
    if (lastRefresh) {
      setFormattedTime(lastRefresh.toLocaleTimeString());
    } else {
      setFormattedTime("Never");
    }
  }, [lastRefresh]);

  return (
    <div className="mt-8 text-center">
      <div className="inline-flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm">
          <div
            className={`w-3 h-3 rounded-full ${
              loading ? ANIMATION_STATES.loading : ANIMATION_STATES.live
            } shadow-sm`}
            aria-hidden="true"
          />
          <span className={cn("text-sm font-medium", getTextColor("body"))}>
            {loading ? "Updating..." : "System Live"}
          </span>
          <span
            className={cn("text-xs", getTextColor("subtle"))}
            aria-hidden="true"
          >
            •
          </span>
          <span className={cn("text-sm", getTextColor("body"))}>
            Last: {formattedTime}
          </span>
        </div>
        {autoRefresh && (
          <div
            className={cn(
              "flex items-center gap-2 text-xs",
              getTextColor("muted"),
            )}
            aria-label="Auto-refresh status"
          >
            <ClockIcon />
            Auto-refresh every 30 seconds
          </div>
        )}
      </div>
    </div>
  );
}
