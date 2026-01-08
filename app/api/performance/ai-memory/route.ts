import { NextRequest, NextResponse } from "next/server";
import { AIMemoryOptimizationService } from "@/lib/services/performance/ai-memory-optimization-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/performance/ai-memory - Get AI memory metrics
 * POST /api/performance/ai-memory - Optimize AI memory
 */
export async function GET() {
  try {
    const result = await AIMemoryOptimizationService.getAIMemoryMetrics();

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to get memory metrics",
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
    logger.error("AI memory metrics API error", { error });
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

    logger.info("AI memory optimization request", { config });

    const result = await AIMemoryOptimizationService.optimizeAIMemory(config);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || "Failed to optimize memory",
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
    logger.error("AI memory optimization API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
