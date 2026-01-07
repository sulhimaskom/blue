import { NextRequest, NextResponse } from "next/server";
import { predictiveCacheOptimizer } from "@/lib/services/predictive-cache-optimizer";
import { logger } from "@/lib/logger";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIResponseService } from "@/lib/services/api-response-service";
import { RateLimiters } from "@/lib/rate-limit-config";

/**
 * Predictive Cache Optimization API
 * Provides intelligent cache optimization using machine learning-inspired patterns
 *
 * Refactored to use standardized API response service
 */

export async function GET(request: NextRequest) {
  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.standard()(identifier);

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }
  const { requestId, startTime } = APIResponseService.generateRequestContext();

  try {
    logger.info("Predictive cache optimization requested", {
      requestId,
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
      logger.debug("Returning cached optimization results", { requestId });

      const response = APIResponseService.createSuccessResponse(
        requestId,
        startTime,
        {
          data: cachedResult,
          additionalMetadata: { cached: true },
        },
      );

      return NextResponse.json(response);
    }

    // Perform predictive optimization analysis
    const optimizationResult =
      await predictiveCacheOptimizer.performPredictiveOptimization();

    // Perform advanced memory optimization
    const advancedOptimization =
      await predictiveCacheOptimizer.performAdvancedMemoryOptimization();

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

    const data = {
      optimization: optimizationResult,
      performance: performanceMetrics,
      advanced: advancedOptimization,
    };

    const response = APIResponseService.createSuccessResponse(
      requestId,
      startTime,
      {
        data,
        additionalMetadata: { cached: false },
      },
    );

    logger.info("Predictive cache optimization completed", {
      requestId,
      totalOptimizations: optimizationResult.totalOptimizations,
      estimatedImprovement: optimizationResult.estimatedHitRateImprovement,
    });

    return NextResponse.json(response);
  } catch (error) {
    return APIResponseService.createErrorResponse(
      requestId,
      startTime,
      error instanceof Error ? error.message : "Unknown error",
      { status: 500 },
    );
  }
}

/**
 * Trigger on-demand cache warming for specific patterns
 */
export async function POST(request: NextRequest) {
  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.moderate()(identifier);

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }

  const { requestId, startTime } = APIResponseService.generateRequestContext();

  try {
    const body = await request.json();
    const { patterns, priority = "medium" } = body;

    logger.info("On-demand cache warming requested", {
      requestId,
      patterns,
      priority,
      userAgent: request.headers.get("user-agent"),
    });

    if (!patterns || !Array.isArray(patterns)) {
      return APIResponseService.createErrorResponse(
        requestId,
        startTime,
        "Invalid request: patterns array is required",
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
      return APIResponseService.createErrorResponse(
        requestId,
        startTime,
        `Invalid patterns: ${invalidPatterns.join(", ")}`,
        {
          status: 400,
          context: { invalidPatterns, validPatterns },
        },
      );
    }

    // Perform on-demand warming
    await UnifiedCacheManager.performIntelligentWarming();

    // Invalidate optimization cache to ensure fresh results
    await UnifiedCacheManager.invalidateByTag("predictive-optimization");

    const data = {
      patterns,
      priority,
      warmingCompleted: true,
      nextOptimization: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    };

    const response = APIResponseService.createSuccessResponse(
      requestId,
      startTime,
      {
        data,
      },
    );

    logger.info("On-demand cache warming completed", {
      requestId,
      patterns,
    });

    return NextResponse.json(response);
  } catch (error) {
    return APIResponseService.createErrorResponse(
      requestId,
      startTime,
      error instanceof Error ? error.message : "Cache warming failed",
      { status: 500 },
    );
  }
}
