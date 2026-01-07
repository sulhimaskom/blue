import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { CREDIT_RULES } from "@/lib/constants";
import { RateLimiters } from "@/lib/rate-limit-config";
import {
  StripeWebhookEvent,
  isStripePaymentIntentSucceeded,
  isStripeInvoicePaymentSucceeded,
  type WebhookContext,
} from "@/lib/types/webhook-events";

export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.webhook()(identifier);

  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }

  return WebhookService.processWebhookWithReliability(req, {
    serviceName: "Stripe",
    verifySignature: SecurityService.verifyStripeWebhook,
    useQueue: true, // Enable reliable queue-based processing
    processEvent: async (
      event: StripeWebhookEvent,
      context: WebhookContext,
    ) => {
      const database = db();

      // Handle payment intent succeeded
      if (isStripePaymentIntentSucceeded(event)) {
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
                  creditsToAdd >= CREDIT_RULES.PRO_THRESHOLD
                    ? "pro"
                    : userRecord.subscriptionTier,
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
      else if (isStripeInvoicePaymentSucceeded(event)) {
        const { subscription } = event.data.object;

        // Enhanced subscription handling in Phase 4
        logger.systemEvent("Subscription payment processed via webhook", {
          requestId: context.requestId,
          subscription,
          eventType: "invoice.payment_succeeded",
        });
      }
    },
  });
}

export async function OPTIONS() {
  return WebhookService.handleOptions();
}
