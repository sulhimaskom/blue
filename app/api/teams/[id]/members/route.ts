import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { ValidationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

// Validation schemas
const inviteMemberSchema = z.object({
  email: z.string()
    .email("Valid email is required")
    .min(1, "Email is required")
    .trim(),
  role: z.enum(["admin", "member", "viewer"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Invite a member to team
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    requireCredits: 10,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: inviteMemberSchema,
    handler: async ({ context, user, data }) => {
      const subscriptionService = SubscriptionService.getInstance();

      const canInviteResult = await subscriptionService.canInviteTeamMember(user!.id);

      if (!canInviteResult.success || !canInviteResult.data) {
        throw new ValidationError(
          canInviteResult.error || "Failed to validate team member invitation",
        );
      }

      if (!canInviteResult.data.canInvite) {
        throw new ValidationError(
          canInviteResult.data.reason || "Cannot invite team member. Subscription limit reached.",
        );
      }

      const { email, role } = data!;

      const result = await teamService.inviteTeamMember(teamId, {
        email,
        role,
      }, user!.id);

      logger.userAction("Team member invited", user!.clerkId, {
        requestId: context.requestId,
        teamId,
        email,
        role,
        currentCount: canInviteResult.data.currentCount,
        limit: canInviteResult.data.limit,
      });

      return {
        data: result,
        message: "Team member invited successfully",
      };
    },
  })(req);
}

/**
 * Get team members
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      const team = await teamService.getTeamById(teamId, user!.id);

      return {
        data: {
          members: team.members || [],
          total: team.memberCount,
        },
        message: "Team members retrieved successfully",
      };
    },
  })(req);
}
