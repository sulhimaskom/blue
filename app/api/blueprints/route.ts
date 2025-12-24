import { z } from "zod";
import { logger } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";
import { blueprintEngine } from "@/lib/services/blueprint-engine";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiter } from "@/lib/api-utils";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { BlueprintQueryOptimizer } from "@/lib/db/blueprint-query-optimizer";

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

    // Invalidate user cache when new blueprint is created
    await DatabaseQueryCache.invalidateUserCache(user!.id);

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
    // Try to get user blueprint stats from cache first
    let cachedStats = await DatabaseQueryCache.getCachedUserBlueprintStats(
      user!.id,
    );

    if (!cachedStats) {
      // NEW: Use the optimized blueprint query optimizer
      const optimizedProjects =
        await BlueprintQueryOptimizer.optimizeUserBlueprintQuery(user!.id);
      const userProjects = optimizedProjects.data;

      // Get blueprint counts for metrics
      const projectIds = userProjects.map((p) => p.id);
      const optimizedCounts =
        await BlueprintQueryOptimizer.optimizeBlueprintCountsQuery(projectIds);

      // Optimized: Use centralized method to enrich projects with blueprint counts
      const projectsWithBlueprints =
        await BlueprintQueryOptimizer.enrichProjectsWithBlueprintCounts(
          userProjects,
        );

      // Cache the computed stats for future requests
      const totalBlueprints = projectsWithBlueprints.reduce(
        (sum, project) => sum + project.blueprintCount,
        0,
      );

      cachedStats = {
        totalProjects: projectsWithBlueprints.length,
        totalBlueprints,
        completedBlueprints: totalBlueprints, // Simplified for caching
        draftBlueprints: 0, // Simplified for caching
        lastActivity: new Date().toISOString(),
      };

      await DatabaseQueryCache.cacheUserBlueprintStats(user!.id, cachedStats);

      logger.userAction(
        "Projects fetched with optimized cache",
        user!.clerkId,
        {
          requestId: context.requestId,
          projectCount: projectsWithBlueprints.length,
          cacheStatus: "miss",
          optimizationApplied: optimizedProjects.optimizationApplied,
          performanceGain: optimizedProjects.metrics.improvementPercentage,
          queryTime: `${optimizedProjects.metrics.optimizedQueryTime}ms`,
        },
      );

      return {
        projects: projectsWithBlueprints,
        credits: user!.credits,
        subscriptionTier: user!.subscriptionTier,
        performanceMetrics: {
          projectsQuery: optimizedProjects.metrics,
          countsQuery: optimizedCounts.metrics,
          totalOptimizations:
            BlueprintQueryOptimizer.getOptimizationMetrics().totalOptimizations,
        },
      };
    } else {
      // NEW: For cached responses, use the optimizer as well for consistency
      const optimizedProjects =
        await BlueprintQueryOptimizer.optimizeUserBlueprintQuery(user!.id);

      // Get blueprint counts for metrics
      const projectIds = optimizedProjects.data.map((p) => p.id);
      const optimizedCounts =
        await BlueprintQueryOptimizer.optimizeBlueprintCountsQuery(projectIds);

      // Use centralized method to enrich projects with blueprint counts
      const projectsWithBlueprints =
        await BlueprintQueryOptimizer.enrichProjectsWithBlueprintCounts(
          optimizedProjects.data,
        );

      logger.userAction("Projects fetched with optimization", user!.clerkId, {
        requestId: context.requestId,
        projectCount: projectsWithBlueprints.length,
        cacheStatus: "hit",
        cachedStats,
        optimizationApplied: optimizedProjects.optimizationApplied,
        performanceGain: optimizedProjects.metrics.improvementPercentage,
      });

      return {
        projects: projectsWithBlueprints,
        credits: user!.credits,
        subscriptionTier: user!.subscriptionTier,
        performanceMetrics: {
          projectsQuery: optimizedProjects.metrics,
          countsQuery: optimizedCounts.metrics,
          totalOptimizations:
            BlueprintQueryOptimizer.getOptimizationMetrics().totalOptimizations,
        },
      };
    }
  },
});
