"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CpuIcon } from "@/components/ui/icons";
import { cn } from "@/lib/constants/ui-themes";

interface DashboardControlsProps {
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  autoRefresh,
  onAutoRefreshToggle,
  onRefresh,
  refreshing,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAutoRefreshToggle}
        className={cn(autoRefresh ? "bg-green-50 border-green-300" : "")}
        aria-pressed={autoRefresh}
        aria-label={`${autoRefresh ? 'Disable' : 'Enable'} auto-refresh`}
      >
        <CpuIcon
          className={cn(
            "w-4 h-4 mr-2",
            autoRefresh || refreshing ? "animate-spin" : "",
          )}
          aria-hidden="true"
        />
        {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh performance metrics now"
      >
        <CpuIcon
          className={cn("w-4 h-4 mr-2", refreshing ? "animate-spin" : "")}
          aria-hidden="true"
        />
        Refresh Now
      </Button>
    </div>
  );
};
