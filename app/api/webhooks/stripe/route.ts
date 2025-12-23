import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  formatSuccessResponse,
  formatErrorResponse,
  DatabaseError,
} from "@/lib/api-utils";

// Simple webhook verification for now - enhanced implementation in Phase 4
function verifyStripeWebhook(_body: string, signature: string): boolean {
  // Placeholder verification - implement proper Stripe webhook signing in Phase 4
  return !!signature && signature.startsWith("v1=");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Simple webhook verification (enhanced in Phase 4)
    if (!verifyStripeWebhook(body, signature)) {
      const error = new DatabaseError("Invalid Stripe webhook signature");
      return formatErrorResponse(error);
    }

    try {
      const event = JSON.parse(body) as any;
      const database = db();

      // Handle payment intent succeeded
      if (event.type === "payment_intent.succeeded") {
        const { metadata } = event.data.object;

        if (metadata?.userId && metadata?.creditsAdded) {
          // Find user by clerk ID
          const [userRecord] = await database
            .select()
            .from(users)
            .where(eq(users.clerkId, metadata.userId))
            .limit(1);

          if (userRecord) {
            // Add credits to user account
            const creditsToAdd = parseInt(metadata.creditsAdded);
            await database
              .update(users)
              .set({
                credits: userRecord.credits + creditsToAdd,
                subscriptionTier:
                  creditsToAdd >= 500 ? "pro" : userRecord.subscriptionTier,
              })
              .where(eq(users.clerkId, metadata.userId));

            // Create transaction record
            await database.insert(transactions).values({
              userId: userRecord.id,
              amount: event.data.object.amount,
              creditsAdded: creditsToAdd,
              stripePaymentId: event.data.object.id,
            });

            console.log("Payment processed for user:", metadata.userId);
          }
        }
      }

      // Handle invoice payment succeeded (subscriptions)
      else if (event.type === "invoice.payment_succeeded") {
        const { subscription } = event.data.object;

        // Enhanced subscription handling in Phase 4
        console.log("Subscription payment processed:", subscription);
      }

      return formatSuccessResponse({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing failed:", error);
      const errorResponse = new DatabaseError("Invalid webhook payload");
      return formatErrorResponse(errorResponse);
    }
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return formatErrorResponse(new DatabaseError("Webhook processing failed"));
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
