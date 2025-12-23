import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  DatabaseError,
} from "@/lib/api-utils";

const addCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(100, "Minimum $1.00 purchase")
    .max(100000, "Maximum $1000.00 purchase"),
  paymentMethodId: z.string().min(1, "Payment method required"),
});

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const user = await currentUser();
    if (!user?.id) {
      throw new AuthenticationError("Authentication required");
    }

    // Validation
    const validation = await validateRequest(addCreditsSchema, "body")(req);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const { amount } = validation.data;
    const database = db();

    // Get user record
    const [userRecord] = await database
      .select()
      .from(users)
      .where(eq(users.clerkId, user.id))
      .limit(1);

    if (!userRecord) {
      throw new AuthenticationError("User not found");
    }

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
        userId: userRecord.id,
        amount: amount, // in cents
        creditsAdded: creditsToAdd,
        stripePaymentId: mockPaymentId,
      })
      .returning();

    // Update user credits
    const [updatedUser] = await database
      .update(users)
      .set({
        credits: userRecord.credits + creditsToAdd,
        subscriptionTier:
          creditsToAdd >= 500 ? "pro" : userRecord.subscriptionTier,
      })
      .where(eq(users.clerkId, user.id))
      .returning();

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
    console.error("Credit purchase error:", error);

    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError ||
      error instanceof DatabaseError
    ) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Unexpected error in credit purchase"),
    );
  }
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      throw new AuthenticationError("Authentication required");
    }

    const database = db();

    // Get user record with transaction history
    const [userRecord] = await database
      .select()
      .from(users)
      .where(eq(users.clerkId, user.id))
      .limit(1);

    if (!userRecord) {
      throw new AuthenticationError("User not found");
    }

    // Get transaction history
    const transactionHistory = await database
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userRecord.id))
      .orderBy(transactions.createdAt);

    return formatSuccessResponse({
      credits: userRecord.credits,
      subscriptionTier: userRecord.subscriptionTier,
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
    console.error("Credits fetch error:", error);

    if (error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Failed to fetch credit information"),
    );
  }
}
