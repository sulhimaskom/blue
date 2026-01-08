import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      // Get specific project for the authenticated user
      const project = await ProjectDataService.getProjectWithBlueprintCount(
        id,
        user!.clerkId,
      );

      logger.userAction("Project fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        projectName: project.name,
      });

      return {
        project,
        message: "Project retrieved successfully",
      };
    },
  })(_req);
}

export async function PUT(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      // Update project logic would go here
      // For now, we'll just return the project as-is
      const project = await ProjectDataService.getProjectWithBlueprintCount(
        id,
        user!.clerkId,
      );

      logger.userAction("Project updated", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        projectName: project.name,
      });

      return {
        project,
        message: "Project updated successfully",
      };
    },
  })(_req);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      // Delete the project
      const deletedProject = await ProjectDataService.deleteProject(
        id,
        user!.clerkId,
      );

      logger.userAction("Project deleted", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        projectName: deletedProject.name,
      });

      return {
        project: deletedProject,
        message: "Project deleted successfully",
      };
    },
  })(_req);
}
