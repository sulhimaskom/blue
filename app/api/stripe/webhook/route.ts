import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { StripePaymentService } from "@/lib/services/stripe-payment-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const stripeService = StripePaymentService.getInstance();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting for webhook endpoint
    const identifier =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "anonymous";
    const rateLimitCheck = await RateLimiters.webhook()(identifier);

    if (!rateLimitCheck.allowed) {
      logger.warn("Rate limit exceeded for Stripe webhook", {
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
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
          },
        },
      );
    }

    const body = await request.text();

    // First verify using centralized security service
    const isValid = SecurityService.verifyStripeWebhook(body, request.headers);
    if (!isValid) {
      SecurityService.logSecurityEvent(
        "Webhook signature verification failed",
        {
          endpoint: "/api/stripe/webhook",
          requestId,
          hasSignature: !!request.headers.get("stripe-signature"),
        },
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    // Log successful verification
    SecurityService.logSecurityEvent("Webhook signature verified", {
      endpoint: "/api/stripe/webhook",
      requestId,
    });

    // Get signature for processing (after verification)
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      // This should not happen after verification, but keep as safety check
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 },
      );
    }

    // Process webhook event
    const result = await stripeService.processWebhookEvent(body, signature, {
      requestId,
    });

    logger.systemEvent("Webhook processed successfully", {
      requestId,
      eventType: result.type,
    });

    return NextResponse.json({ received: true, type: result.type });
  } catch (error) {
    // Log security event for any processing errors
    SecurityService.logSecurityEvent("Webhook processing error", {
      endpoint: "/api/stripe/webhook",
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.error("Webhook processing error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error && error.message.includes("signature")) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
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
