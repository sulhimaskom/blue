import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    handler: async ({ context, user }) => {
      // Get all blueprints for a specific project
      const projectBlueprints = await ProjectDataService.getProjectBlueprints(
        id,
        user!.clerkId,
      );

      logger.userAction("Project blueprints fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        blueprintsCount: projectBlueprints.blueprints.length,
      });

      return {
        project: projectBlueprints.project,
        blueprints: projectBlueprints.blueprints,
        message: "Project blueprints retrieved successfully",
      };
    },
  })(_req);
}
