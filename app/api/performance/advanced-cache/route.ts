import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { AdvancedCacheStrategiesService } from "@/lib/services/performance/advanced-cache-strategies-service";
import { RateLimiters } from "@/lib/rate-limit-config";

// Zod schema for POST request body
const advancedCacheOptimizationSchema = z.object({
  config: z.record(z.any()).optional().default({}),
});

/**
 * GET /api/performance/advanced-cache - Get cache analytics
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user: _user }) => {
    const result = await AdvancedCacheStrategiesService.getCacheAnalytics();

    if (!result.success) {
      throw result.error || new Error("Failed to get cache analytics");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});

/**
 * POST /api/performance/advanced-cache - Optimize cache performance
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: advancedCacheOptimizationSchema,
  handler: async ({ context: _context, user: _user, data }) => {
    if (!data) {
      throw new Error("Request data is required");
    }

    const result = await AdvancedCacheStrategiesService.optimizeCachePerformance(data.config);

    if (!result.success) {
      throw result.error || new Error("Failed to optimize cache");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});
