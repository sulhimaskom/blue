import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { blueprints, projects, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { blueprintEngine } from "@/lib/services/blueprint-engine";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ValidationError } from "@/lib/api-utils";

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

  return APIRouteHandler.createPOSTHandler({
    schema: refineBlueprintSchema,
    requireAuth: true,
    handler: async ({ context, user, data }) => {
      const { feedback, updateType } = data!;
      const database = db();

      // Verify user owns the project
      const projectWithBlueprint = await database
        .select({
          project: projects,
          blueprint: blueprints,
          user: users,
        })
        .from(blueprints)
        .innerJoin(projects, eq(blueprints.projectId, projects.id))
        .innerJoin(users, eq(projects.ownerId, users.id))
        .where(and(eq(blueprints.id, id), eq(users.clerkId, user!.clerkId)))
        .limit(1);

      if (!projectWithBlueprint.length) {
        throw new ValidationError("Blueprint not found or access denied");
      }

      const { project } = projectWithBlueprint[0];

      // Use AI-powered blueprint refinement (Phase 3 Integration)
      await blueprintEngine.refineBlueprint({
        blueprintId: id,
        feedback,
        updateType: updateType || "feature",
      });

      // Get the newly created version
      const [refinedBlueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, id))
        .orderBy(blueprints.version)
        .limit(1);

      logger.userAction("Blueprint refined", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: refinedBlueprint.id,
        version: refinedBlueprint.version,
        updateType: updateType,
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
    handler: async ({ context, user }) => {
      const database = db();

      // Get blueprint with project and verify ownership
      const blueprintDetails = await database
        .select({
          blueprint: blueprints,
          project: projects,
          user: users,
        })
        .from(blueprints)
        .innerJoin(projects, eq(blueprints.projectId, projects.id))
        .innerJoin(users, eq(projects.ownerId, users.id))
        .where(and(eq(blueprints.id, id), eq(users.clerkId, user!.clerkId)))
        .limit(1);

      if (!blueprintDetails.length) {
        throw new ValidationError("Blueprint not found or access denied");
      }

      const { blueprint, project } = blueprintDetails[0];

      // Get all versions of this blueprint
      const allVersions = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.projectId, blueprint.projectId))
        .orderBy(blueprints.version);

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
