import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { subscriptionService, type SubscriptionTier } from "@/lib/services/subscription-service";
import { stripePaymentService } from "@/lib/services/stripe-payment-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { z } from "zod";
import { AuthenticationError, ValidationError } from "@/lib/api-utils";
import { env } from "@/lib/env";

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
  handler: async ({ user, data }) => {
    if (!user) {
      throw new AuthenticationError("User authentication required");
    }

    if (!data) {
      throw new ValidationError("Invalid request data");
    }

    const { tier, billingCycle } = data;
    const resolvedBillingCycle = billingCycle ?? "monthly";

    // Get tier information
    const tierResult = await subscriptionService.getSubscriptionTier(tier);
    if (!tierResult.success || !tierResult.data) {
      throw new ValidationError("Invalid subscription tier");
    }

    // Check if user is already on this tier or higher
    const currentSubscriptionResult = await subscriptionService.getCurrentUserSubscription(user.id);
    if (!currentSubscriptionResult.success || !currentSubscriptionResult.data) {
      throw currentSubscriptionResult.error || new Error("Failed to get current subscription");
    }

    const currentTier = currentSubscriptionResult.data.tier;
    const tierHierarchy: Record<SubscriptionTier, number> = { free: 0, pro: 1, enterprise: 2 };

    if (tierHierarchy[tier] <= tierHierarchy[currentTier]) {
      throw new ValidationError("Cannot downgrade to same or lower tier");
    }

    // Create Stripe checkout session
    const price = resolvedBillingCycle === "yearly"
      ? tierResult.data.pricing.yearly
      : tierResult.data.pricing.monthly;

    const stripePriceId = resolvedBillingCycle === "yearly"
      ? tierResult.data.stripePriceIds.yearly
      : tierResult.data.stripePriceIds.monthly;

    if (!stripePriceId) {
      throw new ValidationError("Stripe price ID not configured for this tier");
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL;

    const checkoutResult = await stripePaymentService.createCheckoutSession({
      userId: user.id,
      priceId: stripePriceId,
      successUrl: `${appUrl}/dashboard?upgrade=success`,
      cancelUrl: `${appUrl}/dashboard?upgrade=cancelled`,
      metadata: {
        upgradeTier: tier,
        billingCycle: resolvedBillingCycle,
      },
    });

    return {
      checkoutUrl: checkoutResult.checkoutUrl,
      sessionId: checkoutResult.sessionId,
      tier,
      price,
      billingCycle: resolvedBillingCycle,
    };
  },
});