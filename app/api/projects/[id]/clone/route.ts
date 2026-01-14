import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectCloneService } from "@/lib/services/project-clone-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CloneProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters long").max(100),
  description: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    schema: CloneProjectSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user, data }) => {
      const { name, description } = data!;

      // Clone project with context for webhooks
      const cloneResult = await ProjectCloneService.cloneProject(
        id,
        user!.clerkId,
        { name, description },
        context,
      );

      logger.userAction("Project cloned", user!.clerkId, {
        requestId: context.requestId,
        originalProjectId: id,
        clonedProjectId: cloneResult.clonedProject.id,
        clonedProjectName: cloneResult.clonedProject.name,
        blueprintsCount: cloneResult.clonedBlueprints.length,
      });

      return {
        project: cloneResult.clonedProject,
        blueprints: cloneResult.clonedBlueprints,
        originalProjectId: cloneResult.originalProjectId,
        message: "Project cloned successfully",
      };
    },
  })(req);
}
