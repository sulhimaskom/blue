import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { getCompressionStats } from "@/lib/middleware/compression-wrapper";
import { performanceOptimizationService } from "@/lib/services/performance-optimization-service";
import { withRateLimiter } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  return withRateLimiter(req, "standard", async () => {
    return APIRouteHandler.createSimpleCachedGETHandler(
      async (req: NextRequest) => {
        const { searchParams } = new URL(req.url);
        const detailed = searchParams.get("detailed") === "true";
        const optimize = searchParams.get("optimize") === "true";

        const performanceReport =
          performanceMonitorService.getPerformanceReport();
        const compressionStats = getCompressionStats();
        const bundleAnalysis = performanceMonitorService.analyzeBundle({
          chunks: [
            { name: "main", size: 102400, gzipSize: 35840, modules: Array.from({ length: 24 }, () => ({})) },
            {
              name: "dashboard-monitoring",
              size: 258000,
              gzipSize: 90800,
              modules: Array.from({ length: 18 }, () => ({})),
            },
            { name: "vendors", size: 81920, gzipSize: 28672, modules: Array.from({ length: 47 }, () => ({})) },
          ],
        });

        let response = performanceOptimizationService.buildOptimizationResponse(
          performanceReport,
          bundleAnalysis,
          compressionStats,
          false,
        );

        if (optimize) {
          await performanceOptimizationService.applyAutoOptimizations(
            performanceReport,
          );
          response.optimization.autoOptimizations = true;
        }

        return detailed
          ? response
          : performanceOptimizationService.simplifyResponse(response);
      },
      {
        ttl: 60,
        tags: ["performance", "optimization", "monitoring"],
        varyBy: [],
        initializeServices: true,
      },
    )(req);
  });
}
