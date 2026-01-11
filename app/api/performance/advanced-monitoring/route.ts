import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { advancedPerformanceMonitoringService } from "@/lib/services/advanced-performance-monitoring-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

// Zod schema for POST request body
const performanceMonitoringSchema = z.object({
  action: z.enum(["analyze", "optimize"]),
});

/**
 * GET /api/performance/advanced-monitoring - Get performance monitoring reports
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user: _user, req }) => {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "summary":
        return advancedPerformanceMonitoringService.getPerformanceSummary();
      case "recommendations":
        return advancedPerformanceMonitoringService.getOptimizationRecommendations();
      case "build-optimizations":
        return advancedPerformanceMonitoringService.getBuildOptimizations();
      default:
        return advancedPerformanceMonitoringService.getComprehensiveReport();
    }
  },
});

/**
 * POST /api/performance/advanced-monitoring - Perform performance analysis and optimization
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: performanceMonitoringSchema,
  handler: async ({ context: _context, user: _user, data }) => {
    if (!data) {
      throw new ValidationError("Request data is required");
    }

    switch (data.action) {
      case "analyze":
        return advancedPerformanceMonitoringService.analyzePerformance();
      case "optimize":
        return advancedPerformanceMonitoringService.applyOptimizations();
      default:
        // This should never happen due to Zod validation, but keeping it for type safety
        throw new ValidationError("Invalid action. Supported actions: analyze, optimize");
    }
  },
});
