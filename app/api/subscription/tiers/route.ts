import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { RateLimiters } from "@/lib/rate-limit-config";

/**
 * GET /api/subscription/tiers
 * 
 * Get all available subscription tiers with their features and pricing
 * 
 * Rate Limit: 30 requests/minute (standard - public endpoint)
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false, // Public endpoint for pricing display
  rateLimiter: RateLimiters.standard(),
  handler: async ({ context }) => {
    const result = await subscriptionService.getSubscriptionTiers();
    
    if (!result.success) {
      throw result.error;
    }

    return {
      tiers: result.data,
    };
  },
});