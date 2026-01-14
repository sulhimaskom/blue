import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string; deploymentId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id, deploymentId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({}) => {
      const deployment = await DeploymentHistoryService.getDeploymentById(deploymentId);

      if (!deployment) {
        throw new NotFoundError("Deployment not found");
      }

      if (deployment.projectId !== id) {
        throw new NotFoundError("Deployment does not belong to this project");
      }

      return {
        deployment,
        message: "Deployment details retrieved successfully",
      };
    },
  })(req);
}
