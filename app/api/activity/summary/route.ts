import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";

const ActivitySummaryQuerySchema = z.object({
  entityType: z.enum(["project", "team", "user", "blueprint", "deployment"]).optional(),
  entityId: z.string().optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user, req }) => {
      const queryParams = Object.fromEntries(req.nextUrl.searchParams);
      const validatedQuery = ActivitySummaryQuerySchema.parse(queryParams);

      const summary = await ActivityFeedService.getActivitySummary(
        validatedQuery.entityType,
        validatedQuery.entityId,
        context,
      );

      logger.userAction("Activity summary fetched", user!.clerkId, {
        requestId: context.requestId,
        userId: user!.id,
        entityType: validatedQuery.entityType,
        entityId: validatedQuery.entityId,
        totalActivities: summary.totalActivities,
      });

      return {
        summary,
        message: "Activity summary retrieved successfully",
      };
    },
  },
  {
    ttl: 120,
    tags: ["activity-summary", "user-activity"],
    varyBy: ["userId"],
  },
);
