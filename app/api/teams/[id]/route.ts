import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";

// Validation schemas
const updateTeamSchema = z.object({
  name: z.string()
    .min(1, "Team name is required")
    .max(100, "Team name must be 100 characters or less")
    .trim(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get team details
 * Cache: 120 seconds (2 minutes) - team details change moderately
 * Cache Invalidation: Tag-based for team updates
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createCachedGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      const team = await teamService.getTeamById(teamId, user!.id);

      return {
        data: team,
        message: "Team details retrieved successfully",
      };
    },
  }, {
    ttl: 120,
    tags: ["team-details", "teams"],
    varyBy: ["userId", "teamId"],
  })(req);
}

/**
 * Update team settings
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    schema: updateTeamSchema,
    handler: async ({ user, data }) => {
      const { name } = data!;

      const updatedTeam = await teamService.updateTeamName(
        teamId,
        name,
        user!.id
      );

      return {
        data: updatedTeam,
        message: "Team updated successfully",
      };
    },
  })(req);
}

/**
 * Delete team
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createDELETEHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }) => {
      await teamService.deleteTeam(teamId, user!.id);

      return {
        data: null,
        message: "Team deleted successfully",
      };
    },
  })(req);
}