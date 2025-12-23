import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { blueprints, projects, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";

const refineBlueprintSchema = z.object({
  feedback: z
    .string()
    .min(10, "Feedback must be at least 10 characters")
    .max(500, "Feedback too long"),
  updateType: z.enum(["minor", "major", "structure"]).default("minor"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  let user: { id: string } | null = null;
  const { id } = await params;

  try {
    // Authentication check
    user = await currentUser();
    if (!user?.id) {
      logger.security("Authentication failed for blueprint refinement", {
        requestId: context.requestId,
        blueprintId: id,
      });
      throw new AuthenticationError("Authentication required");
    }

    // Validation
    const validation = await validateRequest(
      refineBlueprintSchema,
      "body",
    )(req);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const { feedback, updateType } = validation.data;
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
      .where(and(eq(blueprints.id, id), eq(users.clerkId, user.id)))
      .limit(1);

    if (!projectWithBlueprint.length) {
      throw new AuthenticationError("Blueprint not found or access denied");
    }

    const { blueprint, project } = projectWithBlueprint[0];

    // Create new version of blueprint with refinement
    const currentVersion = blueprint.version;
    const refinedContent = `${blueprint.contentMarkdown}\n\n## Refinement (Version ${currentVersion + 1})\n\n**Type**: ${updateType}\n**Feedback**: ${feedback}\n\n*This refinement reflects user input. Enhanced AI integration will be available in Phase 3.*`;

    const [refinedBlueprint] = await database
      .insert(blueprints)
      .values({
        projectId: blueprint.projectId,
        version: currentVersion + 1,
        contentMarkdown: refinedContent,
        structuredData: {
          ...(blueprint.structuredData as any),
          version: currentVersion + 1,
          lastRefinement: feedback,
          refinementType: updateType,
          phase: "refined",
        },
        marketResearch: blueprint.marketResearch,
      })
      .returning();

    logger.userAction("Blueprint refined", user!.id, {
      requestId: context.requestId,
      blueprintId: refinedBlueprint.id,
      version: refinedBlueprint.version,
      updateType: validation.data.updateType,
    });

    return formatSuccessResponse({
      blueprint: refinedBlueprint,
      project,
      blueprintId: refinedBlueprint.id,
      version: refinedBlueprint.version,
      message:
        "Blueprint refined successfully. Enhanced AI refinement will be available in Phase 3.",
    });
  } catch (error) {
    logger.apiError(
      "Blueprint refinement error",
      context.requestId,
      error as Error,
      {
        userId: user?.id,
        blueprintId: id,
        endpoint: "/api/blueprints/[id]",
      },
    );

    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError ||
      error instanceof DatabaseError
    ) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Unexpected error in blueprint refinement"),
    );
  }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  let user: { id: string } | null = null;
  const { id } = await params;

  try {
    // Authentication check
    user = await currentUser();
    if (!user?.id) {
      logger.security("Authentication failed for blueprint fetch", {
        requestId: context.requestId,
        blueprintId: id,
      });
      throw new AuthenticationError("Authentication required");
    }

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
      .where(and(eq(blueprints.id, id), eq(users.clerkId, user.id)))
      .limit(1);

    if (!blueprintDetails.length) {
      throw new AuthenticationError("Blueprint not found or access denied");
    }

    const { blueprint, project } = blueprintDetails[0];

    // Get all versions of this blueprint
    const allVersions = await database
      .select()
      .from(blueprints)
      .where(eq(blueprints.projectId, blueprint.projectId))
      .orderBy(blueprints.version);

    logger.userAction("Blueprint details fetched", user!.id, {
      requestId: context.requestId,
      blueprintId: id,
      project: project.name,
      versionsCount: allVersions.length,
    });

    return formatSuccessResponse({
      blueprint,
      project,
      allVersions,
      message: "Blueprint details retrieved successfully",
    });
  } catch (error) {
    logger.apiError(
      "Blueprint fetch error",
      context.requestId,
      error as Error,
      {
        userId: user?.id,
        blueprintId: id,
        endpoint: "/api/blueprints/[id]",
      },
    );

    if (error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(new DatabaseError("Failed to fetch blueprint"));
  }
}
