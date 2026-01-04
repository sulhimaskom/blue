import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { StripePaymentService } from "@/lib/services/stripe-payment-service";

const stripeService = StripePaymentService.getInstance();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Validate webhook signature
    if (!signature) {
      logger.error("Webhook missing stripe-signature header", { requestId });
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
export async function GET(): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
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
