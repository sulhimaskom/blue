import { memo } from "react";
import {
  cn,
  getTextColor,
  getBackgroundColor,
  getAccentColor,
} from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";
import { TrendingUpIcon } from "@/components/ui/icons";

interface AutoOptimizationControlsProps {
  autoRefresh: boolean;
  loading: boolean;
  onToggleAutoRefresh: () => void;
  onApplyOptimizations: () => void;
  onRefresh: () => void;
}

/**
 * Auto-optimization control buttons for performance dashboard
 * Handles auto-refresh toggle, optimization application, and manual refresh
 */
export const AutoOptimizationControls = memo(
  function AutoOptimizationControlsComponent({
    autoRefresh,
    loading,
    onToggleAutoRefresh,
    onApplyOptimizations,
    onRefresh,
  }: AutoOptimizationControlsProps) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleAutoRefresh}
          className={cn(
            "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
            autoRefresh
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : getBackgroundColor("subtle") + " " + getTextColor("body"),
          )}
        >
          {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
        </button>

        <Button
          onClick={onApplyOptimizations}
          className={cn(
            "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
            getAccentColor("blue", "background"),
            getAccentColor("blue", "text"),
            "hover:bg-blue-200 dark:hover:bg-blue-800",
          )}
        >
          Auto-Optimize
        </Button>

        <button
          onClick={onRefresh}
          className={cn(
            "p-2 transition-colors",
            getTextColor("muted"),
            "hover:text-gray-800 dark:hover:text-gray-200",
          )}
          disabled={loading}
        >
          <div className={loading ? "animate-spin" : ""}>
            <TrendingUpIcon />
          </div>
        </button>
      </div>
    );
  },
);
