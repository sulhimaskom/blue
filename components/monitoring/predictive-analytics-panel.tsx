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

/**
 * Props interface for PredictiveAnalyticsPanel component.
 * @interface PredictiveAnalyticsProps
 */
interface PredictiveAnalyticsProps {
  /** Current predictive health score (0-100) based on AI analysis */
  healthScore: number;
  /** Next recommended action based on predictive analysis */
  nextAction: string;
  /** Array of performance predictions with urgency and confidence scores */
  predictions: Array<{
    /** Metric name being predicted */
    metric: string;
    /** Urgency level of the prediction */
    urgency: "low" | "medium" | "high" | "critical";
    /** AI-generated recommendation for this prediction */
    recommendation: string;
    /** Confidence score (0-100) for this prediction */
    confidence: number;
  }>;
  /** Array of detected anomalies with severity levels */
  anomalies: Array<{
    /** Metric name where anomaly was detected */
    metric: string;
    /** Severity level of the anomaly */
    severity: "minor" | "moderate" | "major" | "critical";
    /** Human-readable description of the anomaly */
    description: string;
    /** Recommended action to address the anomaly */
    recommendedAction: string;
  }>;
}

/**
 * PredictiveAnalyticsPanel component that displays AI-powered predictive analytics.
 *
 * Architectural Pattern:
 * - Service Layer compliance: Data processing happens in service layer
 * - Zero business logic in UI components per blueprint.md requirements
 * - Memoized components and calculations for performance optimization
 * - Theme-aware UI with consistent design system integration
 *
 * Features:
 * - Predictive health score with AI-powered recommendations
 * - Performance predictions with urgency and confidence levels
 * - Detected anomalies with severity classifications and remediation actions
 * - Analytics summary with key metrics (active predictions, anomalies, urgency)
 * - System trend analysis (improving vs declining)
 * - Responsive grid layout (1 column mobile, 2 tablet, 4 desktop)
 * - Real-time status indicators with color-coded urgency/severity
 *
 * Data Flow:
 * 1. Receives predictions and anomalies from AI analysis service
 * 2. Calculates analytics summary (active counts, critical flags)
 * 3. Determines health status based on health score
 * 4. Maps urgency/severity to StatusType for consistent indicators
 * 5. Displays predictions, anomalies, and summary metrics
 *
 * Performance Optimizations:
 * - React.memo for component memoization
 * - useMemo for expensive filter operations (analytics data)
 * - Early return optimization for empty arrays
 * - Memoized status calculations to prevent recomputation
 *
 * Health Score Interpretation:
 * - 90+: Excellent (🟢 healthy)
 * - 75-89: Good (🟢 healthy)
 * - 60-74: Fair (🟡 degraded)
 * - <60: Needs Attention (🔴 unhealthy)
 *
 * @example
 * ```tsx
 * <PredictiveAnalyticsPanel
 *   healthScore={85}
 *   nextAction="Increase cache TTL for AI responses"
 *   predictions={[
 *     {
 *       metric: "AI Response Time",
 *       urgency: "medium",
 *       recommendation: "Preload frequently accessed patterns",
 *       confidence: 87
 *     }
 *   ]}
 *   anomalies={[
 *     {
 *       metric: "Memory Usage",
 *       severity: "minor",
 *       description: "Slight memory increase detected",
 *       recommendedAction: "Monitor for 15 minutes"
 *     }
 *   ]}
 * />
 * ```
 */
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

    /**
     * Maps prediction urgency level to StatusType for consistent UI indicators.
     *
     * @param urgency - Urgency level from prediction data
     * @returns Corresponding StatusType for status indicator component
     */
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

    /**
     * Maps anomaly severity level to StatusType for consistent UI indicators.
     *
     * @param severity - Severity level from anomaly data
     * @returns Corresponding StatusType for status indicator component
     */
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
