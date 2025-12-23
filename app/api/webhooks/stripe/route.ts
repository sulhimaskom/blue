import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  formatSuccessResponse,
  formatErrorResponse,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";

// Simple webhook verification for now - enhanced implementation in Phase 4
function verifyStripeWebhook(_body: string, signature: string): boolean {
  // Placeholder verification - implement proper Stripe webhook signing in Phase 4
  return !!signature && signature.startsWith("v1=");
}

export async function POST(req: NextRequest) {
  const context = createRequestContext();

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

            logger.userAction(
              "Payment processed via webhook",
              metadata.userId,
              {
                requestId: context.requestId,
                paymentIntent: event.data.object.id,
                amount: event.data.object.amount / 100,
                creditsAdded: creditsToAdd,
                eventType: "payment_intent.succeeded",
              },
            );
          }
        }
      }

      // Handle invoice payment succeeded (subscriptions)
      else if (event.type === "invoice.payment_succeeded") {
        const { subscription } = event.data.object;

        // Enhanced subscription handling in Phase 4
        logger.systemEvent("Subscription payment processed via webhook", {
          requestId: context.requestId,
          subscription,
          eventType: "invoice.payment_succeeded",
        });
      }

      return formatSuccessResponse({ received: true });
    } catch (error) {
      // Defensive: Ensure context is available even in unexpected error scenarios
      const requestId = context?.requestId || "unknown";
      const eventType = event?.type || "unknown";

      logger.apiError(
        "Stripe webhook processing failed",
        requestId,
        error as Error,
        {
          endpoint: "/api/webhooks/stripe",
          eventType,
        },
      );
      const errorResponse = new DatabaseError("Invalid webhook payload");
      return formatErrorResponse(errorResponse);
    }
  } catch (error) {
    // Defensive: Ensure context is available even in unexpected error scenarios
    const requestId = context?.requestId || "unknown";

    logger.apiError("Stripe webhook error", requestId, error as Error, {
      endpoint: "/api/webhooks/stripe",
    });
    return formatErrorResponse(new DatabaseError("Webhook processing failed"));
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
