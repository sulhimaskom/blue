import { z } from "zod";
import { logger } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { CREDIT_RULES, PRICING_PACKAGES } from "@/lib/constants";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { IdGenerators } from "@/lib/utils/id-generator";

const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(CREDIT_RULES.MINIMUM_PURCHASE, "Minimum $1.00 purchase")
    .max(CREDIT_RULES.MAXIMUM_PURCHASE, "Maximum $1000.00 purchase"),
  paymentMethodId: z.string().min(1, "Payment method required"),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: addCreditsSchema,
  requireAuth: true,
  handler: async ({ context, user, data }) => {
    const amount = data!.amount;

    // TODO: In Phase 4, this will integrate with actual Stripe payment processing
    // For now, we'll simulate successful payment and add credits
    // Credit conversion using constants
    const creditsToAdd = Math.floor(amount / CREDIT_RULES.CONVERSION_RATE);

    // Generate secure mock payment ID
    const mockPaymentId = IdGenerators.PAYMENT();

    // Create transaction record
    const newTransaction = await ProjectDataService.createTransaction(
      user!.id,
      amount,
      creditsToAdd,
      mockPaymentId,
    );

    // Update subscription tier if needed (non-critical, handled in service)
    await UserService.updateSubscriptionTierIfNeeded(
      user!.id,
      creditsToAdd,
      context,
    );

    // Update user credits using service
    const updatedUser = await UserService.updateUserCredits(
      user!.id,
      creditsToAdd,
      context,
    );

    logger.userAction("Credits purchased", user!.clerkId, {
      requestId: context.requestId,
      transactionId: newTransaction.id,
      amount: (amount || 0) / 100,
      creditsAdded: creditsToAdd,
      paymentId: mockPaymentId,
      newTotal: updatedUser.credits,
    });

    return {
      transactionId: newTransaction.id,
      creditsAdded: creditsToAdd,
      totalCredits: updatedUser.credits,
      amount: amount / 100, // convert back to dollars
      subscriptionTier: updatedUser.subscriptionTier,
      paymentId: mockPaymentId,
      message:
        "Credits added successfully. Stripe payment integration will be available in Phase 4.",
    };
  },
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  handler: async ({ context, user }) => {
    // Get transaction history
    const transactionHistory = await ProjectDataService.getUserTransactions(
      user!.id,
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
    };
  },
});
