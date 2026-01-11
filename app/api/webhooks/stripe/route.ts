import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { formatErrorResponse } from "@/lib/api-utils";
import { paymentService } from "@/lib/services/payment-service";
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
    return formatErrorResponse(
      new Error("Rate limit exceeded. Try again in 60 seconds."),
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

      // Handle payment intent succeeded
      if (isStripePaymentIntentSucceeded(event)) {
        const { metadata } = event.data.object;

        if (metadata?.userId && metadata?.creditsAdded) {
          const creditsToAdd = parseInt(metadata.creditsAdded, 10);
          
          if (!isNaN(creditsToAdd) && creditsToAdd > 0) {
            await paymentService.processPayment({
              userId: metadata.userId,
              paymentIntentId: event.data.object.id,
              amount: event.data.object.amount,
              creditsToAdd,
              requestId: context.requestId,
            });
          } else {
            logger.error("Invalid credits amount in metadata", {
              requestId: context.requestId,
              userId: metadata.userId,
              creditsToAdd: metadata.creditsAdded,
              paymentIntent: event.data.object.id,
            });
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
