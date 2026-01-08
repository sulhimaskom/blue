"use client";

import React from "react";
import { cn } from "@/lib/constants/ui-themes";
import type { PredictivePerformanceData } from "./advanced-performance-dashboard.types";

interface PredictiveAnalyticsTabProps {
  metrics: PredictivePerformanceData;
}

export const PredictiveAnalyticsTab: React.FC<PredictiveAnalyticsTabProps> = ({
  metrics,
}) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className={cn("text-2xl font-bold", "text-gray-900")}>
            {metrics.summary.totalPredictions}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>
            Total Predictions
          </div>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-red-600")}>
            {metrics.summary.highSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>High Severity</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-yellow-600")}>
            {metrics.summary.mediumSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>Medium Severity</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-blue-600")}>
            {metrics.summary.lowSeverity}
          </div>
          <div className={cn("text-sm", "text-gray-600")}>Low Severity</div>
        </div>
      </div>

      <div>
        <h3 className={cn("text-lg font-medium mb-4", "text-gray-900")}>
          Performance Predictions
        </h3>
        <div className="space-y-4">
          {metrics.predictions.map((prediction) => (
            <div
              key={`${prediction.metric}-${prediction.timeframe}`}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className={cn("font-medium", "text-gray-900")}>
                      {prediction.metric}
                    </h4>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded",
                        getSeverityColor(prediction.severity),
                      )}
                    >
                      {prediction.severity.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded bg-indigo-100 text-indigo-800",
                      )}
                    >
                      {prediction.confidence}% confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Current:
                      </span>
                      <span className={cn("ml-2 text-sm", "text-gray-700")}>
                        {prediction.currentValue}
                      </span>
                    </div>
                    <div>
                      <span
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Predicted ({prediction.timeframe}):
                      </span>
                      <span
                        className={cn(
                          "ml-2 text-sm font-medium",
                          "text-gray-700",
                        )}
                      >
                        {prediction.predictedValue}
                      </span>
                    </div>
                  </div>

                  {prediction.recommendations.length > 0 && (
                    <div>
                      <span
                        className={cn("text-sm font-medium", "text-gray-600")}
                      >
                        Recommendations:
                      </span>
                      <ul
                        className={cn(
                          "mt-1 text-sm space-y-1",
                          "text-gray-700",
                        )}
                      >
                        {prediction.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
