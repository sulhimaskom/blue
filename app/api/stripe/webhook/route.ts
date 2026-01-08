import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { StripePaymentService } from "@/lib/services/stripe-payment-service";

const stripeService = StripePaymentService.getInstance();

export async function POST(request: NextRequest): Promise<Response> {
  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
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

  return WebhookService.processWebhookWithReliability(request, {
    serviceName: "Stripe",
    verifySignature: (body: string, headers: Headers) =>
      SecurityService.verifyStripeWebhook(body, headers),
    useQueue: true,
    processEvent: async (event: any, context: { requestId: string }) => {
      const body = JSON.stringify(event);
      const signature = request.headers.get("stripe-signature") || "";

      const result = await stripeService.processWebhookEvent(body, signature, {
        requestId: context.requestId,
      });

      logger.systemEvent("Webhook processed successfully", {
        requestId: context.requestId,
        eventType: result.type,
      });
    },
  });
}

// Health check endpoint for monitoring
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting for health check endpoint
    const identifier =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "anonymous";
    const rateLimitCheck = await RateLimiters.permissive()(identifier);

    if (!rateLimitCheck.allowed) {
      logger.warn("Rate limit exceeded for Stripe webhook health check", {
        requestId,
        identifier,
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
          },
        },
      );
    }

    const isConfigured = stripeService.isConfigured();
    const publishableKey = isConfigured
      ? stripeService.getPublishableKey()
      : null;

    logger.info("Stripe webhook health check", {
      requestId,
      configured: isConfigured,
    });

    return NextResponse.json({
      status: "ok",
      configured: isConfigured,
      hasPublishableKey: !!publishableKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Stripe webhook health check failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { status: "error", message: "Health check failed" },
      { status: 500 },
    );
  }
}
