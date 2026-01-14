import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";

/**
 * GET /api/subscription/tiers
 *
 * Get all available subscription tiers with their features and pricing
 *
 * Rate Limit: 60 requests/minute (permissive - public endpoint)
 * Cache: 1 hour (subscription tiers rarely change)
 */
export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: false,
    rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
    handler: async () => {
      const result = await subscriptionService.getSubscriptionTiers();

      if (!result.success) {
        throw result.error;
      }

      return {
        tiers: result.data,
      };
    },
  },
  {
    ttl: 3600,
    tags: ["subscription:tiers"],
    varyBy: [],
    initializeServices: false,
  },
);