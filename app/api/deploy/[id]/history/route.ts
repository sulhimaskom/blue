import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";

const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "deployed", "failed", "deleted"]).optional(),
  environment: z.enum(["production", "staging", "preview"]).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ req }) => {
      const validatedQuery = historyQuerySchema.parse(
        Object.fromEntries(req.nextUrl.searchParams.entries())
      );

      const result = await DeploymentHistoryService.getDeploymentHistory(
        id,
        validatedQuery.page,
        validatedQuery.pageSize,
        {
          status: validatedQuery.status,
          environment: validatedQuery.environment,
        }
      );

      return {
        ...result,
        message: "Deployment history retrieved successfully",
      };
    },
  })(req);
}
