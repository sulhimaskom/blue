import { NextRequest, NextResponse } from "next/server";
import { DatabaseQueryOptimizationService } from "@/lib/services/performance/database-query-optimization-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/performance/database-optimization - Get database performance metrics
 * POST /api/performance/database-optimization - Optimize database performance
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const analyzeSlow = url.searchParams.get("analyzeSlow");

    if (analyzeSlow) {
      const threshold = parseInt(url.searchParams.get("threshold") || "1000");
      const result =
        await DatabaseQueryOptimizationService.analyzeSlowQueries(threshold);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error?.message || "Failed to analyze slow queries",
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
    }

    const result =
      await DatabaseQueryOptimizationService.getDatabasePerformanceMetrics();

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to get database metrics",
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
    logger.error("Database performance API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, config, query, parameters, context } = body;

    let result;

    switch (action) {
      case "optimize-pool":
        result =
          await DatabaseQueryOptimizationService.optimizeConnectionPool(config);
        break;

      case "optimize-query":
        if (!query) {
          return NextResponse.json(
            { error: "Query is required for query optimization" },
            { status: 400 },
          );
        }
        result = await DatabaseQueryOptimizationService.optimizeQuery(
          query,
          parameters,
          context,
        );
        break;

      case "record-metrics":
        if (!body.metrics) {
          return NextResponse.json(
            { error: "Metrics are required for recording" },
            { status: 400 },
          );
        }
        await DatabaseQueryOptimizationService.recordQueryMetrics(body.metrics);
        result = { success: true, message: "Metrics recorded" };
        break;

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Supported actions: optimize-pool, optimize-query, record-metrics",
          },
          { status: 400 },
        );
    }

    if (result && !result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to optimize database",
          details: result.error?.context,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result?.data,
      metadata: result?.metadata,
    });
  } catch (error) {
    logger.error("Database optimization API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
