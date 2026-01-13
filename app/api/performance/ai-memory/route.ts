import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { AIMemoryOptimizationService } from "@/lib/services/performance/ai-memory-optimization-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, DatabaseError } from "@/lib/api-utils";

// Zod schema for POST request body
const aiMemoryOptimizationSchema = z.object({
  config: z.record(z.any()).optional().default({}),
});

/**
 * GET /api/performance/ai-memory - Get AI memory metrics
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user: _user }) => {
    const result = await AIMemoryOptimizationService.getAIMemoryMetrics();

    if (!result.success) {
      throw result.error || new DatabaseError("Failed to get memory metrics");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});

/**
 * POST /api/performance/ai-memory - Optimize AI memory
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: aiMemoryOptimizationSchema,
  handler: async ({ context: _context, user: _user, data }) => {
    if (!data) {
      throw new ValidationError("Request data is required");
    }

    const result = await AIMemoryOptimizationService.optimizeAIMemory(data.config);

    if (!result.success) {
      throw result.error || new DatabaseError("Failed to optimize memory");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});
