import React, { useMemo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { BaseCard } from "@/components/ui/base-card";
import {
  StatusIndicator,
  type StatusType,
} from "@/components/ui/status-indicator";
import { getUIText } from "@/lib/constants/ui-text";
import {
  getTextColor,
  getBackgroundColor,
  getAccentColor,
  cn,
} from "@/lib/constants/ui-themes";

interface PredictiveAnalyticsProps {
  healthScore: number;
  nextAction: string;
  predictions: Array<{
    metric: string;
    urgency: "low" | "medium" | "high" | "critical";
    recommendation: string;
    confidence: number;
  }>;
  anomalies: Array<{
    metric: string;
    severity: "minor" | "moderate" | "major" | "critical";
    description: string;
    recommendedAction: string;
  }>;
}

export const PredictiveAnalyticsPanel = React.memo(
  function PredictiveAnalyticsPanelComponent({
    healthScore,
    nextAction,
    predictions,
    anomalies,
  }: PredictiveAnalyticsProps) {
    // Memoize expensive filter operations for analytics summary
    const analyticsData = useMemo(() => {
      // Early return for empty arrays to avoid unnecessary calculations
      if (predictions.length === 0 && anomalies.length === 0) {
        return {
          activePredictions: 0,
          activeAnomalies: 0,
          hasCriticalAnomalies: false,
          highUrgencyCount: 0,
          hasCriticalPredictions: false,
        };
      }

      const activePredictions = predictions.length;
      const activeAnomalies = anomalies.length;
      const hasCriticalAnomalies = anomalies.some(
        (a) => a.severity === "critical",
      );
      const highUrgencyCount = predictions.filter(
        (p) => p.urgency === "high" || p.urgency === "critical",
      ).length;
      const hasCriticalPredictions = predictions.some(
        (p) => p.urgency === "critical",
      );

      return {
        activePredictions,
        activeAnomalies,
        hasCriticalAnomalies,
        highUrgencyCount,
        hasCriticalPredictions,
      };
    }, [predictions, anomalies]);

    // Memoize status calculations to prevent recomputation
    const healthStatus = useMemo(() => {
      if (healthScore >= 75) return "healthy";
      if (healthScore >= 60) return "degraded";
      return "unhealthy";
    }, [healthScore]);

    const healthDescription = useMemo(() => {
      if (healthScore >= 90) return getUIText("monitoring", "excellent");
      if (healthScore >= 75) return getUIText("monitoring", "good");
      if (healthScore >= 60) return getUIText("monitoring", "fair");
      return getUIText("monitoring", "needsAttention");
    }, [healthScore]);
    const getUrgencyStatus = (urgency: string): StatusType => {
      switch (urgency) {
        case "critical":
          return "unhealthy";
        case "high":
          return "degraded";
        case "medium":
          return "healthy";
        default:
          return "unknown";
      }
    };

    const getSeverityStatus = (severity: string): StatusType => {
      switch (severity) {
        case "critical":
          return "unhealthy";
        case "major":
          return "degraded";
        case "moderate":
          return "healthy";
        default:
          return "unknown";
      }
    };

    return (
      <div className="space-y-6">
        {/* Health Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Predictive Health Score"
            value={`${healthScore}/100`}
            subtitle={healthDescription}
            status={healthStatus}
          />

          <BaseCard variant="default" padding="lg">
            <div className="space-y-2">
              <h4 className={cn("font-semibold", getTextColor("heading"))}>
                Next Recommended Action
              </h4>
              <p className={cn("text-sm mb-2", getTextColor("body"))}>
                {nextAction}
              </p>
              <span
                className={cn(
                  "text-xs font-medium",
                  getAccentColor("blue", "primary"),
                )}
              >
                🤖 AI-powered optimization recommendation
              </span>
            </div>
          </BaseCard>
        </div>

        {/* Critical Predictions */}
        {predictions.length > 0 && (
          <div className="space-y-3">
            <h3
              className={cn("text-lg font-semibold", getTextColor("heading"))}
            >
              Performance Predictions
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {predictions.slice(0, 4).map((prediction, index) => (
                <BaseCard key={index} variant="default" padding="lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIndicator
                          status={getUrgencyStatus(prediction.urgency)}
                          size="md"
                        />
                        <span
                          className={cn("font-medium", getTextColor("heading"))}
                        >
                          {prediction.metric}
                        </span>
                      </div>
                      <span className={cn("text-sm", getTextColor("muted"))}>
                        {prediction.confidence}% confidence
                      </span>
                    </div>
                    <p className={cn("text-sm", getTextColor("body"))}>
                      {prediction.recommendation}
                    </p>
                  </div>
                </BaseCard>
              ))}
            </div>
          </div>
        )}

        {/* Performance Anomalies */}
        {anomalies.length > 0 && (
          <div className="space-y-3">
            <h3
              className={cn("text-lg font-semibold", getTextColor("heading"))}
            >
              Detected Anomalies
            </h3>
            <div className="space-y-3">
              {anomalies.slice(0, 3).map((anomaly, index) => (
                <BaseCard key={index} variant="error" padding="lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIndicator
                          status={getSeverityStatus(anomaly.severity)}
                          size="md"
                        />
                        <span
                          className={cn("font-medium", getTextColor("heading"))}
                        >
                          {anomaly.metric}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          getBackgroundColor("subtle"),
                          getTextColor("muted"),
                        )}
                      >
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className={cn("text-sm", getTextColor("body"))}>
                      {anomaly.description}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        getAccentColor("blue", "primary"),
                      )}
                    >
                      💡 {anomaly.recommendedAction}
                    </p>
                  </div>
                </BaseCard>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Active Predictions"
            value={analyticsData.activePredictions.toString()}
            status="healthy"
          />
          <MetricCard
            title="Active Anomalies"
            value={analyticsData.activeAnomalies.toString()}
            status={
              analyticsData.hasCriticalAnomalies ? "unhealthy" : "healthy"
            }
          />
          <MetricCard
            title="High Urgency"
            value={analyticsData.highUrgencyCount.toString()}
            status={
              analyticsData.hasCriticalPredictions ? "unhealthy" : "healthy"
            }
          />
          <MetricCard
            title="System Trend"
            value={healthScore >= 75 ? "📈 Improving" : "⚠️ Declining"}
            status={healthStatus}
          />
        </div>
      </div>
    );
  },
);
