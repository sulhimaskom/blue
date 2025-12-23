import { logger } from "@/lib/logger";

/**
 * SecurityService - Centralized security utilities
 *
 * Provides standardized security functions across the application:
 * - Webhook signature verification
 * - Input sanitization patterns
 * - Security event logging
 */
class SecurityService {
  /**
   * Verify Clerk webhook signature
   * Currently implements basic header verification
   * Enhanced implementation in Phase 4 with proper cryptographic verification
   */
  static verifyClerkWebhook(_body: string, headers: Headers): boolean {
    const svixId = headers.get("svix-id");
    const svixTimestamp = headers.get("svix-timestamp");
    const svixSignature = headers.get("svix-signature");

    const isValid = !!(svixId && svixTimestamp && svixSignature);

    if (!isValid) {
      logger.security("Clerk webhook signature verification failed", {
        hasSvixId: !!svixId,
        hasSvixTimestamp: !!svixTimestamp,
        hasSvixSignature: !!svixSignature,
      });
    }

    return isValid;
  }

  /**
   * Verify Stripe webhook signature
   * Currently implements basic signature format verification
   * Enhanced implementation in Phase 4 with proper Stripe verification
   */
  static verifyStripeWebhook(_body: string, headers: Headers): boolean {
    const signature = headers.get("stripe-signature") || "";
    const isValid = !!signature && signature.startsWith("v1=");

    if (!isValid) {
      logger.security("Stripe webhook signature verification failed", {
        hasSignature: !!signature,
        signatureFormat: signature.substring(0, 10),
      });
    }

    return isValid;
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

export { SecurityService };
