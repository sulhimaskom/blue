import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";

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
    const result = await subscriptionService.getCurrentUserSubscription(user.id);
    
    if (!result.success) {
      throw result.error;
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