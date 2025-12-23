import { NextRequest } from "next/server";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  DatabaseError,
  RateLimiter,
} from "@/lib/api-utils";
import { db } from "@/lib/db";
import { projects, blueprints } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { logger, createRequestContext } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";

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
  let authenticatedUser:
    | import("@/lib/services/user-service").AuthenticatedUser
    | null = null;

  try {
    // Authentication and user record fetch
    authenticatedUser = await UserService.getAuthenticatedUser(context);

    // Rate limiting check
    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitCheck = await blueprintRateLimiter(
      `blueprint:${authenticatedUser.clerkId}:${clientIp}`,
    );
    if (!rateLimitCheck.allowed) {
      logger.security("Blueprint generation rate limit exceeded", {
        requestId: context.requestId,
        userId: authenticatedUser.clerkId,
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

    // Check user credits using service
    if (!UserService.hasSufficientCredits(authenticatedUser, 1)) {
      logger.warn("Blueprint generation blocked - insufficient credits", {
        requestId: context.requestId,
        userId: authenticatedUser.clerkId,
        currentCredits: authenticatedUser.credits,
      });
      throw new ValidationError(
        "Insufficient credits. Please upgrade your plan.",
      );
    }

    const { input, projectName } = validation.data;

    const database = db();

    // Create project
    const [newProject] = await database
      .insert(projects)
      .values({
        ownerId: authenticatedUser.id,
        name: projectName,
        description: `AI-generated blueprint: ${input.substring(0, 100)}...`,
        status: "generating",
      })
      .returning();

    if (!newProject) {
      logger.error("Project creation failed", {
        requestId: context.requestId,
        userId: authenticatedUser.clerkId,
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

    // Deduct credit for blueprint generation using service
    await UserService.updateUserCredits(authenticatedUser.id, -1, context);

    logger.userAction(
      "Blueprint generation initiated",
      authenticatedUser.clerkId,
      {
        requestId: context.requestId,
        projectId: newProject.id,
        blueprintId: placeholderBlueprint.id,
        creditsDeducted: 1,
        remainingCredits: authenticatedUser.credits - 1,
      },
    );

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
        userId: authenticatedUser?.clerkId,
        endpoint: "/api/blueprints",
      },
    );
  }
}

export async function GET() {
  const context = createRequestContext();
  let authenticatedUser:
    | import("@/lib/services/user-service").AuthenticatedUser
    | null = null;

  try {
    // Authentication and user record fetch
    authenticatedUser = await UserService.getAuthenticatedUser(context);

    const database = db();

    // Get all projects for the user
    const userProjects = await database
      .select()
      .from(projects)
      .where(eq(projects.ownerId, authenticatedUser.id))
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

    logger.userAction("Projects fetched", authenticatedUser.clerkId, {
      requestId: context.requestId,
      projectCount: projectsWithBlueprints.length,
    });

    return formatSuccessResponse({
      projects: projectsWithBlueprints,
      credits: authenticatedUser.credits,
      subscriptionTier: authenticatedUser.subscriptionTier,
    });
  } catch (error) {
    logger.apiError("Projects fetch error", context.requestId, error as Error, {
      userId: authenticatedUser?.clerkId,
      endpoint: "/api/blueprints",
    });

    if (error instanceof DatabaseError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(new DatabaseError("Failed to fetch projects"));
  }
}
