import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { DeploymentService } from "@/lib/services/deployment-service";
import { GitHubServiceError, githubService } from "@/lib/services/github-service";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";
import { logger } from "@/lib/logger";

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
    handler: async ({ context, user, data }) => {
      const targetDeployment = await DeploymentHistoryService.validateRollbackTarget(
        data!.deploymentId,
        id
      );

      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );

      const { project } = projectDetails;

      const rollbackDeploymentId = await DeploymentHistoryService.createRollbackDeployment(
        id,
        data!.deploymentId,
        data!.reason
      );

      try {
        const latestBlueprint = await ProjectDataService.getLatestBlueprint(id);
        const environmentRepoName = DeploymentService.generateEnvironmentRepoName(
          project.name.replace(/\s+/g, "-").toLowerCase(),
          targetDeployment.environment
        );

        const repo = await githubService.createRepository({
          org: targetDeployment.githubOrg,
          name: environmentRepoName,
          description: `${project.description || "AI-generated software project"} (${targetDeployment.environment} - rollback)`,
          isPrivate: true,
          blueprintContent: latestBlueprint.contentMarkdown,
        });

        await DeploymentService.updateDeploymentRecord(rollbackDeploymentId, {
          githubRepoId: repo.id,
          githubRepoUrl: repo.html_url,
          status: "deployed",
        });

        await DeploymentService.notifyDeploymentStatus(
          rollbackDeploymentId,
          "deployed",
          { operation: "rollback" }
        );

        logger.userAction("Rollback successful", user!.clerkId, {
          requestId: context.requestId,
          projectId: id,
          rollbackDeploymentId,
          targetDeploymentId: data!.deploymentId,
          reason: data!.reason,
        });

        return {
          rollbackDeploymentId,
          repoUrl: repo.html_url,
          repoName: environmentRepoName,
          status: "deployed",
          message: "Rollback completed successfully",
        };
      } catch (error) {
        await DeploymentService.notifyDeploymentStatus(
          rollbackDeploymentId,
          "failed",
          { operation: "rollback" }
        );

        if (error instanceof GitHubServiceError) {
          logger.error("GitHub service error during rollback", {
            requestId: context.requestId,
            userId: user!.clerkId,
            projectId: id,
            statusCode: error.statusCode,
            message: error.message,
          });
        }

        return {
          rollbackDeploymentId,
          status: "failed",
          message: "Rollback failed",
        };
      }
    },
  })(req);
}
