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
    const { env } = require("@/lib/env");
    const clerkSecretKey = env.CLERK_SECRET_KEY;
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
      const webhookSecret = env.CLERK_WEBHOOK_SECRET || clerkSecretKey;

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
   * Verify Stripe webhook signature using enhanced production-grade cryptographic verification
   * Includes replay attack prevention, timestamp validation, and signature rotation support
   */
  static verifyStripeWebhook(
    body: string,
    headers: Headers,
    options: {
      maxAge?: number; // Maximum age of webhook in seconds (default: 300)
      enforceTimestamp?: boolean; // Enforce timestamp validation (default: true)
    } = {},
  ): boolean {
    const requestId = crypto.randomUUID();
    const { maxAge = 300, enforceTimestamp = true } = options;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const signature = headers.get("stripe-signature");

    if (!stripeSecretKey || !signature) {
      this.logSecurityEvent(
        "Stripe webhook signature verification failed - missing signature or secret",
        {
          requestId,
          hasSignature: !!signature,
          hasSecretKey: !!stripeSecretKey,
          endpoint: "stripe-webhook-verification",
        },
      );
      return false;
    }

    // Enhanced signature format validation
    if (!this.isValidStripeSignatureFormat(signature)) {
      this.logSecurityEvent("Stripe webhook signature format invalid", {
        requestId,
        signaturePrefix: signature.substring(0, 10) + "...",
        endpoint: "stripe-webhook-verification",
      });
      return false;
    }

    // Enhanced timestamp validation for replay attack prevention
    const timestamp = this.extractTimestampFromSignature(signature);
    if (enforceTimestamp && timestamp) {
      if (!this.isTimestampValid(timestamp, maxAge)) {
        this.logSecurityEvent(
          "Stripe webhook timestamp validation failed - potential replay attack",
          {
            requestId,
            timestamp,
            ageSeconds: Math.floor(Date.now() / 1000 - timestamp),
            maxAge,
            endpoint: "stripe-webhook-verification",
          },
        );
        return false;
      }
    }

    try {
      // Production-grade: Use dedicated webhook secret with rotation support
      const webhookSecrets = this.getStripeWebhookSecrets();

      // Try each webhook secret (supports secret rotation)
      let event: Stripe.Event | null = null;
      let lastError: Error | null = null;

      for (const webhookSecret of webhookSecrets) {
        try {
          // Initialize Stripe with the secret key (not webhook secret)
          const stripe = new Stripe(stripeSecretKey);

          // Use Stripe's webhook signature verification
          event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret,
          );

          // Successful verification - break the loop
          break;
        } catch (error) {
          lastError = error as Error;
          continue; // Try next secret
        }
      }

      if (!event) {
        throw lastError || new Error("No valid webhook secret found");
      }

      // Enhanced logging with comprehensive security context
      this.logSecurityEvent(
        "Stripe webhook cryptographic verification successful",
        {
          requestId,
          eventType: event.type,
          eventId: event.id,
          created: event.created,
          signatureAlgorithm: "HMAC-SHA256",
          timestampValid:
            !enforceTimestamp ||
            (timestamp && this.isTimestampValid(timestamp, maxAge)),
          webhookAgeSeconds: timestamp
            ? Math.floor(Date.now() / 1000 - timestamp)
            : null,
          endpoint: "stripe-webhook-verification",
        },
      );

      return true;
    } catch (error) {
      const stripeError =
        error as Stripe.errors.StripeSignatureVerificationError;

      this.logSecurityEvent(
        "Stripe webhook cryptographic verification failed - security alert",
        {
          requestId,
          error: stripeError.message,
          type: stripeError.type,
          code: (stripeError as any).code || "UNKNOWN",
          signaturePrefix: signature.substring(0, 15) + "...",
          endpoint: "stripe-webhook-verification",
          potentialAttack: this.isPotentialAttack(signature, stripeError),
        },
      );
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

  /**
   * Validate Stripe signature format
   */
  private static isValidStripeSignatureFormat(signature: string): boolean {
    // Stripe signature format: t={timestamp},v1={hash}
    const stripeSignatureRegex = /^t=\d+,v1=[a-f0-9]+(,v\d=[a-f0-9]+)*$/;
    return stripeSignatureRegex.test(signature);
  }

  /**
   * Get webhook secrets with rotation support
   */
  private static getStripeWebhookSecrets(): string[] {
    const { env } = require("@/lib/env");
    // Primary webhook secret (from environment)
    const primarySecret = env.STRIPE_WEBHOOK_SECRET;
    
    // Support for multiple secrets (rotation)
    const additionalSecrets = env.STRIPE_WEBHOOK_SECRETS_ADDITIONAL
      ? env.STRIPE_WEBHOOK_SECRETS_ADDITIONAL.split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
    
    // Fallback to secret key only for development (not recommended for production)
    const fallbackSecret =
      env.NODE_ENV === "development"
        ? env.STRIPE_SECRET_KEY
        : null;
    
    const secrets = [];
    
    if (primarySecret) secrets.push(primarySecret);
    if (additionalSecrets.length > 0) secrets.push(...additionalSecrets);
    if (fallbackSecret && secrets.length === 0) secrets.push(fallbackSecret);
    
    if (secrets.length === 0) {
      this.logSecurityEvent(
        "Stripe webhook configuration error - no valid secrets found",
        {
          environment: env.NODE_ENV,
          hasPrimarySecret: !!primarySecret,
          hasAdditionalSecrets: additionalSecrets.length > 0,
          hasFallbackSecret: !!fallbackSecret,
        },
      );
    }
    
    return secrets;
  }

  /**
   * Extract timestamp from Stripe signature
   */
  private static extractTimestampFromSignature(
    signature: string,
  ): number | null {
    const match = signature.match(/t=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Validate timestamp for replay attack prevention
   */
  private static isTimestampValid(
    timestamp: number,
    maxAgeSeconds: number,
  ): boolean {
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    // Timestamp should be in the past and not too old
    return age >= 0 && age <= maxAgeSeconds;
  }

  /**
   * Analyze error to determine potential attack patterns
   */
  private static isPotentialAttack(_signature: string, error: any): boolean {
    const suspiciousPatterns = [
      /no signatures found matching/i,
      /timestamp provided is too old/i,
      /timestamp provided is too new/i,
      /invalid signature/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(error.message));
  }
}
