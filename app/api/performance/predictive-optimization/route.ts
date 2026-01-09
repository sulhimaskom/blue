import { z } from "zod";
import { predictiveCacheOptimizer } from "@/lib/services/predictive-cache-optimizer";
import { logger } from "@/lib/logger";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

/**
 * Predictive Cache Optimization API
 * Provides intelligent cache optimization using machine learning-inspired patterns
 *
 * Refactored to use standardized APIRouteHandler pattern for consistency
 */

const CacheWarmingSchema = z.object({
  patterns: z.array(z.string()).min(1, "At least one pattern is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

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
] as const;

type ValidPattern = typeof validPatterns[number];

export const GET = APIRouteHandler.createSimpleCachedGETHandler(
  async (req: any) => {
    logger.info("Predictive cache optimization requested", {
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || "unknown",
    });

    // Perform predictive optimization analysis
    const optimizationResult =
      await predictiveCacheOptimizer.performPredictiveOptimization();

    // Perform advanced memory optimization
    const advancedOptimization =
      await predictiveCacheOptimizer.performAdvancedMemoryOptimization();

    // Get current performance metrics
    const performanceMetrics =
      await predictiveCacheOptimizer.getPerformanceMetrics();

    logger.info("Predictive cache optimization completed", {
      totalOptimizations: optimizationResult.totalOptimizations,
      estimatedImprovement: optimizationResult.estimatedHitRateImprovement,
    });

    return {
      optimization: optimizationResult,
      performance: performanceMetrics,
      advanced: advancedOptimization,
    };
  },
  {
    ttl: 300, // 5 minutes
    tags: ["predictive-optimization"],
    varyBy: [], // Same response for all users
  },
);

/**
 * Trigger on-demand cache warming for specific patterns
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: false,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: CacheWarmingSchema,
  handler: async ({ _context, data }) => {
    const { patterns, priority = "medium" } = data!;

    logger.info("On-demand cache warming requested", {
      patterns,
      priority,
    });

    // Validate patterns
    const invalidPatterns = patterns.filter(
      (p: string) => !validPatterns.includes(p as ValidPattern),
    );
    if (invalidPatterns.length > 0) {
      throw new ValidationError(`Invalid patterns: ${invalidPatterns.join(", ")}`);
    }

    // Perform on-demand warming
    await UnifiedCacheManager.performIntelligentWarming();

    // Invalidate optimization cache to ensure fresh results
    await UnifiedCacheManager.invalidateByTag("predictive-optimization");

    logger.info("On-demand cache warming completed", {
      patterns,
    });

    return {
      patterns,
      priority,
      warmingCompleted: true,
      nextOptimization: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    };
  },
});
