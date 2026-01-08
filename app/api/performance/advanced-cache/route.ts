import { NextRequest, NextResponse } from "next/server";
import { AdvancedCacheStrategiesService } from "@/lib/services/performance/advanced-cache-strategies-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/performance/advanced-cache - Get cache analytics
 * POST /api/performance/advanced-cache - Optimize cache performance
 */
export async function GET() {
  try {
    const result = await AdvancedCacheStrategiesService.getCacheAnalytics();

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to get cache analytics",
          details: result.error?.context,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    logger.error("Cache analytics API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const config = body.config || {};

    logger.info("Cache optimization request", { config });

    const result =
      await AdvancedCacheStrategiesService.optimizeCachePerformance(config);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to optimize cache",
          details: result.error?.context,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    logger.error("Cache optimization API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
