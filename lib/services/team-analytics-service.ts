import { eq, and, count, isNull, inArray, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers, transactions } from "@/lib/db/schema";
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

export interface TeamAnalytics {
  teamId: string;
  memberCount: number;
  projectCount: number;
  totalCreditsConsumed: number;
  memberCreditUsage: Array<{ userId: number; creditsConsumed: number }>;
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
        (sum: number, row: any) => sum + (row.credits || 0),
        0
      );

      const analytics = {
        teamId,
        memberCount,
        projectCount: projectCount || 0,
        totalCreditsConsumed,
        memberCreditUsage: creditUsageResults.map((usage) => ({
          userId: usage.userId,
          creditsConsumed: Number(usage.credits) || 0,
        })),
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
        (sum: number, row: any) => sum + (row.credits || 0),
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
