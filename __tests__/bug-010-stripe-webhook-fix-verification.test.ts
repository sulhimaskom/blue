/**
 * Test for BUG-010 fix verification: Stripe webhook signature validation
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
      "SecurityService.verifyStripeWebhook(body, request.headers)",
    );
    expect(usesSecurityVerification).toBe(true);
  });

  it("should verify SecurityService.logSecurityEvent is used for failed verification", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should use SecurityService for logging failed verification
    const logsFailedVerification =
      webhookContent.includes("Webhook signature verification failed") &&
      webhookContent.includes("SecurityService.logSecurityEvent");
    expect(logsFailedVerification).toBe(true);
  });

  it("should verify SecurityService.logSecurityEvent is used for successful verification", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should use SecurityService for logging successful verification
    const logsSuccessfulVerification =
      webhookContent.includes("Webhook signature verified") &&
      webhookContent.includes("SecurityService.logSecurityEvent");
    expect(logsSuccessfulVerification).toBe(true);
  });

  it("should verify SecurityService.logSecurityEvent is used for processing errors", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should use SecurityService for logging processing errors
    const logsProcessingErrors =
      webhookContent.includes("Webhook processing error") &&
      webhookContent.includes("SecurityService.logSecurityEvent");
    expect(logsProcessingErrors).toBe(true);
  });

  it("should verify the centralized security pattern is properly implemented", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should implement the complete centralized security pattern
    const hasImport = webhookContent.includes(
      'import { SecurityService } from "@/lib/services/security-service"',
    );
    const hasVerification = webhookContent.includes(
      "SecurityService.verifyStripeWebhook(body, request.headers)",
    );
    const hasFailedLog = webhookContent.includes(
      "Webhook signature verification failed",
    );
    const hasSuccessLog = webhookContent.includes("Webhook signature verified");
    const hasErrorLog = webhookContent.includes("Webhook processing error");

    // All security patterns should be implemented
    expect(hasImport).toBe(true);
    expect(hasVerification).toBe(true);
    expect(hasFailedLog).toBe(true);
    expect(hasSuccessLog).toBe(true);
    expect(hasErrorLog).toBe(true);
  });

  it("should verify proper error handling with centralized logging", () => {
    const fs = require("fs");
    const webhookPath =
      "/home/runner/work/blue/blue/app/api/stripe/webhook/route.ts";
    const webhookContent = fs.readFileSync(webhookPath, "utf8");

    // Should have proper error handling with centralized logging
    const hasCentralizedErrorLogging = webhookContent.includes(
      'SecurityService.logSecurityEvent("Webhook processing error"',
    );
    const hasProperStatusCodes =
      webhookContent.includes("{ status: 401 }") &&
      webhookContent.includes("{ status: 500 }");

    expect(hasCentralizedErrorLogging).toBe(true);
    expect(hasProperStatusCodes).toBe(true);
  });
});
