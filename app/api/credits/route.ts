import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";

const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(100, "Minimum $1.00 purchase")
    .max(100000, "Maximum $1000.00 purchase"),
  paymentMethodId: z.string().min(1, "Payment method required"),
});

export async function POST(req: NextRequest) {
  const context = createRequestContext();
  let authenticatedUser:
    | import("@/lib/services/user-service").AuthenticatedUser
    | null = null;
  let amount: number | undefined;

  try {
    // Authentication and user record fetch
    authenticatedUser = await UserService.getAuthenticatedUser(context);

    // Validation
    const validation = await validateRequest(addCreditsSchema, "body")(req);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    amount = validation.data.amount;
    const database = db();

    // TODO: In Phase 4, this will integrate with actual Stripe payment processing
    // For now, we'll simulate successful payment and add credits
    // Credit conversion: $1 = 10 credits (1 credit = $0.10)
    const creditsToAdd = Math.floor(amount / 10);

    // Simulate Stripe payment ID
    const mockPaymentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create transaction record
    const [newTransaction] = await database
      .insert(transactions)
      .values({
        userId: authenticatedUser.id,
        amount: amount, // in cents
        creditsAdded: creditsToAdd,
        stripePaymentId: mockPaymentId,
      })
      .returning();

    // Update subscription tier if needed (non-critical, handled in service)
    await UserService.updateSubscriptionTierIfNeeded(
      authenticatedUser.id,
      creditsToAdd,
      context,
    );

    // Update user credits using service
    const updatedUser = await UserService.updateUserCredits(
      authenticatedUser.id,
      creditsToAdd,
      context,
    );

    logger.userAction("Credits purchased", authenticatedUser.clerkId, {
      requestId: context.requestId,
      transactionId: newTransaction.id,
      amount: (amount || 0) / 100,
      creditsAdded: creditsToAdd,
      paymentId: mockPaymentId,
      newTotal: updatedUser.credits,
    });

    return formatSuccessResponse({
      transactionId: newTransaction.id,
      creditsAdded: creditsToAdd,
      totalCredits: updatedUser.credits,
      amount: amount / 100, // convert back to dollars
      subscriptionTier: updatedUser.subscriptionTier,
      paymentId: mockPaymentId,
      message:
        "Credits added successfully. Stripe payment integration will be available in Phase 4.",
    });
  } catch (error) {
    logger.apiError(
      "Credit purchase error",
      context.requestId,
      error as Error,
      {
        userId: authenticatedUser?.clerkId,
        endpoint: "/api/credits",
        amount: amount! / 100,
      },
    );

    if (error instanceof ValidationError || error instanceof DatabaseError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Unexpected error in credit purchase"),
    );
  }
}

export async function GET() {
  const context = createRequestContext();
  let authenticatedUser:
    | import("@/lib/services/user-service").AuthenticatedUser
    | null = null;

  try {
    // Authentication and user record fetch
    authenticatedUser = await UserService.getAuthenticatedUser(context);

    const database = db();

    // Get transaction history
    const transactionHistory = await database
      .select()
      .from(transactions)
      .where(eq(transactions.userId, authenticatedUser.id))
      .orderBy(transactions.createdAt);

    logger.userAction(
      "Credits information fetched",
      authenticatedUser.clerkId,
      {
        requestId: context.requestId,
        currentCredits: authenticatedUser.credits,
        transactionCount: transactionHistory.length,
      },
    );

    return formatSuccessResponse({
      credits: authenticatedUser.credits,
      subscriptionTier: authenticatedUser.subscriptionTier,
      transactions: transactionHistory.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        creditsAdded: t.creditsAdded,
        createdAt: t.createdAt,
        paymentId: t.stripePaymentId,
      })),
      pricing: {
        creditValue: "$0.10 per credit",
        packages: [
          { credits: 10, price: "$1.00" },
          { credits: 50, price: "$5.00" },
          { credits: 100, price: "$10.00" },
          { credits: 500, price: "$50.00 (Pro tier)" },
        ],
      },
    });
  } catch (error) {
    logger.apiError("Credits fetch error", context.requestId, error as Error, {
      userId: authenticatedUser?.clerkId,
      endpoint: "/api/credits",
    });

    if (error instanceof DatabaseError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Failed to fetch credit information"),
    );
  }
}
