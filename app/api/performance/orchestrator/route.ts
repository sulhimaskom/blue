import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { performanceOrchestratorService } from "@/lib/services/performance/performance-orchestrator-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

// Zod schema for POST request body
const performanceOrchestratorSchema = z.object({
  action: z.string().min(1, "Action is required"),
  service: z.string().optional(),
  config: z.record(z.any()).optional().default({}),
});

/**
 * GET /api/performance/orchestrator - Get current performance status
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context: _context, user: _user, req }) => {
    const url = new URL(req.url);
    const service = url.searchParams.get("service");

    const result = await performanceOrchestratorService.getOrchestratorStatus(service);

    return {
      data: result.data,
      timestamp: result.timestamp,
      service: result.service,
    };
  },
});

/**
 * POST /api/performance/orchestrator - Execute optimization workflow
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: performanceOrchestratorSchema,
  handler: async ({ context: _context, user: _user, data }) => {
    if (!data) {
      throw new ValidationError("Request data is required");
    }

    const result = await performanceOrchestratorService.executeOptimizationWorkflow(
      data.action,
      data.service,
      data.config,
    );

    return { data: result };
  },
});
