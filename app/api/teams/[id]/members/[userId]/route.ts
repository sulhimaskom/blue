import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";

// Validation schemas
const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * Update team member role
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { id: teamId, userId } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: updateMemberRoleSchema,
    handler: async ({ context, user }) => {
      const { role } = context.validatedData;
      
      const updatedMember = await teamService.updateTeamMemberRole(
        teamId,
        parseInt(userId),
        role,
        user.id
      );

      return {
        data: updatedMember,
        message: "Team member role updated successfully",
      };
    },
  })(req);
}

/**
 * Remove team member
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { id: teamId, userId } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }) => {
      await teamService.removeTeamMember(
        teamId,
        parseInt(userId),
        user.id
      );

      return {
        data: null,
        message: "Team member removed successfully",
      };
    },
  })(req);
}