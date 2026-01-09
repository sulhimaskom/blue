import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { StripePaymentService } from "@/lib/services/stripe-payment-service";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";

const stripeService = StripePaymentService.getInstance();

export async function POST(request: NextRequest): Promise<Response> {
  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.webhook()(identifier);

  if (!rateLimitCheck.allowed) {
    const response = formatErrorResponse(
      new Error("Rate limit exceeded. Try again in 60 seconds."),
    );
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set(
      "X-RateLimit-Reset",
      Math.ceil(Date.now() / 1000 + 60).toString(),
    );
    return response;
  }

  return WebhookService.processWebhookWithReliability(request, {
    serviceName: "Stripe",
    verifySignature: (body: string, headers: Headers) =>
      SecurityService.verifyStripeWebhook(body, headers),
    useQueue: true,
    processEvent: async (event: unknown, context: { requestId: string }) => {
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

      const response = formatErrorResponse(
        new Error("Rate limit exceeded. Please try again later."),
      );
      response.headers.set("X-RateLimit-Limit", "60");
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(Date.now() / 1000 + 60).toString(),
      );
      return response;
    }

    const isConfigured = stripeService.isConfigured();
    const publishableKey = isConfigured
      ? stripeService.getPublishableKey()
      : null;

    logger.info("Stripe webhook health check", {
      requestId,
      configured: isConfigured,
    });

    return formatSuccessResponse({
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

    return formatErrorResponse(
      error instanceof Error ? error : new Error("Health check failed"),
    );
  }
}
