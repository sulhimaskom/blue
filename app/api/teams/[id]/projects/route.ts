import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";

// Validation schemas
const addProjectSchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
  role: z.enum(["admin", "member", "viewer"]).optional().default("member"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Add project to team
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    requireCredits: 5, // Adding project to team costs 5 credits
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: addProjectSchema,
    handler: async ({ user, data }) => {
      const { projectId, role } = data!;

      const teamProject = await teamService.addProjectToTeam(
        teamId,
        projectId,
        role,
        user!.id
      );

      return {
        data: teamProject,
        message: "Project added to team successfully",
      };
    },
  })(req);
}

/**
 * Get team projects
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: teamId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user, req: request }) => {
      const url = new URL(request.url);
      const searchParams = url.searchParams;
      
      const options = {
        limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
        offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
      };

      const result = await teamService.getTeamProjects(teamId, user!.id, options);

      return {
        data: result,
        message: "Team projects retrieved successfully",
      };
    },
  })(req);
}