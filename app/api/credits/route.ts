import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { CREDIT_RULES, PRICING_PACKAGES } from "@/lib/constants";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { IdGenerators } from "@/lib/utils/id-generator";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { StripePaymentService } from "@/lib/services/stripe-payment-service";

const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(CREDIT_RULES.MINIMUM_PURCHASE, "Minimum $1.00 purchase")
    .max(CREDIT_RULES.MAXIMUM_PURCHASE, "Maximum $1000.00 purchase"),
  paymentMethodId: z.string().min(1, "Payment method required"),
  confirmImmediate: z.boolean().optional().default(false),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: addCreditsSchema,
  requireAuth: true,
  handler: async ({ context, user, data }) => {
    const amount = data!.amount;
    const paymentMethodId = data!.paymentMethodId;
    const confirmImmediate = data!.confirmImmediate || false;

    const stripeService = StripePaymentService.getInstance();

    // Check if Stripe is properly configured
    if (!stripeService.isConfigured()) {
      logger.warn("Stripe not configured - using fallback payment simulation", {
        requestId: context.requestId,
        userId: user!.id,
        amount,
      });

      // Fallback to mock payment for development/testing
      const creditsToAdd = Math.floor(amount / CREDIT_RULES.CONVERSION_RATE);
      const mockPaymentId = IdGenerators.PAYMENT();

      const { transaction: newTransaction, user: updatedUser } =
        await ProjectDataService.processCreditPurchase(
          user!.id,
          amount,
          creditsToAdd,
          mockPaymentId,
          context,
        );

      logger.userAction("Credits purchased (mock)", user!.clerkId, {
        requestId: context.requestId,
        transactionId: newTransaction.id,
        amount: amount / 100,
        creditsAdded: creditsToAdd,
        paymentId: mockPaymentId,
        newTotal: updatedUser.credits,
      });

      return {
        transactionId: newTransaction.id,
        creditsAdded: creditsToAdd,
        totalCredits: updatedUser.credits,
        amount: amount / 100,
        subscriptionTier: updatedUser.subscriptionTier,
        paymentId: mockPaymentId,
        message: "Credits added successfully (development mode).",
      };
    }

    // Real Stripe payment processing
    const paymentIntent = await stripeService.createPaymentIntent(
      {
        amount,
        paymentMethodId,
        userId: user!.id.toString(),
        metadata: {
          clerkId: user!.clerkId,
          source: "credits-api",
        },
      },
      context,
    );

    // If payment is immediately confirmed and successful, process credits
    if (confirmImmediate && paymentIntent.status === "succeeded") {
      const creditsToAdd = Math.floor(amount / CREDIT_RULES.CONVERSION_RATE);

      const { transaction: newTransaction, user: updatedUser } =
        await ProjectDataService.processCreditPurchase(
          user!.id,
          amount,
          creditsToAdd,
          paymentIntent.paymentIntentId,
          context,
        );

      logger.userAction("Credits purchased (Stripe)", user!.clerkId, {
        requestId: context.requestId,
        transactionId: newTransaction.id,
        amount: amount / 100,
        creditsAdded: creditsToAdd,
        paymentId: paymentIntent.paymentIntentId,
        newTotal: updatedUser.credits,
      });

      return {
        transactionId: newTransaction.id,
        creditsAdded: creditsToAdd,
        totalCredits: updatedUser.credits,
        amount: amount / 100,
        subscriptionTier: updatedUser.subscriptionTier,
        paymentId: paymentIntent.paymentIntentId,
        stripeClientSecret: paymentIntent.clientSecret,
        paymentStatus: paymentIntent.status,
        message: "Credits added successfully via Stripe payment.",
      };
    }

    // Return payment intent for client-side confirmation
    logger.userAction("Payment intent created", user!.clerkId, {
      requestId: context.requestId,
      amount: amount / 100,
      paymentIntentId: paymentIntent.paymentIntentId,
      paymentStatus: paymentIntent.status,
    });

    return {
      requiresAction: true,
      stripeClientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: amount / 100,
      paymentStatus: paymentIntent.status,
      publishableKey: stripeService.getPublishableKey(),
      message: "Payment initiated. Please confirm the payment to add credits.",
    };
  },
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  handler: async ({ context, user }) => {
    const stripeService = StripePaymentService.getInstance();
    // Get transaction history with caching
    const transactionHistory = await DatabaseQueryCache.executeCachedQuery(
      "user-transactions",
      async () => ProjectDataService.getUserTransactions(user!.id),
      { userId: user!.id },
      { ttl: 900, tags: [`user-${user!.id}`, "transactions", "credits"] },
    );

    logger.userAction("Credits information fetched", user!.clerkId, {
      requestId: context.requestId,
      currentCredits: user!.credits,
      transactionCount: transactionHistory.length,
    });

    return {
      credits: user!.credits,
      subscriptionTier: user!.subscriptionTier,
      transactions: transactionHistory.map((t: any) => ({
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
        publishableKey: stripeService.isConfigured()
          ? stripeService.getPublishableKey()
          : null,
      },
    };
  },
});
