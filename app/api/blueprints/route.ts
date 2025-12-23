import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  DatabaseError,
  RateLimiter,
} from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users, projects, blueprints } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { logger, createRequestContext } from "@/lib/logger";

// Rate limiting: 3 requests per minute for blueprint generation
const blueprintRateLimiter = RateLimiter(3, 60 * 1000);

const generateBlueprintSchema = z.object({
  input: z
    .string()
    .min(10, "Input must be at least 10 characters")
    .max(1000, "Input too long"),
  projectName: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Name too long"),
});

export async function POST(req: NextRequest) {
  const context = createRequestContext();
  let user: { id: string } | null = null;

  try {
    // Authentication check
    user = await currentUser();
    if (!user?.id) {
      logger.security("Authentication failed - missing user", {
        requestId: context.requestId,
      });
      throw new AuthenticationError("Authentication required");
    }

    // Rate limiting check
    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitCheck = blueprintRateLimiter(
      `blueprint:${user.id}:${clientIp}`,
    );
    if (!rateLimitCheck.allowed) {
      logger.security("Blueprint generation rate limit exceeded", {
        requestId: context.requestId,
        userId: user.id,
        clientIp,
        resetTime: rateLimitCheck.resetTime,
      });
      throw new ValidationError(
        `Rate limit exceeded. Try again in ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000)} seconds.`,
        429,
      );
    }

    // Validation
    const validation = await validateRequest(
      generateBlueprintSchema,
      "body",
    )(req);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const database = db();

    // Check user credits (require at least 1 credit)
    const [userRecord] = await database
      .select()
      .from(users)
      .where(eq(users.clerkId, user.id))
      .limit(1);

    if (!userRecord) {
      throw new AuthenticationError("User not found");
    }

    if (userRecord.credits < 1) {
      logger.warn("Blueprint generation blocked - insufficient credits", {
        requestId: context.requestId,
        userId: user.id,
        currentCredits: userRecord.credits,
      });
      throw new ValidationError(
        "Insufficient credits. Please upgrade your plan.",
      );
    }

    const { input, projectName } = validation.data;

    // Create project
    const [newProject] = await database
      .insert(projects)
      .values({
        ownerId: userRecord.id,
        name: projectName,
        description: `AI-generated blueprint: ${input.substring(0, 100)}...`,
        status: "generating",
      })
      .returning();

    if (!newProject) {
      logger.error("Project creation failed", {
        requestId: context.requestId,
        userId: user.id,
        projectName,
        input: input.substring(0, 100),
      });
      throw new DatabaseError("Failed to create project");
    }

    // TODO: In Phase 3, this will trigger the AI generation pipeline
    // For now, we'll create a placeholder blueprint entry
    const [placeholderBlueprint] = await database
      .insert(blueprints)
      .values({
        projectId: newProject.id,
        version: 1,
        contentMarkdown: `# Placeholder Blueprint\n\nProject: ${projectName}\nInput: ${input}\n\n*This blueprint will be enhanced with AI-generated content in Phase 3.*`,
        structuredData: {
          status: "placeholder",
          projectName,
          userInput: input,
          phase: "pre-ai-integration",
        },
        marketResearch: null,
      })
      .returning();

    // Deduct credit for blueprint generation
    await database
      .update(users)
      .set({ credits: userRecord.credits - 1 })
      .where(eq(users.clerkId, user.id));

    logger.userAction("Blueprint generation initiated", user!.id, {
      requestId: context.requestId,
      projectId: newProject.id,
      blueprintId: placeholderBlueprint.id,
      creditsDeducted: 1,
      remainingCredits: userRecord.credits - 1,
    });

    return formatSuccessResponse({
      projectId: newProject.id,
      blueprintId: placeholderBlueprint.id,
      status: "generating",
      message:
        "Blueprint generation initiated. Current implementation creates a placeholder until AI integration in Phase 3.",
    });
  } catch (error) {
    logger.apiError(
      "Blueprint generation error",
      context.requestId,
      error as Error,
      {
        userId: user?.id,
        endpoint: "/api/blueprints",
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
      new DatabaseError("Unexpected error in blueprint generation"),
    );
  }
}

export async function GET() {
  const context = createRequestContext();
  let user: { id: string } | null = null;

  try {
    user = await currentUser();
    if (!user?.id) {
      logger.security("Authentication failed for projects fetch", {
        requestId: context.requestId,
      });
      throw new AuthenticationError("Authentication required");
    }

    const database = db();

    const userRecord = await database
      .select()
      .from(users)
      .where(eq(users.clerkId, user.id))
      .limit(1);

    if (!userRecord.length) {
      throw new AuthenticationError("User not found");
    }

    // Get all projects for the user
    const userProjects = await database
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userRecord[0].id))
      .orderBy(projects.createdAt);

    // Get blueprint counts for each project
    const projectsWithBlueprints = await Promise.all(
      userProjects.map(async (project) => {
        const [blueprintCount] = await database
          .select({ count: count() })
          .from(blueprints)
          .where(eq(blueprints.projectId, project.id));

        return {
          ...project,
          blueprintCount: blueprintCount!.count!,
        };
      }),
    );

    logger.userAction("Projects fetched", user!.id, {
      requestId: context.requestId,
      projectCount: projectsWithBlueprints.length,
    });

    return formatSuccessResponse({
      projects: projectsWithBlueprints,
      credits: userRecord[0].credits,
      subscriptionTier: userRecord[0].subscriptionTier,
    });
  } catch (error) {
    logger.apiError("Projects fetch error", context.requestId, error as Error, {
      userId: user?.id,
      endpoint: "/api/blueprints",
    });

    if (error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(new DatabaseError("Failed to fetch projects"));
  }
}
