"use client";

import { useCallback } from "react";
import { monitoringAPI } from "@/lib/services/monitoring-api";
import type { AICacheOptimizationMetrics } from "./advanced-performance-dashboard.types";

interface UseOptimizationHandlerOptions {
  onError?: (_error: string) => void;
  onSuccess?: (_message: string) => void;
  onRefresh?: () => void;
}

interface UseOptimizationHandlerReturn {
  applyOptimization: (_optimizationIndex: number, _aiMetrics: AICacheOptimizationMetrics) => Promise<void>;
}

export const useOptimizationHandler = ({
  onError = (_error: string) => {},
  onSuccess = (_message: string) => {},
  onRefresh,
}: UseOptimizationHandlerOptions): UseOptimizationHandlerReturn => {
  const applyOptimization = useCallback(
    async (optimizationIndex: number, aiMetrics: AICacheOptimizationMetrics) => {
      try {
        if (
          optimizationIndex < 0 ||
          optimizationIndex >= aiMetrics.optimizations.length
        ) {
          onError?.(
            `Invalid optimization index: ${optimizationIndex}. Valid range: 0-${aiMetrics.optimizations.length - 1}`,
          );
          return;
        }

        const optimization = aiMetrics.optimizations[optimizationIndex];
        await monitoringAPI.getPredictiveOptimization({
          optimizationType: optimization.type,
          parameters: {
            description: optimization.description,
            estimatedSavings: optimization.estimatedSavings,
            confidence: optimization.confidence,
          },
        });

        onSuccess?.(
          `Optimization "${optimization.description}" applied successfully`,
        );
        if (onRefresh) {
          await onRefresh();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        onError?.(`Failed to apply optimization: ${errorMessage}`);
      }
    },
    [onError, onSuccess, onRefresh],
  );

  return { applyOptimization };
};
