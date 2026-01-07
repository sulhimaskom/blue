import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { getCompressionStats } from "@/lib/middleware/compression-wrapper";
import { RateLimiters } from "@/lib/rate-limit-config";

export async function GET(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.permissive()(identifier);

  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }

  return APIRouteHandler.createSimpleCachedGETHandler(
    async (req: NextRequest) => {
      const { searchParams } = new URL(req.url);
      const metricName = searchParams.get("metric");
      const summary = searchParams.get("summary") === "true";
      const limit = parseInt(searchParams.get("limit") || "100");

      if (summary && metricName) {
        // Get metric summary from service
        const metricSummary = APIMetricsService.getMetricSummary(metricName);
        return metricSummary;
      } else if (metricName) {
        // Get specific metric data from service
        const metricData = APIMetricsService.getMetricData(metricName, limit);
        return metricData;
      } else {
        // Get comprehensive metrics from service
        const comprehensiveMetrics =
          await APIMetricsService.getComprehensiveMetrics(limit);

        // Include database query cache statistics
        const dbCacheStats = DatabaseQueryCache.getCacheStats();
        const dbCacheSavings = DatabaseQueryCache.calculateCostSavings();

        // Include compression analytics
        const compressionStats = getCompressionStats();

        const enhancedMetrics = {
          ...comprehensiveMetrics,
          databaseQueryCache: {
            ...dbCacheStats,
            hitRatePercent: Math.round(dbCacheStats.hitRate * 100),
            costSavings: dbCacheSavings,
          },
          responseCompression: {
            ...compressionStats.compressor,
            compressionRatePercent: Math.round(
              compressionStats.metrics.compressionRate * 100,
            ),
            bandwidthSavedKB: Math.round(
              compressionStats.metrics.bandwidthSaved / 1024,
            ),
            totalBandwidthReduction:
              Math.round(
                compressionStats.metrics.totalBandwidthReduction * 100,
              ) / 100,
            avgCompressionRatio:
              Math.round(compressionStats.metrics.avgCompressionRatio * 100) /
              100,
            circuitBreaker: {
              state: compressionStats.circuit.metrics.state,
              isAvailable: compressionStats.circuit.isAvailable,
              failureCount: compressionStats.circuit.metrics.failureCount,
              successCount: compressionStats.circuit.metrics.successCount,
            },
          },
        };

        return enhancedMetrics;
      }
    },
    {
      ttl: 30, // Optimized: Balanced 30 seconds for fresh data with good cache hit rates
      tags: ["metrics", "performance-data", "dashboard"],
      varyBy: [], // Metrics are the same for all users
      initializeServices: true, // Enable runtime service initialization
    },
  )(req);
}
