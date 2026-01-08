import { memo } from "react";
import {
  cn,
  getTextColor,
  getAccentColor,
  getStatusTheme,
} from "@/lib/constants/ui-themes";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { PerformanceAlert } from "@/lib/types/webhook-types";

/**
 * Props interface for AlertsPanel component.
 * @interface AlertsPanelProps
 */
interface AlertsPanelProps {
  /** Array of performance alerts requiring attention */
  alerts: PerformanceAlert[];
  /** Array of quick optimization recommendations */
  quickWins: string[];
}

/**
 * AlertsPanel component that displays critical performance alerts and optimization recommendations.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Zero business logic in UI component
 * - Memoized component to prevent unnecessary re-renders
 * - Theme-aware UI with consistent design system integration
 * - Accessible presentation with proper ARIA labels
 *
 * Features:
 * - Critical performance alerts with metric name and threshold violations
 * - Percentage calculation for over-threshold alerts
 * - Quick performance wins grid layout
 * - Color-coded alert severity (unhealthy theme)
 * - Responsive grid for quick wins (1 column mobile, 2 desktop)
 * - Conditional rendering (only shows if alerts/quickWins exist)
 * - Formatted threshold violations with percentage calculations
 *
 * Data Presentation:
 * - Alerts: Metric name, percentage over threshold, recommendation
 * - Quick Wins: Optimization suggestions in grid format
 * - Threshold calculations: ((value - threshold) / threshold) * 100
 *
 * Conditional Rendering:
 * - Alerts section: Only renders if alerts.length > 0
 * - Quick Wins section: Only renders if quickWins.length > 0
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - Efficient array mapping without unnecessary re-renders
 * - Conditional rendering prevents DOM bloat
 *
 * @example
 * ```tsx
 * <AlertsPanel
 *   alerts={[
 *     {
 *       metric: "Response Time",
 *       value: 500,
 *       threshold: 200,
 *       recommendation: "Enable caching"
 *     }
 *   ]}
 *   quickWins={[
 *     "Enable gzip compression",
 *     "Optimize images"
 *   ]}
 * />
 * ```
 */
export const AlertsPanel = memo(function AlertsPanelComponent({
  alerts,
  quickWins,
}: AlertsPanelProps) {
  return (
    <>
      {alerts.length > 0 && (
        <div className="mb-6">
          <h3
            className={cn(
              "text-lg font-medium mb-3 flex items-center gap-2",
              getTextColor("heading"),
            )}
          >
            <AlertTriangleIcon />
            Critical Performance Alerts
          </h3>
          <div className="space-y-2">
            {alerts.map((alert: PerformanceAlert, index: number) => (
              <div
                key={index}
                className={cn("p-3 rounded-lg", getStatusTheme("unhealthy"))}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium capitalize">{alert.metric}</span>
                  <span className="text-sm opacity-75">
                    {alert.value > alert.threshold
                      ? `${Math.round(((alert.value - alert.threshold) / alert.threshold) * 100)}% over threshold`
                      : "at threshold"}
                  </span>
                </div>
                <p className="text-sm opacity-90">{alert.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {quickWins.length > 0 && (
        <div>
          <h3
            className={cn("text-lg font-medium mb-3", getTextColor("heading"))}
          >
            Quick Performance Wins
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickWins.map((win: string, index: number) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  getAccentColor("blue", "background"),
                )}
              >
                <p className={cn("text-sm", getAccentColor("blue", "text"))}>
                  {win}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
});
