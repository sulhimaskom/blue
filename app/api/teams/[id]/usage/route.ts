import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { teamService } from "@/lib/services/team-service";
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
      const analytics = await teamService.getTeamAnalytics(teamId, user!.id);

      return {
        data: analytics,
        message: "Team usage analytics retrieved successfully",
      };
    },
  })(req);
}