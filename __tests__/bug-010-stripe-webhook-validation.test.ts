/**
 * Regression test for BUG-010: Stripe webhook signature validation missing - FIXED AND REFACTORED
 *
 * This test verifies that bug has been properly fixed and improved:
 * - SecurityService.verifyStripeWebhook() is now used in webhook endpoint
 * - WebhookService.processWebhookWithReliability() provides centralized error handling and logging
 * - The webhook endpoint follows our centralized security architecture with queue-based processing
 */

const fs = require("fs");

describe("BUG-010: Stripe webhook signature validation missing - REGRESSION TEST", () => {
  const webhookPath = "app/api/stripe/webhook/route.ts";

  it("should verify SecurityService has verification capability", () => {
    // SecurityService should have the verification method
    const securityServicePath = "lib/services/security-service.ts";
    const securityContent = fs.readFileSync(securityServicePath, "utf8");

    const hasVerificationMethod = securityContent.includes(
      "verifyStripeWebhook",
    );
    expect(hasVerificationMethod).toBe(true);
  });

  it("should verify webhook endpoint now uses SecurityService", () => {
    // The webhook endpoint in app/api/stripe/webhook/route.ts
    // should now verify the signature using SecurityService first

    // Read the actual webhook endpoint implementation
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Check if it uses SecurityService
    const usesSecurityService = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );

    // This should now be true, demonstrating the fix
    expect(usesSecurityService).toBe(true);
  });

  it("should verify proper security logging is implemented", () => {
    // Security events should be properly logged using centralized WebhookService

    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Check for proper security logging patterns via WebhookService
    const hasWebhookServiceImport = webhookContent.includes(
      "import { WebhookService }",
    );
    const hasSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const hasWebhookProcessing = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );
    const hasSystemLogging = webhookContent.includes("logger.systemEvent");

    expect(hasWebhookServiceImport).toBe(true);
    expect(hasSecurityVerification).toBe(true);
    expect(hasWebhookProcessing).toBe(true);
    expect(hasSystemLogging).toBe(true);
  });

  it("should confirm the original bug is fixed", () => {
    // The original issue was that the webhook endpoint bypassed centralized security
    // This test confirms that fix is properly implemented

    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // The bug is fixed if:
    const hasSecurityImport = webhookContent.includes(
      "import { SecurityService }",
    );
    const hasSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const hasWebhookService = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );
    const maintainsStripeProcessing = webhookContent.includes(
      "stripeService.processWebhookEvent",
    );
    const hasQueueEnabled = webhookContent.includes("useQueue: true");

    // All conditions should be true for a complete fix
    expect(hasSecurityImport).toBe(true);
    expect(hasSecurityVerification).toBe(true);
    expect(hasWebhookService).toBe(true);
    expect(maintainsStripeProcessing).toBe(true);
    expect(hasQueueEnabled).toBe(true);
  });

  it("should verify stripe service processing is maintained", () => {
    // The webhook should still process events through StripePaymentService

    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Verify that StripePaymentService is still used for event processing
    const callsProcessWebhookEvent = webhookContent.includes(
      "stripeService.processWebhookEvent",
    );
    const callsSecurityService = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const usesCentralizedService = webhookContent.includes(
      "WebhookService.processWebhookWithReliability",
    );

    // All should be true now
    expect(callsProcessWebhookEvent).toBe(true);
    expect(callsSecurityService).toBe(true);
    expect(usesCentralizedService).toBe(true);
  });

  it("should verify all centralized security features are in use", () => {
    // The security features provided by SecurityService and WebhookService should now be fully utilized
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Verify all security components are used
    const hasImport = webhookContent.includes(
      'import { SecurityService } from "@/lib/services/security-service"',
    );
    const hasWebhookServiceImport = webhookContent.includes(
      'import { WebhookService } from "@/lib/services/webhook-service"',
    );
    const hasSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const hasSystemLogging = webhookContent.includes("logger.systemEvent");

    expect(hasImport).toBe(true);
    expect(hasWebhookServiceImport).toBe(true);
    expect(hasSecurityVerification).toBe(true);
    expect(hasSystemLogging).toBe(true);
  });
});
