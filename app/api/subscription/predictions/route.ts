import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { AuthenticationError, NotFoundError } from "@/lib/api-utils";

export const GET = APIRouteHandler.createCachedGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async ({ user }) => {
    if (!user) {
      throw new AuthenticationError("User authentication required");
    }

    const result = await subscriptionService.getPredictiveAnalytics(user.id);

    if (!result.success) {
      throw result.error;
    }

    if (!result.data) {
      throw new NotFoundError("Predictive analytics data not found");
    }

    return {
      predictions: result.data,
    };
  },
}, {
  ttl: 300,
  tags: ["subscription-predictions", "subscription"],
  varyBy: ["userId"],
});
