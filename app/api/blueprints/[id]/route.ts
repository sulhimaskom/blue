import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { blueprintEngine } from "@/lib/services/blueprint-engine";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const refineBlueprintSchema = z.object({
  feedback: z
    .string()
    .min(10, "Feedback must be at least 10 characters")
    .max(500, "Feedback too long"),
  updateType: z
    .enum(["feature", "tech", "architecture", "monetization"])
    .default("feature"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    schema: refineBlueprintSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user, data }) => {
      const { feedback, updateType } = data!;

      // Verify user owns the project and get blueprint details
      const blueprintDetails = await ProjectDataService.getBlueprintWithProject(
        id,
        user!.clerkId,
      );
      const { project } = blueprintDetails;

      // Use AI-powered blueprint refinement (Phase 3 Integration)
      await blueprintEngine.refineBlueprint({
        blueprintId: id,
        feedback,
        updateType: updateType || "feature",
      });

      // Get the newly created version
      const refinedBlueprint = await ProjectDataService.getBlueprintById(id);

      logger.userAction("Blueprint refined", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: refinedBlueprint.id,
        version: refinedBlueprint.version,
        updateType,
      });

      return {
        blueprint: refinedBlueprint,
        project,
        blueprintId: refinedBlueprint.id,
        version: refinedBlueprint.version,
        message: "Blueprint refined successfully using AI analysis.",
      };
    },
  })(req);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) =>
      RateLimiters.blueprintsGet()(identifier),
    handler: async ({ context, user }) => {
      // Optimized: Get blueprint with project and all versions in a single database operation
      const blueprintDetails =
        await ProjectDataService.getBlueprintWithProjectAndVersions(
          id,
          user!.clerkId,
        );
      const { blueprint, project, allVersions } = blueprintDetails;

      logger.userAction("Blueprint details fetched", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        project: project.name,
        versionsCount: allVersions.length,
      });

      return {
        blueprint,
        project,
        allVersions,
        message: "Blueprint details retrieved successfully",
      };
    },
  })(_req);
}
