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
import { blueprintEngine } from "@/lib/services/blueprint-engine";

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

    // Generate blueprint using AI engine (Phase 3 Integration)
    logger.info("Initiating AI blueprint generation", {
      requestId: context.requestId,
      userId: authenticatedUser.clerkId,
      input: input.substring(0, 100),
      projectName,
    });

    const generationResult = await blueprintEngine.generateBlueprint({
      userId: authenticatedUser.id,
      input,
      projectName,
      projectDescription: `AI-generated blueprint from: ${input.substring(0, 100)}...`,
    });

    // Deduct credit for blueprint generation using service
    await UserService.updateUserCredits(authenticatedUser.id, -1, context);

    logger.userAction(
      "AI blueprint generation completed",
      authenticatedUser.clerkId,
      {
        requestId: context.requestId,
        projectId: generationResult.projectId,
        blueprintId: generationResult.blueprintId,
        creditsDeducted: 1,
        remainingCredits: authenticatedUser.credits - 1,
        generationTime: `${generationResult.estimatedDuration}ms`,
      },
    );

    return formatSuccessResponse({
      projectId: generationResult.projectId,
      blueprintId: generationResult.blueprintId,
      status: generationResult.status,
      estimatedDuration: generationResult.estimatedDuration,
      message:
        "Blueprint successfully generated using AI analysis and market research.",
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

    if (error instanceof ValidationError || error instanceof DatabaseError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Blueprint generation failed"),
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
