import { NextResponse } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIMetricsService } from "@/lib/services/api-metrics-service";

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
          return NextResponse.json(comprehensiveMetrics);
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
