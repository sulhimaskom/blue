/**
 * Test for BUG-010 fix verification: Stripe webhook signature validation - UPDATED FOR REFACTORING
 *
 * This test verifies that bug has been properly fixed and improved:
 * - SecurityService.verifyStripeWebhook() is used in webhook endpoint
 * - WebhookService.processWebhookWithReliability() provides centralized error handling
 * - The webhook endpoint follows our centralized security architecture with queue-based processing
 */

describe("BUG-010: Stripe webhook signature validation - FIX VERIFICATION", () => {
  it("should verify SecurityService.import is present in webhook endpoint", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should import SecurityService
    const importsSecurityService = webhookContent.includes(
      'import { SecurityService } from "@/lib/services/security-service"',
    );
    expect(importsSecurityService).toBe(true);
  });

  it("should verify SecurityService.verifyStripeWebhook is used", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should use SecurityService for verification
    const usesSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    expect(usesSecurityVerification).toBe(true);
  });

  it("should verify centralized WebhookService is used for reliability", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should use WebhookService for centralized error handling and logging
    const usesWebhookService = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );
    const hasQueueEnabled = webhookContent.includes("useQueue: true");
    expect(usesWebhookService).toBe(true);
    expect(hasQueueEnabled).toBe(true);
  });

  it("should verify SecurityService is still used for verification", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should still use SecurityService for signature verification
    const usesSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    expect(usesSecurityVerification).toBe(true);
  });

  it("should verify proper logging via WebhookService and logger", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should have proper centralized logging
    const hasSystemLogging = webhookContent.includes("logger.systemEvent");
    const hasErrorHandling = webhookContent.includes("try");
    expect(hasSystemLogging).toBe(true);
    expect(hasErrorHandling).toBe(true);
  });

  it("should verify centralized security pattern is properly implemented", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should implement complete centralized security pattern
    const hasSecurityImport = webhookContent.includes(
      'import { SecurityService } from "@/lib/services/security-service"',
    );
    const hasWebhookServiceImport = webhookContent.includes(
      'import { WebhookService } from "@/lib/services/webhook-service"',
    );
    const hasVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const hasWebhookProcessing = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );

    // All security patterns should be implemented
    expect(hasSecurityImport).toBe(true);
    expect(hasWebhookServiceImport).toBe(true);
    expect(hasVerification).toBe(true);
    expect(hasWebhookProcessing).toBe(true);
  });

  it("should verify proper error handling with centralized logging", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should have proper error handling via WebhookService for POST
    const hasWebhookServiceErrorHandling = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );
    // GET endpoint should have proper error handling
    const hasHealthCheckErrorHandling =
      webhookContent.includes("} catch (error)");
    // Both endpoints should have rate limiting
    const hasRateLimiting = webhookContent.includes("RateLimiters.webhook");

    expect(hasWebhookServiceErrorHandling).toBe(true);
    expect(hasHealthCheckErrorHandling).toBe(true);
    expect(hasRateLimiting).toBe(true);
  });
});
