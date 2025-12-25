"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/ui/icons";
import { ANIMATION_STATES, getTextColor, cn } from "@/lib/constants/ui-themes";

interface DashboardFooterProps {
  loading: boolean;
  autoRefresh: boolean;
  lastRefresh: Date | null;
}

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
