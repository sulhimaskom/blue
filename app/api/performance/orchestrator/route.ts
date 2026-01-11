import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { performanceOrchestratorService } from "@/lib/services/performance/performance-orchestrator-service";

/**
 * Comprehensive performance optimization orchestrator API
 *
 * GET /api/performance/orchestrator - Get current performance status
 * POST /api/performance/orchestrator - Execute optimization workflow
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const service = url.searchParams.get("service");

    const result = await performanceOrchestratorService.getOrchestratorStatus(
      service,
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: result.timestamp,
      service: result.service,
    });
  } catch (error) {
    logger.error("Performance orchestrator API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, service, config } = body;

    logger.info("Performance orchestrator request", {
      action,
      service,
      config,
    });

    const result = await performanceOrchestratorService.executeOptimizationWorkflow(
      action,
      service,
      config,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Performance orchestrator POST error", { error });
    return NextResponse.json(
      {
        error: "Optimization workflow failed",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 },
    );
  }
}
