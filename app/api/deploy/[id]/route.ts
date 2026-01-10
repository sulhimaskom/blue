import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  githubService,
  GitHubServiceError,
} from "@/lib/services/github-service";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ValidationError } from "@/lib/api-utils";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { DeploymentService } from "@/lib/services/deployment-service";

const deployRepoSchema = z.object({
  githubOrg: z
    .string()
    .min(2, "GitHub organization must be at least 2 characters"),
  repoName: z
    .string()
    .min(3, "Repository name must be at least 3 characters")
    .max(100),
  isPrivate: z.boolean().default(false),
  environment: z.enum(["production", "staging", "preview"]).default("production"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    schema: deployRepoSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user, data }) => {
      const { githubOrg, repoName, isPrivate, environment } = data!;

      // Verify user owns the project
      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );
      const { project } = projectDetails;

// Check if deployment already exists for this environment
      const existingDeployment = await DeploymentService.checkExistingDeployment(id, environment!);
      if (existingDeployment) {
        throw new ValidationError(`Project already has a ${environment} deployment`);
      }

      // For production deployment, validate staging exists
      if (environment === "production") {
        const stagingDeployment = await DeploymentService.checkExistingDeployment(id, "staging");
        if (!stagingDeployment || stagingDeployment.status !== "deployed") {
          throw new ValidationError("Staging deployment required before production");
        }
      }

      // Get the latest blueprint content
      const latestBlueprint = await ProjectDataService.getLatestBlueprint(id);
      
      // Ensure blueprint version is available (required field)
      const blueprintVersion = latestBlueprint.version || 1;

      // Update project status to generating
      await ProjectDataService.updateProjectStatus(id, "generating");

      // Generate environment-specific repository name
      const environmentRepoName = DeploymentService.generateEnvironmentRepoName(repoName!, environment!);

      // Calculate expiration for preview environments
      const expiresAt = environment === "preview" 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : undefined;

      logger.info("Starting environment deployment", {
        requestId: context.requestId,
        userId: user!.clerkId,
        projectId: id,
        githubOrg,
        repoName: environmentRepoName,
        environment,
        blueprintVersion,
        expiresAt,
      });

try {
        // Create deployment record
        const deploymentId = await DeploymentService.createDeploymentRecord({
          projectId: id,
          environment: environment!,
          githubOrg,
          githubRepoName: environmentRepoName,
          blueprintVersion,
          expiresAt,
        });

        // Create GitHub repository with blueprint
        const repo = await githubService.createRepository({
          org: githubOrg,
          name: environmentRepoName,
          description: `${project.description || "AI-generated software project"} (${environment})`,
          isPrivate: isPrivate || false,
          blueprintContent: latestBlueprint.contentMarkdown,
        });

        // Update deployment record with GitHub details
        await DeploymentService.updateDeploymentRecord(deploymentId, {
          githubRepoId: repo.id,
          githubRepoUrl: repo.html_url,
          status: "deployed",
        });

        // Update project status if this is production deployment
        if (environment === "production") {
          await ProjectDataService.updateProjectDeployment(id, repo.html_url);
        }

        logger.userAction("Environment deployment successful", user!.clerkId, {
          requestId: context.requestId,
          projectId: id,
          deploymentId,
          environment,
          repoUrl: repo.html_url,
          githubOrg,
          repoName: environmentRepoName,
        });

        return {
          projectId: project.id,
          deploymentId,
          environment,
          repoUrl: repo.html_url,
          repoName: environmentRepoName,
          status: "deployed",
          message: `${environment} deployment successful`,
          deploymentDetails: {
            repositoryId: repo.id,
            fullName: repo.full_name,
            cloneUrl: repo.clone_url,
            organization: githubOrg,
            repository: environmentRepoName,
            visibility: isPrivate ? "private" : "public",
            createdAt: repo.created_at,
            blueprintVersion,
            expiresAt,
          },
        };
      } catch (error) {
        // Reset project status on failure
        await ProjectDataService.updateProjectStatus(id, "completed");

        if (error instanceof GitHubServiceError) {
          logger.error("GitHub service error during deployment", {
            requestId: context.requestId,
            userId: user!.clerkId,
            projectId: id,
            environment,
            statusCode: error.statusCode,
            message: error.message,
          });
          throw new ValidationError(
            `GitHub deployment failed: ${error.message}`,
          );
        }

        throw error;
      }
    },
  })(req);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    handler: async ({ context, user }) => {
      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );
      const { project } = projectDetails;

      logger.userAction("Project status fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        status: project.status,
      });

      return {
        projectId: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        repoUrl: project.repoUrl,
        createdAt: project.createdAt,
        isDeployed: project.status === "deployed",
        canDeploy:
          project.status !== "deployed" &&
          project.status !== "completed" &&
          project.status !== "generating",
        deploymentNotes:
          project.status === "deployed"
            ? "Repository deployment successful"
            : project.status === "generating"
              ? "Repository deployment in progress"
              : "Ready for deployment",
      };
    },
  })(_req);
}