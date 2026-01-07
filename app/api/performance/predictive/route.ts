import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { PredictivePerformanceAnalyzer } from "@/lib/services/predictive-performance-analyzer";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false, // Performance monitoring can be public
  rateLimiter: (identifier: string) =>
    RateLimiters.performanceGet()(identifier),
  handler: async ({ context }) => {
    logger.info("Generating predictive performance analytics", {
      requestId: context.requestId,
    });

    try {
      const predictiveMetrics =
        await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

      return NextResponse.json({
        success: true,
        data: {
          healthScore: predictiveMetrics.healthScore,
          nextAction: predictiveMetrics.nextAction,
          predictions: predictiveMetrics.predictions.slice(0, 10), // Top 10 predictions
          anomalies: predictiveMetrics.anomalies.slice(0, 5), // Top 5 anomalies
          optimizations: predictiveMetrics.optimizations.slice(0, 5), // Top 5 optimizations
          metadata: {
            generatedAt: new Date().toISOString(),
            historicalDataSize:
              PredictivePerformanceAnalyzer.getHistoricalDataSize(),
            analysisType: "predictive-performance",
          },
        },
      });
    } catch (error) {
      logger.error("Failed to generate predictive analytics", {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate predictive analytics",
          message: "Performance monitoring system unavailable",
        },
        { status: 500 },
      );
    }
  },
});
