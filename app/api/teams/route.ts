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
  handler: async ({ user, data }) => {
    const { name, subscriptionTier } = data!;
    
    const team = await teamService.createTeam({
      name,
      ownerId: user!.id,
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
export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user, req }) => {
      const url = new URL(req.url);
      const searchParams = url.searchParams;

      const options = {
        limit: Math.min(
          parseInt(searchParams.get("limit") || "100"),
          1000
        ),
        offset: Math.max(
          parseInt(searchParams.get("offset") || "0"),
          0
        ),
        search: searchParams.get("search")?.substring(0, 100) || undefined,
      };

      const result = await teamService.getUserTeams(user!.id, options);

      return {
        data: result,
        message: "Teams retrieved successfully",
      };
    },
  },
  {
    ttl: 300,
    tags: ["teams"],
    varyBy: ["limit", "offset", "search"],
    initializeServices: true,
  },
);