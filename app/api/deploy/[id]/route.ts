import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
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

      const result = await DeploymentService.deployEnvironment({
        projectId: id,
        userId: user!.id,
        userClerkId: user!.clerkId,
        githubOrg,
        repoName,
        isPrivate: isPrivate || false,
        environment: environment || "production",
        context,
      });

      return result;
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