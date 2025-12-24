import { NextResponse, NextRequest } from "next/server";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import {
  getCompressionStats,
  withCompression,
} from "@/lib/middleware/compression-wrapper";

export async function GET(req: NextRequest) {
  // eslint-disable-next-line no-unused-vars
  return withCompression(async () => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        const { searchParams } = new URL(req.url);
        const metricName = searchParams.get("metric");
        const summary = searchParams.get("summary") === "true";
        const limit = parseInt(searchParams.get("limit") || "100");

        if (summary && metricName) {
          // Get metric summary from service
          const metricSummary = APIMetricsService.getMetricSummary(metricName);
          return NextResponse.json(metricSummary);
        } else if (metricName) {
          // Get specific metric data from service
          const metricData = APIMetricsService.getMetricData(metricName, limit);
          return NextResponse.json(metricData);
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

          return NextResponse.json(enhancedMetrics);
        }
      },
      {
        ttl: 10, // Cache for 10 seconds - metrics change frequently
        tags: ["metrics", "performance-data"],
        varyBy: [], // Metrics are the same for all users
      },
    );
  }, req);
}
