import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { DatabaseError } from "@/lib/api-utils";

export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.creditsGet()(identifier),
    handler: async ({ context, user }) => {
      const breakdownResult = await SubscriptionService.getInstance().getCreditUsageBreakdown(user!.id);

      if (!breakdownResult.success || !breakdownResult.data) {
        logger.apiError(
          "Failed to get credit usage breakdown",
          context.requestId,
          new Error(breakdownResult.error || "Unknown error"),
          { userId: user!.id },
        );
        throw new DatabaseError("Failed to get credit usage breakdown");
      }

      const { breakdown, chartData, recommendations, topOperations, totalCredits } = breakdownResult.data;

      logger.userAction("Credit usage breakdown fetched", user!.clerkId, {
        requestId: context.requestId,
        userId: user!.id,
        totalCredits,
      });

      return {
        breakdown,
        chartData,
        recommendations,
        topOperations,
        totalCredits,
        summary: {
          mostConsumed: topOperations[0]?.type || "none",
          totalOperations: Object.values(breakdown).reduce((sum, op) => sum + (op?.count || 0), 0),
          averageDailyUsage: totalCredits > 0 ? Math.round(totalCredits / 90) : 0,
        },
      };
    },
  },
  {
    ttl: 900,
    tags: ["credit-usage", "user-specific"],
    varyBy: ["userId"],
  },
);
