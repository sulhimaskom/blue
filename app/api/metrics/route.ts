import { NextResponse } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  handler: async ({ req }) => {
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

          const enhancedMetrics = {
            ...comprehensiveMetrics,
            databaseQueryCache: {
              ...dbCacheStats,
              hitRatePercent: Math.round(dbCacheStats.hitRate * 100),
              costSavings: dbCacheSavings,
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
  },
});
