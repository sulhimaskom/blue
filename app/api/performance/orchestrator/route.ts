import { NextRequest, NextResponse } from "next/server";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { AIMemoryOptimizationService } from "@/lib/services/performance/ai-memory-optimization-service";
import { AdvancedCacheStrategiesService } from "@/lib/services/performance/advanced-cache-strategies-service";
import { DatabaseQueryOptimizationService } from "@/lib/services/performance/database-query-optimization-service";
import { logger } from "@/lib/logger";

/**
 * Comprehensive performance optimization orchestrator API
 *
 * GET /api/performance/orchestrator - Get current performance status
 * POST /api/performance/orchestrator - Execute optimization workflow
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const service = url.searchParams.get("service"); // memory, cache, database, all

    const result: Record<string, unknown> = {};

    if (!service || service === "all" || service === "memory") {
      const memoryHealth =
        await AIMemoryOptimizationService.getAIMemoryHealth();
      result.memory = memoryHealth.success
        ? memoryHealth.data
        : { error: memoryHealth.error?.message };
    }

    if (!service || service === "all" || service === "cache") {
      const cacheAnalytics =
        await AdvancedCacheStrategiesService.getCacheAnalytics();
      const cacheStats = await UnifiedCacheManager.getCacheStats();
      result.cache = cacheAnalytics.success
        ? {
            ...cacheAnalytics.data,
            orchestratorStats: cacheStats,
          }
        : { error: cacheAnalytics.error?.message };
    }

    if (!service || service === "all" || service === "database") {
      const dbMetrics =
        await DatabaseQueryOptimizationService.getDatabasePerformanceMetrics();
      result.database = dbMetrics.success
        ? dbMetrics.data
        : { error: dbMetrics.error?.message };
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      service: service || "all",
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

    const results: Record<string, unknown> = {};
    let optimizationsExecuted = 0;

    try {
      // Memory optimization
      if (!service || service === "all" || service === "memory") {
        const memoryOpt = await AIMemoryOptimizationService.optimizeAIMemory(
          config?.memory,
        );
        results.memory = {
          success: memoryOpt.success,
          optimizations: memoryOpt.data?.optimizations || [],
          memoryFreed: memoryOpt.data?.memoryFreed || 0,
          error: memoryOpt.error?.message,
        };
        if (memoryOpt.success) optimizationsExecuted++;
      }

      // Cache optimization
      if (!service || service === "all" || service === "cache") {
        const cacheOpt =
          await AdvancedCacheStrategiesService.optimizeCachePerformance(
            config?.cache,
          );
        results.cache = {
          success: cacheOpt.success,
          optimizations: cacheOpt.data?.optimizations || [],
          memoryFreed: cacheOpt.data?.memoryFreed || 0,
          hitRateImprovement: cacheOpt.data?.hitRateImprovement || 0,
          error: cacheOpt.error?.message,
        };
        if (cacheOpt.success) optimizationsExecuted++;
      }

      // Database optimization
      if (!service || service === "all" || service === "database") {
        const dbOpt =
          await DatabaseQueryOptimizationService.optimizeConnectionPool(
            config?.database,
          );
        results.database = {
          success: dbOpt.success,
          optimizations: dbOpt.data?.optimizations || [],
          improvements: dbOpt.data?.improvements || {},
          error: dbOpt.error?.message,
        };
        if (dbOpt.success) optimizationsExecuted++;
      }

      // Global cache warming if requested
      if (action === "full-optimization") {
        await UnifiedCacheManager.performIntelligentWarming();
        results.globalWarming = {
          success: true,
          message: "Intelligent cache warming executed",
        };
      }

      // Calculate overall performance score improvement estimation
      const estimatedImprovement = calculateEstimatedImprovement(results);

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            optimizationsExecuted,
            estimatedImprovement,
            servicesOptimized: Object.keys(results).length,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error("Performance optimization workflow error", { error });
      return NextResponse.json(
        {
          error: "Optimization workflow failed",
          details: error instanceof Error ? error.message : error,
          partialResults: results,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Performance orchestrator POST error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Calculate estimated performance improvement based on optimization results
 */
function calculateEstimatedImprovement(results: Record<string, unknown>): number {
  let improvement = 0;

  const memoryResult = results.memory as {
    success?: boolean;
    memoryFreed?: number;
  } | undefined;

  const cacheResult = results.cache as {
    success?: boolean;
    hitRateImprovement?: number;
    memoryFreed?: number;
  } | undefined;

  const dbResult = results.database as {
    success?: boolean;
    improvements?: Record<string, number>;
  } | undefined;

  // Memory optimization impact (30% weight)
  if (memoryResult && memoryResult.success) {
    const memoryFreed = memoryResult.memoryFreed || 0;
    improvement += Math.min(30, memoryFreed * 0.5);
  }

  // Cache optimization impact (40% weight)
  if (cacheResult && cacheResult.success) {
    const hitRateImprovement = cacheResult.hitRateImprovement || 0;
    const cacheMemoryFreed = cacheResult.memoryFreed || 0;
    improvement += Math.min(
      40,
      hitRateImprovement * 2 + cacheMemoryFreed * 0.3,
    );
  }

  // Database optimization impact (30% weight)
  if (dbResult && dbResult.success) {
    const dbImprovements = Object.values(dbResult.improvements || {}) as (number | undefined)[];
    const totalDBImprovement = dbImprovements.reduce(
      (sum: number, val: number | undefined) => sum + (val || 0),
      0,
    );
    improvement += Math.min(30, totalDBImprovement * 0.1);
  }

  return Math.round(Math.min(100, Math.max(0, improvement)));
}
