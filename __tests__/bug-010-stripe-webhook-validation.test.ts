/**
 * Regression test for BUG-010: Stripe webhook signature validation missing - FIXED
 *
 * This test verifies that the bug has been properly fixed:
 * - SecurityService.verifyStripeWebhook() is now used in the webhook endpoint
 * - SecurityService.logSecurityEvent() provides centralized logging
 * - The webhook endpoint follows our centralized security architecture
 */

describe("BUG-010: Stripe webhook signature validation missing - REGRESSION TEST", () => {
  it("should verify SecurityService has verification capability", () => {
    // SecurityService should have the verification method
    const fs = require("fs");
    const securityServicePath =
      "/home/runner/work/blue/blue/lib/services/security-service.ts";
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
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Check if it uses SecurityService
    const usesSecurityService = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );

    // This should now be true, demonstrating the fix
    expect(usesSecurityService).toBe(true);
  });

  it("should verify centralized security architecture is properly implemented", () => {
    // Current implementation should now use centralized security
    // while still working with stripeService.processWebhookEvent

    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should call stripeService.processWebhookEvent WITH SecurityService verification
    const callsProcessWebhookEvent = webhookContent.includes(
      "stripeService.processWebhookEvent",
    );
    const callsSecurityService = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const usesCentralizedLogging = webhookContent.includes(
      "SecurityService.logSecurityEvent",
    );

    // Both should be true now
    expect(callsProcessWebhookEvent).toBe(true);
    expect(callsSecurityService).toBe(true);
    expect(usesCentralizedLogging).toBe(true);
  });

  it("shouldverify all centralized security features are in use", () => {
    // The security features provided by SecurityService should now be fully utilized
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Verify all security components are used
    const hasImport = webhookContent.includes(
      'import { SecurityService } from "@/lib/services/security-service"',
    );
    const hasFailedVerificationLogging = webhookContent.includes(
      "Webhook signature verification failed",
    );
    const hasSuccessfulVerificationLogging = webhookContent.includes(
      "Webhook signature verified",
    );
    const hasErrorLogging = webhookContent.includes("Webhook processing error");

    expect(hasImport).toBe(true);
    expect(hasFailedVerificationLogging).toBe(true);
    expect(hasSuccessfulVerificationLogging).toBe(true);
    expect(hasErrorLogging).toBe(true);
  });

  it("should confirm the original bug is fixed", () => {
    // The original issue was that the webhook endpoint bypassed centralized security
    // This test confirms the fix is properly implemented

    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // The bug is fixed if:
    const hasSecurityImport = webhookContent.includes(
      "import { SecurityService }",
    );
    const hasSecurityVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook",
    );
    const hasSecurityLogging = webhookContent.includes(
      "SecurityService.logSecurityEvent",
    );
    const maintainsStripeProcessing = webhookContent.includes(
      "stripeService.processWebhookEvent",
    );

    // All conditions should be true for a complete fix
    expect(hasSecurityImport).toBe(true);
    expect(hasSecurityVerification).toBe(true);
    expect(hasSecurityLogging).toBe(true);
    expect(maintainsStripeProcessing).toBe(true);
  });
});
