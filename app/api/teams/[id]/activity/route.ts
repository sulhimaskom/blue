import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { teamService } from "@/lib/services/team-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";
import type { ActivityFilterOptions } from "@/lib/services/activity-feed-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventTypes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const queryParams = Object.fromEntries(req.nextUrl.searchParams);
      const validatedQuery = ActivityQuerySchema.parse(queryParams);

      const team = await teamService.getTeamById(id, user!.id);

      const options: ActivityFilterOptions = {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
      };

      if (validatedQuery.startDate) {
        options.startDate = new Date(validatedQuery.startDate);
      }

      if (validatedQuery.endDate) {
        options.endDate = new Date(validatedQuery.endDate);
      }

      if (validatedQuery.eventTypes) {
        options.eventTypes = validatedQuery.eventTypes.split(",");
      }

      const activity = await ActivityFeedService.getTeamActivity(
        id,
        options,
        context,
      );

      logger.userAction("Team activity fetched", user!.clerkId, {
        requestId: context.requestId,
        teamId: id,
        teamName: team.name,
        activitiesCount: activity.length,
      });

      return {
        activity,
        team: {
          id: team.id,
          name: team.name,
        },
        message: "Team activity retrieved successfully",
      };
    },
  })(req);
}
