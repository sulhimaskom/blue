import { PredictivePerformanceAnalyzer } from "@/lib/services/predictive-performance-analyzer";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false, // Performance monitoring can be public
  rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
  handler: async ({ context: _context }) => {
    const predictiveMetrics =
      await PredictivePerformanceAnalyzer.generatePredictiveAnalysis();

    return {
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
    };
  },
});
