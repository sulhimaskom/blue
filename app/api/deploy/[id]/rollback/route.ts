import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";

const rollbackSchema = z.object({
  deploymentId: z.string().uuid("Invalid deployment ID"),
  reason: z.string().min(1, "Rollback reason is required").max(500, "Reason too long"),
});

export type RollbackInput = z.infer<typeof rollbackSchema>;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler<RollbackInput>({
    schema: rollbackSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ data }) => {
      const rollbackDeploymentId = await DeploymentHistoryService.createRollbackDeployment(
        id,
        "production",
        data!.deploymentId,
        data!.reason
      );

      return {
        rollbackDeploymentId,
        message: "Rollback initiated successfully",
      };
    },
  })(req);
}
