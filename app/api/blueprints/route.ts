import { z } from "zod";
import { db } from "@/lib/db";
import { projects, blueprints } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";
import { blueprintEngine } from "@/lib/services/blueprint-engine";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiter } from "@/lib/api-utils";

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

export const POST = APIRouteHandler.createPOSTHandler({
  schema: generateBlueprintSchema,
  requireAuth: true,
  requireCredits: 1,
  rateLimiter: (identifier: string) => blueprintRateLimiter(identifier),
  handler: async ({ context, user, data }) => {
    const { input, projectName } = data!;

    // Generate blueprint using AI engine (Phase 3 Integration)
    logger.info("Initiating AI blueprint generation", {
      requestId: context.requestId,
      userId: user!.clerkId,
      input: input.substring(0, 100),
      projectName,
    });

    const generationResult = await blueprintEngine.generateBlueprint({
      userId: user!.id,
      input,
      projectName,
      projectDescription: `AI-generated blueprint from: ${input.substring(0, 100)}...`,
    });

    // Deduct credit for blueprint generation using service
    await UserService.updateUserCredits(user!.id, -1, context);

    logger.userAction("AI blueprint generation completed", user!.clerkId, {
      requestId: context.requestId,
      projectId: generationResult.projectId,
      blueprintId: generationResult.blueprintId,
      creditsDeducted: 1,
      remainingCredits: user!.credits - 1,
      generationTime: `${generationResult.estimatedDuration}ms`,
    });

    return {
      projectId: generationResult.projectId,
      blueprintId: generationResult.blueprintId,
      status: generationResult.status,
      estimatedDuration: generationResult.estimatedDuration,
      message:
        "Blueprint successfully generated using AI analysis and market research.",
    };
  },
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  handler: async ({ context, user }) => {
    const database = db();

    // Get all projects for the user
    const userProjects = await database
      .select()
      .from(projects)
      .where(eq(projects.ownerId, user!.id))
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

    logger.userAction("Projects fetched", user!.clerkId, {
      requestId: context.requestId,
      projectCount: projectsWithBlueprints.length,
    });

    return {
      projects: projectsWithBlueprints,
      credits: user!.credits,
      subscriptionTier: user!.subscriptionTier,
    };
  },
});
