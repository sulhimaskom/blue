import { z } from 'zod';
import { logger } from '@/lib/logger';
import { UserService } from '@/lib/services/user-service';
import { blueprintEngine } from '@/lib/services/blueprint-engine';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { RateLimiters } from '@/lib/rate-limit-config';
import DatabaseQueryCache from '@/lib/services/database-cache-service';
import { BlueprintStatsService } from '@/lib/services/blueprint-stats-service';

const generateBlueprintSchema = z.object({
  input: z.string().min(10, 'Input must be at least 10 characters').max(1000, 'Input too long'),
  projectName: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Name too long'),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: generateBlueprintSchema,
  requireAuth: true,
  requireCredits: 1,
  rateLimiter: (identifier: string) => RateLimiters.blueprintsPost()(identifier),
  handler: async ({ context, user, data }) => {
    const { input, projectName } = data!;

    // Generate blueprint using AI engine (Phase 3 Integration)
    logger.info('Initiating AI blueprint generation', {
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

    logger.userAction('AI blueprint generation completed', user!.clerkId, {
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
      message: 'Blueprint successfully generated using AI analysis and market research.',
    };
  },
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.blueprintsGet()(identifier),
  handler: async ({ context, user }) => {
    // Delegate stats computation to BlueprintStatsService
    const statsResult = await BlueprintStatsService.getUserBlueprintStats(
      user!.id,
      user!.clerkId,
      context
    );

    return {
      projects: statsResult.projects,
      credits: user!.credits,
      subscriptionTier: user!.subscriptionTier,
      performanceMetrics: statsResult.performanceMetrics,
    };
  },
});
