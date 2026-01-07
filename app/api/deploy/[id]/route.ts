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

const deployRepoSchema = z.object({
  githubOrg: z
    .string()
    .min(2, "GitHub organization must be at least 2 characters"),
  repoName: z
    .string()
    .min(3, "Repository name must be at least 3 characters")
    .max(100),
  isPrivate: z.boolean().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    schema: deployRepoSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.deployPost()(identifier),
    handler: async ({ context, user, data }) => {
      const { githubOrg, repoName, isPrivate } = data!;

      // Verify user owns the project
      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );
      const { project } = projectDetails;

      if (project.status === "completed" || project.status === "deployed") {
        logger.warn(
          "Project deployment attempted on already deployed project",
          {
            requestId: context.requestId,
            userId: user!.clerkId,
            projectId: id,
            currentStatus: project.status,
          },
        );
        throw new ValidationError("Project is already deployed");
      }

      // Get the latest blueprint content
      const latestBlueprint = await ProjectDataService.getLatestBlueprint(id);

      // Update project status to generating
      await ProjectDataService.updateProjectStatus(id, "generating");

      logger.info("Starting GitHub repository creation", {
        requestId: context.requestId,
        userId: user!.clerkId,
        projectId: id,
        githubOrg,
        repoName,
        blueprintVersion: latestBlueprint.version,
      });

      try {
        // Create GitHub repository with blueprint
        const repo = await githubService.createRepository({
          org: githubOrg,
          name: repoName,
          description: project.description || "AI-generated software project",
          isPrivate: isPrivate || false,
          blueprintContent: latestBlueprint.contentMarkdown,
        });

        const updatedProject = await ProjectDataService.updateProjectDeployment(
          id,
          repo.html_url,
        );

        logger.userAction("Repository deployment successful", user!.clerkId, {
          requestId: context.requestId,
          projectId: id,
          repoUrl: repo.html_url,
          githubOrg,
          repoName,
          isPrivate,
        });

        return {
          projectId: updatedProject.id,
          repoUrl: updatedProject.repoUrl,
          status: updatedProject.status,
          message: "Repository deployment successful",
          deploymentDetails: {
            repositoryId: repo.id,
            fullName: repo.full_name,
            cloneUrl: repo.clone_url,
            organization: githubOrg,
            repository: repoName,
            visibility: isPrivate ? "private" : "public",
            createdAt: repo.created_at,
            blueprintVersion: latestBlueprint.version,
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
      // Get project details and deployment status
      const projectDetails = await ProjectDataService.verifyProjectOwnership(
        id,
        user!.clerkId,
      );
      const { project } = projectDetails;

      logger.userAction("Project status fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        status: project.status,
        isDeployed: project.status === "deployed",
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
