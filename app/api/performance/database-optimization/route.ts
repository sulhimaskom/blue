import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DatabaseQueryOptimizationService } from "@/lib/services/performance/database-query-optimization-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

// Zod schemas for different POST actions
const optimizePoolSchema = z.object({
  action: z.literal("optimize-pool"),
  config: z.record(z.any()).optional().default({}),
});

const optimizeQuerySchema = z.object({
  action: z.literal("optimize-query"),
  query: z.string().min(1, "Query is required for query optimization"),
  parameters: z.array(z.any()).optional().default([]),
  context: z.record(z.any()).optional().default({}),
});

const recordMetricsSchema = z.object({
  action: z.literal("record-metrics"),
  metrics: z.object({
    query: z.string(),
    executionTime: z.number(),
    rowsAffected: z.number(),
    indexUsed: z.boolean(),
    fullTableScan: z.boolean(),
    memoryUsage: z.number(),
    cacheHit: z.boolean(),
    timestamp: z.string(),
    parameters: z.array(z.any()).optional(),
  }),
});

// Union schema for all possible actions
const databaseOptimizationSchema = z.discriminatedUnion("action", [
  optimizePoolSchema,
  optimizeQuerySchema,
  recordMetricsSchema,
]);

/**
 * GET /api/performance/database-optimization - Get database performance metrics
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user: _user, req }) => {
    const url = new URL(req.url);
    const analyzeSlow = url.searchParams.get("analyzeSlow");

    if (analyzeSlow) {
      const threshold = parseInt(url.searchParams.get("threshold") || "1000");
      const result = await DatabaseQueryOptimizationService.analyzeSlowQueries(threshold);

      if (!result.success) {
        throw result.error || new Error("Failed to analyze slow queries");
      }

      return {
        data: result.data,
        metadata: result.metadata,
      };
    }

    const result = await DatabaseQueryOptimizationService.getDatabasePerformanceMetrics();

    if (!result.success) {
      throw result.error || new Error("Failed to get database metrics");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});

/**
 * POST /api/performance/database-optimization - Optimize database performance
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: databaseOptimizationSchema,
  handler: async ({ context: _context, user: _user, data }) => {
    if (!data) {
      throw new ValidationError("Request data is required");
    }

    let result;

    switch (data.action) {
      case "optimize-pool":
        result = await DatabaseQueryOptimizationService.optimizeConnectionPool(data.config);
        break;

      case "optimize-query":
        result = await DatabaseQueryOptimizationService.optimizeQuery(
          data.query,
          data.parameters,
          data.context,
        );
        break;

      case "record-metrics":
        await DatabaseQueryOptimizationService.recordQueryMetrics(data.metrics);
        return { message: "Metrics recorded" };

      default:
        // This should never happen due to Zod validation, but keeping it for type safety
        throw new ValidationError(
          "Invalid action. Supported actions: optimize-pool, optimize-query, record-metrics",
        );
    }

    if (!result.success) {
      throw result.error || new Error("Failed to optimize database");
    }

    return {
      data: result.data,
      metadata: result.metadata,
    };
  },
});
