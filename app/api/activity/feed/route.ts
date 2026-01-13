import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";

const ActivityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventTypes: z.string().optional(),
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user, req }) => {
    const queryParams = Object.fromEntries(req.nextUrl.searchParams);
    const validatedQuery = ActivityQuerySchema.parse(queryParams);

    const options: any = {
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

    const activity = await ActivityFeedService.getUserActivity(
      user!.id,
      options,
      context,
    );

    logger.userAction("User activity feed fetched", user!.clerkId, {
      requestId: context.requestId,
      userId: user!.id,
      activitiesCount: activity.length,
    });

    return {
      activity,
      message: "Activity feed retrieved successfully",
    };
  },
});
