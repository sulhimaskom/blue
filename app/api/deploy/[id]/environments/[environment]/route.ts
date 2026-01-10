import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { ValidationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { DeploymentService } from "@/lib/services/deployment-service";


interface RouteParams {
  params: Promise<{ id: string; environment: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id, environment } = await params;

  // Validate environment parameter
  if (!["staging", "preview"].includes(environment)) {
    throw new ValidationError("Only staging and preview environments can be deleted");
  }

  return APIRouteHandler.createDELETEHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user }) => {
      await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );

      

      // Get deployment record
      const deployment = await DeploymentService.checkExistingDeployment(id, environment);
      if (!deployment) {
        throw new ValidationError(`${environment} deployment not found`);
      }

      // Soft delete the deployment record
      await DeploymentService.deleteDeployment(deployment.id);

      logger.userAction("Environment deletion successful", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        environment,
        deploymentId: deployment.id,
      });

      return {
        projectId: id,
        environment,
        deploymentId: deployment.id,
        message: `${environment} environment deleted successfully`,
        deletedAt: new Date().toISOString(),
      };
    },
  })(req);
}