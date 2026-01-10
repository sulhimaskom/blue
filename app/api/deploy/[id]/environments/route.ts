import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ProjectDataService } from "@/lib/services/project-data-service";

import { DeploymentService } from "@/lib/services/deployment-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );
      
      const projectDeployments = await DeploymentService.getProjectDeployments(id);

      logger.userAction("Project environments fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        environmentCount: projectDeployments.length,
      });

      return {
        projectId: projectDetails.project.id,
        projectName: projectDetails.project.name,
        environments: projectDeployments.map(deployment => ({
          deploymentId: deployment.id,
          environment: deployment.environment,
          repoUrl: deployment.githubRepoUrl,
          repoName: deployment.githubRepoName,
          status: deployment.status,
          blueprintVersion: deployment.blueprintVersion,
          createdAt: deployment.createdAt,
          expiresAt: deployment.expiresAt,
          canPromote: deployment.environment === "staging" && deployment.status === "deployed",
          isExpired: deployment.expiresAt && new Date(deployment.expiresAt) < new Date(),
        })),
      };
    },
  })(req);
}