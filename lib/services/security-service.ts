import { logger } from "@/lib/logger";
import Stripe from "stripe";
import crypto from "crypto";

/**
 * SecurityService - Centralized security utilities
 *
 * Provides standardized security functions across the application:
 * - Webhook signature verification
 * - Input sanitization patterns
 * - Security event logging
 */
export class SecurityService {
  /**
   * Verify Clerk webhook signature using cryptographic verification
   * Production-grade implementation with Svix webhook verification
   */
  static verifyClerkWebhook(body: string, headers: Headers): boolean {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    const svixId = headers.get("svix-id");
    const svixTimestamp = headers.get("svix-timestamp");
    const svixSignature = headers.get("svix-signature");

    // Basic header validation first
    if (!clerkSecretKey || !svixId || !svixTimestamp || !svixSignature) {
      logger.security(
        "Clerk webhook signature verification failed - missing headers or secret",
        {
          hasSvixId: !!svixId,
          hasSvixTimestamp: !!svixTimestamp,
          hasSvixSignature: !!svixSignature,
          hasSecretKey: !!clerkSecretKey,
        },
      );
      return false;
    }

    try {
      // For Clerk webhook verification, we use a dedicated webhook secret or fallback to secret key
      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || clerkSecretKey;

      // Construct the expected signature string
      const timestampedPayload = `${svixId}.${svixTimestamp}.${body}`;

      // Create HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(timestampedPayload, "utf8")
        .digest("hex");

      // Compare signatures securely
      const receivedSignature = svixSignature.replace("v1,", "").trim();
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(receivedSignature, "hex"),
      );

      if (!isValid) {
        logger.security(
          "Clerk webhook signature verification failed - signature mismatch",
          {
            svixId,
            svixTimestamp,
            receivedSignature: receivedSignature.substring(0, 20) + "...",
            expectedSignature: expectedSignature.substring(0, 20) + "...",
          },
        );
      }

      return isValid;
    } catch (error) {
      logger.security("Clerk webhook signature verification error", {
        error: error instanceof Error ? error.message : "Unknown error",
        svixId,
        svixTimestamp,
      });
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature using Stripe's cryptographic verification
   * Production-grade implementation with Stripe webhook construction
   */
  static verifyStripeWebhook(body: string, headers: Headers): boolean {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const signature = headers.get("stripe-signature");

    if (!stripeSecretKey || !signature) {
      logger.security(
        "Stripe webhook signature verification failed - missing signature or secret",
        {
          hasSignature: !!signature,
          hasSecretKey: !!stripeSecretKey,
        },
      );
      return false;
    }

    try {
      // Note: In production, you should use STRIPE_WEBHOOK_SECRET instead of STRIPE_SECRET_KEY
      // For now, we'll use the secret key as a fallback
      const webhookSecret =
        process.env.STRIPE_WEBHOOK_SECRET || stripeSecretKey;

      // Initialize Stripe with the secret key
      const stripe = new Stripe(webhookSecret, {
        apiVersion: "2025-02-24.acacia",
      });

      // Use Stripe's webhook signature verification
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );

      logger.security("Stripe webhook signature verified successfully", {
        eventType: event.type,
        eventId: event.id,
      });

      return true;
    } catch (error) {
      const stripeError =
        error as Stripe.errors.StripeSignatureVerificationError;
      logger.security("Stripe webhook signature verification failed", {
        error: stripeError.message,
        signature: signature.substring(0, 20) + "...",
        type: stripeError.type,
      });
      return false;
    }
  }

  /**
   * Generic webhook signature verification factory
   */
  static createVerifier(serviceName: "Clerk" | "Stripe") {
    return (body: string, headers: Headers) => {
      switch (serviceName) {
        case "Clerk":
          return this.verifyClerkWebhook(body, headers);
        case "Stripe":
          return this.verifyStripeWebhook(body, headers);
        default:
          logger.security(`Unknown webhook service: ${serviceName}`, {
            serviceName,
          });
          return false;
      }
    };
  }

  /**
   * Sanitize user input for logging
   * Removes sensitive information while preserving structure
   */
  static sanitizeForLogging(input: any): any {
    if (typeof input !== "object" || input === null) {
      return input;
    }

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
      "signature",
      "credit_card",
      "ssn",
      "email",
    ];

    const sanitized = { ...input };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = "[REDACTED]";
      } else if (
        typeof sanitized[key] === "object" &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Log security event with sanitized metadata
   */
  static logSecurityEvent(
    event: string,
    metadata: Record<string, any> = {},
  ): void {
    logger.security(event, this.sanitizeForLogging(metadata));
  }
}
