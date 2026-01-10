/**
 * AI Cache Optimization API Endpoint
 *
 * Provides real-time metrics and analytics for AI cache optimization,
 * showing cost savings, performance improvements, and cache efficiency.
 *
 * Uses standardized APIRouteHandler pattern with service layer delegation.
 */

import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { aiCacheOptimizationService } from "@/lib/services/ai-cache-optimization-service";

export const GET = APIRouteHandler.createSimpleCachedGETHandler(
  async () => {
    logger.info("AI cache optimization metrics requested", {
      timestamp: new Date().toISOString(),
    });

    const optimizationMetrics = await aiCacheOptimizationService.getOptimizationMetrics();
    const cacheHitRate = await aiCacheOptimizationService.getOverallCacheHitRate();

    return {
      ...optimizationMetrics,
      cacheHitRate: `${cacheHitRate}%`,
    };
  },
  {
    ttl: 60,
    tags: ["ai-cache-optimization"],
    varyBy: [],
  },
);
