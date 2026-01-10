import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { db } from "@/lib/db";
import { teams, teamMembers, transactions } from "@/lib/db/schema";
import { eq, and, count, sum, isNull, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get team usage analytics
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      try {
        const database = db();
        
        // Verify user has access to team analytics (admin or member)
        const accessCheck = await database.select({
          role: teamMembers.role,
        }).from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.id))
          .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, user!.id),
            isNull(teamMembers.deletedAt),
            isNull(teams.deletedAt)
          ))
          .limit(1);

        if (!accessCheck.length || !["admin", "member"].includes(accessCheck[0].role)) {
          throw new Error("Insufficient permissions to view team analytics");
        }

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
        
        const memberIds = teamMemberIds.map(m => m.userId);
        
        const creditUsageResults = memberIds.length > 0 ? await database
          .select({
            userId: transactions.userId,
            credits: sum(transactions.amount),
          })
          .from(transactions)
          .where(inArray(transactions.userId, memberIds))
          .groupBy(transactions.userId) : [];

        const totalCreditsConsumed = creditUsageResults.reduce(
          (sum: number, row: any) => sum + (row.credits || 0),
          0
        );

        // Get project counts and activity
        // This is a simplified version - in a real app you'd have more sophisticated analytics
        const analytics = {
          teamId,
          memberCount,
          projectCount: projectCount || 0,
          totalCreditsConsumed,
          memberCreditUsage: creditUsageResults.map(usage => ({
            userId: usage.userId,
            creditsConsumed: usage.credits || 0,
          })),
          // Additional metrics would be added here
          createdAt: new Date().toISOString(),
        };

        return {
          data: analytics,
          message: "Team usage analytics retrieved successfully",
        };
      } catch (error) {
        logger.error("Failed to get team analytics", {
          error: error instanceof Error ? error.message : String(error),
          teamId,
          userId: user!.id,
        });

        if (error instanceof Error && error.message.includes("Insufficient permissions")) {
          throw new Error(error.message);
        }

        throw new Error("Failed to get team analytics");
      }
    },
  })(req);
}