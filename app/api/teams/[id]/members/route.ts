import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";

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
 * Invite a member to the team
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    requireCredits: 10, // Team member invitation costs 10 credits
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: inviteMemberSchema,
    handler: async ({ user, data }) => {
      const { email, role } = data!;

      const result = await teamService.inviteTeamMember(teamId, {
        email,
        role,
      }, user!.id);

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
      // This would need to be implemented in TeamService
      // For now, we get the team details which includes members
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