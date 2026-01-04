import { NextRequest, NextResponse } from "next/server";
import { predictiveCacheOptimizer } from "@/lib/services/predictive-cache-optimizer";
import { logger } from "@/lib/logger";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";

/**
 * Predictive Cache Optimization API
 * Provides intelligent cache optimization using machine learning-inspired patterns
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info("Predictive cache optimization requested", {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    // Check cache for recent optimization results
    const cachedResult = await UnifiedCacheManager.getData(
      "predictive-optimization",
      { type: "latest" },
      { ttl: 300 }, // 5 minutes cache
    );

    if (cachedResult) {
      logger.debug("Returning cached optimization results");
      return NextResponse.json({
        success: true,
        cached: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        data: cachedResult,
      });
    }

    // Perform predictive optimization analysis
    const optimizationResult =
      await predictiveCacheOptimizer.performPredictiveOptimization();

    // Get current performance metrics
    const performanceMetrics =
      await predictiveCacheOptimizer.getPerformanceMetrics();

    // Cache the optimization results
    await UnifiedCacheManager.cacheData(
      "predictive-optimization",
      { type: "latest" },
      optimizationResult,
      { ttl: 300 },
    );

    const response = {
      success: true,
      cached: false,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      data: {
        optimization: optimizationResult,
        performance: performanceMetrics,
      },
    };

    logger.info("Predictive cache optimization completed", {
      totalOptimizations: optimizationResult.totalOptimizations,
      estimatedImprovement: optimizationResult.estimatedHitRateImprovement,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Predictive cache optimization failed", {
      error: errorMessage,
      duration: Date.now() - startTime,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Cache optimization failed",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Trigger on-demand cache warming for specific patterns
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { patterns, priority = "medium" } = body;

    logger.info("On-demand cache warming requested", {
      patterns,
      priority,
      userAgent: request.headers.get("user-agent"),
    });

    if (!patterns || !Array.isArray(patterns)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "patterns array is required",
        },
        { status: 400 },
      );
    }

    // Validate patterns
    const validPatterns = [
      "marketplace",
      "ecommerce",
      "social",
      "dashboard",
      "api-service",
      "mobile-app",
      "fintech",
      "healthcare",
      "edtech",
      "realestate",
      "logistics",
      "saas",
    ];

    const invalidPatterns = patterns.filter((p) => !validPatterns.includes(p));
    if (invalidPatterns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid patterns",
          message: `Invalid patterns: ${invalidPatterns.join(", ")}`,
          validPatterns,
        },
        { status: 400 },
      );
    }

    // Perform on-demand warming
    await UnifiedCacheManager.performIntelligentWarming();

    // Invalidate optimization cache to ensure fresh results
    await UnifiedCacheManager.invalidateByTag("predictive-optimization");

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      data: {
        patterns,
        priority,
        warmingCompleted: true,
        nextOptimization: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      },
    };

    logger.info("On-demand cache warming completed", {
      patterns,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("On-demand cache warming failed", {
      error: errorMessage,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Cache warming failed",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
