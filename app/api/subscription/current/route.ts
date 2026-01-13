import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { AuthenticationError } from "@/lib/api-utils";

/**
 * GET /api/subscription/current
 * 
 * Get current user's subscription tier, limits, and usage
 * 
 * Rate Limit: 30 requests/minute (standard)
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async ({ user }) => {
    if (!user) {
      throw new AuthenticationError("User authentication required");
    }

    const result = await subscriptionService.getCurrentUserSubscription(user.id);

    if (!result.success || !result.data) {
      throw result.error || new Error("Failed to get subscription");
    }

    return {
      subscription: {
        tier: result.data.tier,
        limits: result.data.limits,
        features: result.data.features,
        pricing: result.data.pricing,
        usage: result.data.usage,
      },
    };
  },
});