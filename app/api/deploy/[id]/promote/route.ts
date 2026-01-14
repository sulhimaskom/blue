import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { ValidationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { DeploymentService } from "@/lib/services/deployment-service";
import { GitHubServiceError, githubService } from "@/lib/services/github-service";

const promoteEnvironmentSchema = z.object({
  targetEnvironment: z.enum(["production"]),
  validationRequired: z.boolean().default(true),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    schema: promoteEnvironmentSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.strict()(identifier),
    handler: async ({ context, user, data }) => {
      const { validationRequired } = data!;

      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );

      const { project } = projectDetails;

      const stagingDeployment = await DeploymentService.checkExistingDeployment(id, "staging");
      if (!stagingDeployment || stagingDeployment.status !== "deployed") {
        throw new ValidationError("Valid staging deployment required for promotion");
      }

      const existingProduction = await DeploymentService.checkExistingDeployment(id, "production");
      if (existingProduction) {
        throw new ValidationError("Production deployment already exists");
      }

      if (validationRequired) {
        const latestBlueprint = await ProjectDataService.getLatestBlueprint(id);
        if (latestBlueprint.version !== stagingDeployment.blueprintVersion) {
          throw new ValidationError("Blueprint version mismatch between staging and latest");
        }
      }

      const productionRepoName = stagingDeployment.githubRepoName.replace("-staging", "");
      const productionDeploymentId = await DeploymentService.createDeploymentRecord({
        projectId: id,
        environment: "production",
        githubOrg: stagingDeployment.githubOrg,
        githubRepoName: productionRepoName,
        blueprintVersion: stagingDeployment.blueprintVersion,
      });

      try {
        const repo = await githubService.createRepository({
          org: stagingDeployment.githubOrg,
          name: productionRepoName,
          description: `${project.description || "AI-generated software project"} (production)`,
          isPrivate: true,
          blueprintContent: await (await ProjectDataService.getLatestBlueprint(id)).contentMarkdown,
        });

        await DeploymentService.updateDeploymentRecord(productionDeploymentId, {
          githubRepoId: repo.id,
          githubRepoUrl: repo.html_url,
          status: "deployed",
        });

        await DeploymentService.notifyDeploymentStatus(
          productionDeploymentId,
          "deployed",
          { operation: "promote", fromEnvironment: "staging" }
        );

        await ProjectDataService.updateProjectDeployment(id, repo.html_url);

        logger.userAction("Environment promotion successful", user!.clerkId, {
          requestId: context.requestId,
          projectId: id,
          fromEnvironment: "staging",
          toEnvironment: "production",
          stagingDeploymentId: stagingDeployment.id,
          productionDeploymentId,
        });

        return {
          projectId: id,
          fromEnvironment: "staging",
          toEnvironment: "production",
          deploymentId: productionDeploymentId,
          repoUrl: repo.html_url,
          repoName: productionRepoName,
          status: "deployed",
          message: "Environment promotion successful",
          promotedAt: new Date().toISOString(),
        };
      } catch (error) {
        await DeploymentService.notifyDeploymentStatus(
          productionDeploymentId,
          "failed",
          { operation: "promote", fromEnvironment: "staging" }
        );

        if (error instanceof GitHubServiceError) {
          logger.error("GitHub service error during promotion", {
            requestId: context.requestId,
            userId: user!.clerkId,
            projectId: id,
            statusCode: error.statusCode,
            message: error.message,
          });
          throw new ValidationError(`GitHub promotion failed: ${error.message}`);
        }

        throw error;
      }
    },
  })(req);
}