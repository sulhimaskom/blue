import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withRateLimiter } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { advancedPerformanceMonitoringService } from "@/lib/services/advanced-performance-monitoring-service";

/**
 * Advanced Performance Monitoring API
 *
 * Provides comprehensive performance analysis, optimization recommendations,
 * and real-time monitoring capabilities for production systems.
 *
 * Route handler delegates all business logic to AdvancedPerformanceMonitoringService
 * to maintain perfect Service Layer compliance.
 */

async function handlePerformanceMonitoring(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "summary":
        return NextResponse.json(
          advancedPerformanceMonitoringService.getPerformanceSummary(),
        );
      case "recommendations":
        return NextResponse.json(
          advancedPerformanceMonitoringService.getOptimizationRecommendations(),
        );
      case "build-optimizations":
        return NextResponse.json(
          advancedPerformanceMonitoringService.getBuildOptimizations(),
        );
      default:
        return NextResponse.json(
          advancedPerformanceMonitoringService.getComprehensiveReport(),
        );
    }
  } catch (error) {
    logger.error("Performance monitoring error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export with rate limiting
export const GET = async (request: NextRequest) => {
  return withRateLimiter(request, "standard", async () => {
    return handlePerformanceMonitoring(request);
  });
};

export const POST = async (request: NextRequest) => {
  return withRateLimiter(request, "moderate", async () => {
    try {
      const body = await request.json();
      const { action } = body;

      switch (action) {
        case "analyze":
          return NextResponse.json(
            advancedPerformanceMonitoringService.analyzePerformance(),
          );

        case "optimize":
          return NextResponse.json(
            advancedPerformanceMonitoringService.applyOptimizations(),
          );

        default:
          return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 },
          );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
  });
};
