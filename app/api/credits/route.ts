import { z } from 'zod';
import { logger } from '@/lib/logger';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { CREDIT_RULES, PRICING_PACKAGES } from '@/lib/constants';
import { ProjectDataService } from '@/lib/services/project-data-service';
import { StripePaymentService } from '@/lib/services/stripe-payment-service';
import { CreditProcessingService } from '@/lib/services/credit-processing-service';
import type { Transaction } from '@/lib/db/schema';
import { RateLimiters } from '@/lib/rate-limit-config';

const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(CREDIT_RULES.MINIMUM_PURCHASE, 'Minimum $1.00 purchase')
    .max(CREDIT_RULES.MAXIMUM_PURCHASE, 'Maximum $1000.00 purchase'),
  paymentMethodId: z.string().min(1, 'Payment method required'),
  confirmImmediate: z.boolean().optional().default(false),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: addCreditsSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.creditsPost()(identifier),
  handler: async ({ context, user, data }) => {
    // Delegate credit purchase processing to service
    const purchaseResult = await CreditProcessingService.processCreditPurchase(
      user!.id,
      user!.clerkId,
      {
        amount: data!.amount,
        paymentMethodId: data!.paymentMethodId,
        confirmImmediate: data!.confirmImmediate || false,
      },
      context
    );

    return purchaseResult;
  },
});

export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.creditsGet()(identifier),
    handler: async ({ context, user }) => {
      const stripeService = StripePaymentService.getInstance();
      const transactionHistory = await ProjectDataService.getUserTransactions(user!.id);

      logger.userAction('Credits information fetched', user!.clerkId, {
        requestId: context.requestId,
        currentCredits: user!.credits,
        transactionCount: transactionHistory.length,
      });

      return {
        credits: user!.credits,
        subscriptionTier: user!.subscriptionTier,
        transactions: transactionHistory.map((t: Transaction) => ({
          id: t.id,
          amount: t.amount,
          creditsAdded: t.creditsAdded,
          createdAt: t.createdAt,
          paymentId: t.stripePaymentId,
        })),
        pricing: {
          creditValue: `$0.10 per credit`,
          packages: PRICING_PACKAGES,
        },
        stripeConfig: {
          configured: stripeService.isConfigured(),
          publishableKey: stripeService.isConfigured() ? stripeService.getPublishableKey() : null,
        },
      };
    },
  },
  {
    ttl: 900,
    tags: ['credits', 'user-specific'],
    varyBy: ['userId'],
  }
);
