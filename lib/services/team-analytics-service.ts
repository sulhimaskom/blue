import { eq, and, count, isNull, inArray, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers, transactions, teamProjects, blueprints, deployments } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from "@/lib/api-utils";
import { ServiceError } from "@/lib/services/service-error-handler";
import { teamCache } from "@/lib/services/cache-orchestrator";
import { teamMemberAccessService } from "@/lib/services/team-member-access-service";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";

export interface CreditUsageRow {
  userId: number;
  credits: string | null;
}

export interface TeamProjectRow {
  projectId: string;
}

export interface DeployedBlueprintRow {
  blueprintVersion: number;
}

export interface BlueprintMetrics {
  totalBlueprintsGenerated: number;
  avgBlueprintGenerationTime: number;
  blueprintSuccessRate: number;
  avgBlueprintQualityScore: number;
  patternUsage: Array<{ pattern: string; count: number }>;
  blueprintToDeploymentRate: number;
}

export interface TeamAnalytics {
  teamId: string;
  memberCount: number;
  projectCount: number;
  totalCreditsConsumed: number;
  memberCreditUsage: Array<{ userId: number; creditsConsumed: number }>;
  blueprintMetrics: BlueprintMetrics;
  createdAt: string;
}

/**
 * Service for team analytics and usage statistics
 * Handles team metrics, member usage tracking, and performance reporting
 */
export class TeamAnalyticsService {
  private static instance: TeamAnalyticsService;

  private constructor() {}

  static getInstance(): TeamAnalyticsService {
    if (!TeamAnalyticsService.instance) {
      TeamAnalyticsService.instance = new TeamAnalyticsService();
    }
    return TeamAnalyticsService.instance;
  }

  /**
   * Get team usage analytics
   */
  async getTeamAnalytics(
    teamId: string,
    requestingUserId: number
  ): Promise<TeamAnalytics> {
    const cacheKey = `team:${teamId}:analytics`;

    try {
      // Check cache first
      const cached = await teamCache.get(cacheKey);
      if (cached) {
        // Verify user has access
        await teamMemberAccessService.verifyTeamAccess(
          teamId,
          requestingUserId,
          ["admin", "member"]
        );
        return cached;
      }

      // Verify user has access to team analytics
      await teamMemberAccessService.verifyTeamAccess(
        teamId,
        requestingUserId,
        ["admin", "member"]
      );

      const database = db();

      // Get team member count
      const [{ memberCount }] = await database
        .select({ memberCount: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      // Get team project count
      const [{ projectCount }] = await database
        .select({ projectCount: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      // Get credits consumed by team members
      const teamMemberIds = await database
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      const memberIds = teamMemberIds.map((m) => m.userId);

      const creditUsageResults =
        memberIds.length > 0
          ? await database
              .select({
                userId: transactions.userId,
                credits: sum(transactions.amount),
              })
              .from(transactions)
              .where(inArray(transactions.userId, memberIds))
              .groupBy(transactions.userId)
          : [];

      const totalCreditsConsumed = creditUsageResults.reduce(
        (sum: number, row: CreditUsageRow) => sum + (Number(row.credits) || 0),
        0
      );

      const blueprintMetrics = await this.getBlueprintMetrics(teamId, database);

      const analytics = {
        teamId,
        memberCount,
        projectCount: projectCount || 0,
        totalCreditsConsumed,
        memberCreditUsage: creditUsageResults.map((usage) => ({
          userId: usage.userId,
          creditsConsumed: Number(usage.credits) || 0,
        })),
        blueprintMetrics,
        createdAt: new Date().toISOString(),
      };

      // Cache result with shorter TTL for analytics
      await teamCache.set(cacheKey, analytics, 180); // 3 minutes

      return analytics;
    } catch (error) {
      logger.error("Failed to get team analytics", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestingUserId,
      });

      if (
        error instanceof ServiceError ||
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof NotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      throw new DatabaseError("Failed to get team analytics");
    }
  }

  async getBlueprintMetrics(teamId: string, database: ReturnType<typeof db>): Promise<BlueprintMetrics> {
    try {
      // Get team project IDs
      const teamProjectIds = await database
        .select({ projectId: teamProjects.projectId })
        .from(teamProjects)
        .where(eq(teamProjects.teamId, teamId));

      const projectIds = teamProjectIds.map((p: TeamProjectRow) => p.projectId);

      if (projectIds.length === 0) {
        return {
          totalBlueprintsGenerated: 0,
          avgBlueprintGenerationTime: 0,
          blueprintSuccessRate: 0,
          avgBlueprintQualityScore: 0,
          patternUsage: [],
          blueprintToDeploymentRate: 0,
        };
      }

      // Get blueprint generation metrics from performance monitor
      const blueprintPerformanceData = performanceMonitorService.getBlueprintPerformanceByProjects(projectIds);

      // Count total blueprints from database
      const [{ totalBlueprints }] = await database
        .select({ totalBlueprints: count() })
        .from(blueprints)
        .where(inArray(blueprints.projectId, projectIds));

      // Calculate blueprint success rate based on deployments
      const deployedBlueprints = await database
        .select({ blueprintVersion: deployments.blueprintVersion })
        .from(deployments)
        .where(inArray(deployments.projectId, projectIds));

      const uniqueDeployedBlueprints = new Set(deployedBlueprints.map((d: DeployedBlueprintRow) => d.blueprintVersion)).size;

      // Calculate average blueprint quality score (from structured data)
      const blueprintsWithQuality = await database
        .select({ structuredData: blueprints.structuredData })
        .from(blueprints)
        .where(inArray(blueprints.projectId, projectIds));

      let totalQualityScore = 0;
      let qualityCount = 0;
      const patternCounts = new Map<string, number>();

      for (const blueprint of blueprintsWithQuality) {
        const structuredData = blueprint.structuredData as any;
        if (structuredData?.qualityScore) {
          totalQualityScore += structuredData.qualityScore;
          qualityCount++;
        }
        if (structuredData?.architecture?.type) {
          const pattern = structuredData.architecture.type;
          patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
        }
      }

      const avgBlueprintQualityScore = qualityCount > 0 ? totalQualityScore / qualityCount : 0;

      // Convert pattern usage map to array
      const patternUsage = Array.from(patternCounts.entries())
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalBlueprintsGenerated: totalBlueprints || 0,
        avgBlueprintGenerationTime: blueprintPerformanceData.avgGenerationTime || 0,
        blueprintSuccessRate: blueprintPerformanceData.successRate || 0,
        avgBlueprintQualityScore,
        patternUsage,
        blueprintToDeploymentRate: totalBlueprints > 0 ? uniqueDeployedBlueprints / totalBlueprints : 0,
      };
    } catch (error) {
      logger.error("Failed to get blueprint metrics", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
      });

      return {
        totalBlueprintsGenerated: 0,
        avgBlueprintGenerationTime: 0,
        blueprintSuccessRate: 0,
        avgBlueprintQualityScore: 0,
        patternUsage: [],
        blueprintToDeploymentRate: 0,
      };
    }
  }

  /**
   * Get team member usage statistics
   */
  async getMemberUsageStats(
    teamId: string,
    requestingUserId: number
  ): Promise<{
    memberCount: number;
    totalCreditsConsumed: number;
    topContributors: Array<{ userId: number; creditsConsumed: number }>;
  }> {
    try {
      // Verify user has access
      await teamMemberAccessService.verifyTeamAccess(
        teamId,
        requestingUserId,
        ["admin", "member"]
      );

      const database = db();

      // Get team member count
      const [{ memberCount }] = await database
        .select({ memberCount: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      // Get team member IDs
      const teamMemberIds = await database
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      const memberIds = teamMemberIds.map((m) => m.userId);

      // Get credit usage
      const creditUsageResults =
        memberIds.length > 0
          ? await database
              .select({
                userId: transactions.userId,
                credits: sum(transactions.amount),
              })
              .from(transactions)
              .where(inArray(transactions.userId, memberIds))
              .groupBy(transactions.userId)
          : [];

      const totalCreditsConsumed = creditUsageResults.reduce(
        (sum: number, row: CreditUsageRow) => sum + Number(row.credits) || 0,
        0
      );

      // Sort by credits consumed
      const topContributors = creditUsageResults
        .map((usage) => ({
          userId: usage.userId,
          creditsConsumed: Number(usage.credits) || 0,
        }))
        .sort((a, b) => b.creditsConsumed - a.creditsConsumed);

      return {
        memberCount,
        totalCreditsConsumed,
        topContributors,
      };
    } catch (error) {
      logger.error("Failed to get member usage stats", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestingUserId,
      });

      throw new DatabaseError("Failed to get member usage stats");
    }
  }

  /**
   * Invalidate team analytics cache
   */
  async invalidateTeamAnalyticsCache(teamId: string): Promise<void> {
    const cacheKey = `team:${teamId}:analytics`;
    await teamCache.invalidate(cacheKey);
  }
}

export const teamAnalyticsService = TeamAnalyticsService.getInstance();
