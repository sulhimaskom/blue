import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService } from "@/lib/services/subscription-service";
import { stripePaymentService } from "@/lib/services/stripe-payment-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";

const upgradeRequestSchema = z.object({
  tier: z.enum(["free", "pro", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

/**
 * POST /api/subscription/upgrade
 * 
 * Request subscription tier upgrade
 * Creates Stripe checkout session for payment processing
 * 
 * Rate Limit: 10 requests/minute (moderate - payment operation)
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  requireCredits: 0, // No credits required for upgrade
  rateLimiter: RateLimiters.moderate(),
  schema: upgradeRequestSchema,
  handler: async ({ user, validatedData }) => {
    const { tier, billingCycle } = validatedData;

    // Get tier information
    const tierResult = await subscriptionService.getSubscriptionTier(tier);
    if (!tierResult.success || !tierResult.data) {
      throw new Error("Invalid subscription tier");
    }

    // Check if user is already on this tier or higher
    const currentSubscriptionResult = await subscriptionService.getCurrentUserSubscription(user.id);
    if (!currentSubscriptionResult.success) {
      throw currentSubscriptionResult.error;
    }

    const currentTier = currentSubscriptionResult.data.tier;
    const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
    
    if (tierHierarchy[tier] <= tierHierarchy[currentTier]) {
      throw new Error("Cannot downgrade to same or lower tier");
    }

    // Create Stripe checkout session
    const price = billingCycle === "yearly" 
      ? tierResult.data.pricing.yearly 
      : tierResult.data.pricing.monthly;
    
    const stripePriceId = billingCycle === "yearly"
      ? tierResult.data.stripePriceIds.yearly
      : tierResult.data.stripePriceIds.monthly;

    if (!stripePriceId) {
      throw new Error("Stripe price ID not configured for this tier");
    }

    const checkoutResult = await stripePaymentService.createCheckoutSession({
      userId: user.id,
      priceId: stripePriceId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=cancelled`,
      metadata: {
        upgradeTier: tier,
        billingCycle,
      },
    });

    if (!checkoutResult.success) {
      throw checkoutResult.error;
    }

    return {
      checkoutUrl: checkoutResult.data.checkoutUrl,
      sessionId: checkoutResult.data.sessionId,
      tier,
      price,
      billingCycle,
    };
  },
});