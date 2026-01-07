import { memo } from "react";
import {
  cn,
  getTextColor,
  getAccentColor,
  getStatusTheme,
} from "@/lib/constants/ui-themes";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { PerformanceAlert } from "@/lib/types/webhook-types";

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
  quickWins: string[];
}

/**
 * Alerts and quick wins panel for performance dashboard
 * Displays critical performance alerts and optimization recommendations
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
