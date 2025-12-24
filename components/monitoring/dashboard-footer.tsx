"use client";

import { useEffect, useState } from "react";

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
              loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
            } shadow-sm`}
            aria-hidden="true"
          />
          <span className="text-sm text-gray-600 font-medium">
            {loading ? "Updating..." : "System Live"}
          </span>
          <span className="text-xs text-gray-400" aria-hidden="true">
            •
          </span>
          <span className="text-sm text-gray-600">Last: {formattedTime}</span>
        </div>
        {autoRefresh && (
          <div
            className="flex items-center gap-2 text-xs text-gray-500"
            aria-label="Auto-refresh status"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Auto-refresh every 30 seconds
          </div>
        )}
      </div>
    </div>
  );
}
