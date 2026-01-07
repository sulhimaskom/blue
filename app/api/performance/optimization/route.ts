import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { getCompressionStats } from "@/lib/middleware/compression-wrapper";
import { performanceOptimizationService } from "@/lib/services/performance-optimization-service";
import { RateLimiters } from "@/lib/rate-limit-config";

export async function GET(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.standard()(identifier);

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
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }

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
          { name: "main", size: 102400, gzipSize: 35840, modules: 24 },
          {
            name: "dashboard-monitoring",
            size: 258000,
            gzipSize: 90800,
            modules: 18,
          },
          { name: "vendors", size: 81920, gzipSize: 28672, modules: 47 },
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
}
