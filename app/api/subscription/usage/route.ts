import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { AuthenticationError, NotFoundError } from "@/lib/api-utils";

/**
 * GET /api/subscription/usage
 * 
 * Get current user's usage metrics and remaining limits
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

    const result = await subscriptionService.getUserUsage(user.id);

    if (!result.success) {
      throw result.error;
    }

    if (!result.data) {
      throw new NotFoundError("Usage data not found");
    }

    return {
      usage: result.data,
    };
  },
});