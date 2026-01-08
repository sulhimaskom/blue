import { memo } from "react";
import {
  cn,
  getTextColor,
  getBackgroundColor,
  getAccentColor,
} from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";
import { TrendingUpIcon } from "@/components/ui/icons";

/**
 * Props interface for AutoOptimizationControls component.
 * @interface AutoOptimizationControlsProps
 */
interface AutoOptimizationControlsProps {
  /** Whether auto-refresh is currently enabled */
  autoRefresh: boolean;
  /** Whether data is currently being loaded/refreshed */
  loading: boolean;
  /** Callback function to toggle auto-refresh on/off */
  onToggleAutoRefresh: () => void;
  /** Callback function to apply automatic performance optimizations */
  onApplyOptimizations: () => void;
  /** Callback function to manually refresh performance data */
  onRefresh: () => void;
}

/**
 * AutoOptimizationControls component that provides control buttons for the performance dashboard.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Zero business logic in UI component
 * - Memoized component to prevent unnecessary re-renders
 * - Theme-aware UI with consistent design system integration
 * - Accessible controls with proper ARIA labels and roles
 *
 * Features:
 * - Auto-refresh toggle button with visual state feedback
 * - Auto-optimize button for one-click performance improvements
 * - Manual refresh button with loading animation
 * - Responsive button layout with gap spacing
 * - Disabled state handling during loading
 * - Keyboard accessible with proper focus states
 * - Screen reader friendly with ARIA labels
 *
 * Button States:
 * - Auto-refresh: Green when enabled, subtle background when disabled
 * - Auto-optimize: Always active, blue theme accent
 * - Refresh: Spinning animation when loading, disabled during fetch
 *
 * Accessibility Features:
 * - Role="toolbar" for control grouping
 * - aria-label on all interactive elements
 * - aria-pressed for toggle button state
 * - aria-busy for loading state indication
 * - aria-hidden for decorative icons
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - Stable function references prevent re-renders
 * - Efficient conditional rendering and class name generation
 *
 * @example
 * ```tsx
 * <AutoOptimizationControls
 *   autoRefresh={true}
 *   loading={false}
 *   onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
 *   onApplyOptimizations={() => applyOptimizations()}
 *   onRefresh={() => refreshData()}
 * />
 * ```
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
      <div
        className="flex items-center gap-3"
        role="toolbar"
        aria-label="Performance dashboard controls"
      >
        <button
          onClick={onToggleAutoRefresh}
          aria-pressed={autoRefresh}
          aria-label={`Auto-refresh is ${autoRefresh ? "enabled" : "disabled"}`}
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
          aria-label="Apply performance optimizations automatically"
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
          aria-label={
            loading ? "Refreshing data..." : "Refresh performance data"
          }
          aria-busy={loading}
          className={cn(
            "p-2 transition-colors",
            getTextColor("muted"),
            "hover:text-gray-800 dark:hover:text-gray-200",
          )}
          disabled={loading}
        >
          <div className={loading ? "animate-spin" : ""} aria-hidden="true">
            <TrendingUpIcon />
          </div>
        </button>
      </div>
    );
  },
);
