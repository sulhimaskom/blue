import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";
import { ServiceError } from '@/lib/services/service-error-handler';

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
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      const { id } = await params;
      const team = await teamService.getTeamById(id, user!.id);

      return {
        data: team,
        message: "Team details retrieved successfully",
      };
    },
  })(req);
}

/**
 * Update team settings
 */
export async function PUT(req: NextRequest, { params: _ }: RouteParams) {
  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    schema: updateTeamSchema,
    handler: async () => {
      // Note: Team name update would need to be implemented in TeamService
      // For now, this is a placeholder that would update team name
      throw new ServiceError("Team update functionality not yet implemented", "TeamService", "update");
    },
  })(req);
}

/**
 * Delete team
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }) => {
      const { id } = await params;
      await teamService.deleteTeam(id, user!.id);

      return {
        data: null,
        message: "Team deleted successfully",
      };
    },
  })(req);
}