import { logger } from '@/lib/logger';
import { BlueprintQueryOptimizer } from '@/lib/db/blueprint-query-optimizer';
import DatabaseQueryCache from '@/lib/services/database-cache-service';
import type { RequestContext } from '@/lib/services/user-service';

export interface BlueprintStats {
  totalProjects: number;
  totalBlueprints: number;
  completedBlueprints: number;
  draftBlueprints: number;
  lastActivity: string | null;
}

export interface BlueprintStatsResult {
  projects: any[];
  stats: BlueprintStats;
  performanceMetrics: {
    projectsQuery: any;
    countsQuery: any;
    totalOptimizations: number;
  };
  fromCache: boolean;
}

export interface PerformanceMetrics {
  projectsQuery: any;
  countsQuery: any;
  totalOptimizations: number;
}

/**
 * Service for blueprint statistics and data enrichment
 * Extracts business logic from app/api/blueprints/route.ts following blueprint.md:208-209
 */
export class BlueprintStatsService {
  /**
   * Get user blueprint statistics with optimized queries
   * Handles cache logic, stats calculation, and performance metrics internally
   */
  static async getUserBlueprintStats(
    userId: number,
    clerkId: string,
    context: RequestContext
  ): Promise<BlueprintStatsResult> {
    // Try to get user blueprint stats from cache first
    let cachedStats = await DatabaseQueryCache.getCachedUserBlueprintStats(userId);

    if (!cachedStats) {
      return this.computeAndCacheStats(userId, clerkId, context);
    }

    return this.getFromOptimizedQuery(userId, clerkId, context, cachedStats);
  }

  /**
   * Compute stats from database and cache the result
   */
  private static async computeAndCacheStats(
    userId: number,
    clerkId: string,
    context: RequestContext
  ): Promise<BlueprintStatsResult> {
    // Use the optimized blueprint query optimizer
    const optimizedProjects = await BlueprintQueryOptimizer.optimizeUserBlueprintQuery(userId);
    const userProjects = optimizedProjects.data;

    // Get blueprint counts for metrics
    const projectIds = userProjects.map(p => p.id);
    const optimizedCounts = await BlueprintQueryOptimizer.optimizeBlueprintCountsQuery(projectIds);

    // Use centralized method to enrich projects with blueprint counts
    const projectsWithBlueprints =
      await BlueprintQueryOptimizer.enrichProjectsWithBlueprintCounts(userProjects);

    // Calculate stats
    const totalBlueprints = projectsWithBlueprints.reduce(
      (sum, project) => sum + project.blueprintCount,
      0
    );

    const stats: BlueprintStats = {
      totalProjects: projectsWithBlueprints.length,
      totalBlueprints,
      completedBlueprints: totalBlueprints,
      draftBlueprints: 0,
      lastActivity: new Date().toISOString(),
    };

    // Cache the computed stats for future requests
    await DatabaseQueryCache.cacheUserBlueprintStats(userId, stats);

    logger.userAction('Projects fetched with optimized cache', clerkId, {
      requestId: context.requestId,
      projectCount: projectsWithBlueprints.length,
      cacheStatus: 'miss',
      optimizationApplied: optimizedProjects.optimizationApplied,
      performanceGain: optimizedProjects.metrics.improvementPercentage,
      queryTime: `${optimizedProjects.metrics.optimizedQueryTime}ms`,
    });

    const performanceMetrics: PerformanceMetrics = {
      projectsQuery: optimizedProjects.metrics,
      countsQuery: optimizedCounts.metrics,
      totalOptimizations: BlueprintQueryOptimizer.getOptimizationMetrics().totalOptimizations,
    };

    return {
      projects: projectsWithBlueprints,
      stats,
      performanceMetrics,
      fromCache: false,
    };
  }

  /**
   * Get from optimized query even for cached responses (for consistency)
   */
  private static async getFromOptimizedQuery(
    userId: number,
    clerkId: string,
    context: RequestContext,
    cachedStats: BlueprintStats
  ): Promise<BlueprintStatsResult> {
    // For cached responses, use the optimizer as well for consistency
    const optimizedProjects = await BlueprintQueryOptimizer.optimizeUserBlueprintQuery(userId);

    // Get blueprint counts for metrics
    const projectIds = optimizedProjects.data.map(p => p.id);
    const optimizedCounts = await BlueprintQueryOptimizer.optimizeBlueprintCountsQuery(projectIds);

    // Use centralized method to enrich projects with blueprint counts
    const projectsWithBlueprints = await BlueprintQueryOptimizer.enrichProjectsWithBlueprintCounts(
      optimizedProjects.data
    );

    logger.userAction('Projects fetched with optimization', clerkId, {
      requestId: context.requestId,
      projectCount: projectsWithBlueprints.length,
      cacheStatus: 'hit',
      cachedStats,
      optimizationApplied: optimizedProjects.optimizationApplied,
      performanceGain: optimizedProjects.metrics.improvementPercentage,
    });

    const performanceMetrics: PerformanceMetrics = {
      projectsQuery: optimizedProjects.metrics,
      countsQuery: optimizedCounts.metrics,
      totalOptimizations: BlueprintQueryOptimizer.getOptimizationMetrics().totalOptimizations,
    };

    return {
      projects: projectsWithBlueprints,
      stats: cachedStats,
      performanceMetrics,
      fromCache: true,
    };
  }
}
