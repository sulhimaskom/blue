"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn, getTextColor } from "@/lib/constants/ui-themes";
import type { AICacheOptimizationMetrics } from "./advanced-performance-dashboard.types";

interface AIOptimizationTabProps {
  metrics: AICacheOptimizationMetrics;
  onApplyOptimization: (_index: number) => void;
}

export const AIOptimizationTab: React.FC<AIOptimizationTabProps> = ({
  metrics,
  onApplyOptimization,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className={cn("text-2xl font-bold text-green-600")}>
            ${metrics.summary.totalSavings.toFixed(2)}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Est. Monthly Savings
          </div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.summary.appliedOptimizations}
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Applied Optimizations
          </div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {metrics.summary.hitRateImprovement.toFixed(1)}%
          </div>
          <div className={cn("text-sm", getTextColor("muted"))}>
            Hit Rate Improvement
          </div>
        </div>
      </div>

      <div>
        <h3 className={cn("text-lg font-medium mb-4", getTextColor("heading"))}>
          Available Optimizations
        </h3>
        <div className="space-y-4">
          {metrics.optimizations.map((optimization) => (
            <div
              key={optimization.type}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className={cn("font-medium", getTextColor("heading"))}>
                      {optimization.type}
                    </h4>
                    <span
                      className={cn("text-sm px-2 py-1 rounded", {
                        "bg-green-100 text-green-800": optimization.applied,
                        "bg-blue-100 text-blue-800": !optimization.applied,
                      })}
                    >
                      {optimization.applied ? "Applied" : "Available"}
                    </span>
                    <span
                      className={cn(
                        "text-sm px-2 py-1 rounded bg-purple-100 text-purple-800",
                      )}
                    >
                      {optimization.confidence}% confidence
                    </span>
                  </div>

                  <p className={cn("text-sm mb-2", getTextColor("body"))}>
                    {optimization.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn("font-medium", getTextColor("muted"))}>
                      Est. Savings:
                    </span>
                    <span className={cn("text-green-600 font-medium")}>
                      ${optimization.estimatedSavings.toFixed(2)}/month
                    </span>
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    variant={optimization.applied ? "secondary" : "default"}
                    size="sm"
                    onClick={() =>
                      onApplyOptimization(
                        metrics.optimizations.indexOf(optimization),
                      )
                    }
                    disabled={optimization.applied}
                    className="min-w-[100px]"
                  >
                    {optimization.applied ? "Applied" : "Apply"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
