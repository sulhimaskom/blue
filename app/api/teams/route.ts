import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";
import { teamService } from "@/lib/services/team-service";

// Validation schemas
const createTeamSchema = z.object({
  name: z.string()
    .min(1, "Team name is required")
    .max(100, "Team name must be 100 characters or less")
    .trim(),
  subscriptionTier: z.enum(["free", "pro", "enterprise"]).optional(),
});

/**
 * Create a new team
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  requireCredits: 50, // Team creation costs 50 credits
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  schema: createTeamSchema,
  handler: async ({ context, user }) => {
    const { name, subscriptionTier } = context.validatedData;
    
    const team = await teamService.createTeam({
      name,
      ownerId: user.id,
      subscriptionTier,
    });

    return {
      data: team,
      message: "Team created successfully",
    };
  },
});

/**
 * Get teams for the authenticated user
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const { searchParams } = context;
    
    const options = {
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
      search: searchParams.get("search") || undefined,
    };

    const result = await teamService.getUserTeams(user.id, options);

    return {
      data: result,
      message: "Teams retrieved successfully",
    };
  },
});