import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { ValidationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

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

      // Import deployment service
      const { DeploymentService } = await import("@/lib/services/deployment-service");

// Get staging deployment
        const stagingDeployment = await DeploymentService.checkExistingDeployment(id, "staging");
        if (!stagingDeployment || stagingDeployment.status !== "deployed") {
          throw new ValidationError("Valid staging deployment required for promotion");
        }

        // Check for existing production deployment
        const existingProduction = await DeploymentService.checkExistingDeployment(id, "production");
        if (existingProduction) {
          throw new ValidationError("Production deployment already exists");
        }

        // Validate blueprint integrity if required
        if (validationRequired) {
          const latestBlueprint = await ProjectDataService.getLatestBlueprint(id);
          if (latestBlueprint.version !== stagingDeployment.blueprintVersion) {
            throw new ValidationError("Blueprint version mismatch between staging and latest");
          }
        }

        // Create production deployment by copying staging
        const productionDeploymentId = await DeploymentService.createDeploymentRecord({
          projectId: id,
          environment: "production",
          githubOrg: stagingDeployment.githubOrg,
          githubRepoName: stagingDeployment.githubRepoName.replace("-staging", ""),
          blueprintVersion: stagingDeployment.blueprintVersion,
        });

      // Update project status
      projectDetails.project.repoUrl = stagingDeployment.githubRepoUrl;
      await ProjectDataService.updateProjectDeployment(id, stagingDeployment.githubRepoUrl);

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
        message: "Environment promotion successful",
        promotedAt: new Date().toISOString(),
      };
    },
  })(req);
}