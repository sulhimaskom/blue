import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EmailService } from "@/lib/services/email-service";

describe("EmailService", () => {
  let emailService: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Initialization", () => {
    it("should not be configured when RESEND_API_KEY is not set", () => {
      delete process.env.RESEND_API_KEY;
      emailService = new EmailService();
      expect(emailService.isConfigured()).toBe(false);
    });

    it("should not be configured when RESEND_API_KEY is a placeholder", () => {
      process.env.RESEND_API_KEY = "your_api_key_here";
      emailService = new EmailService();
      expect(emailService.isConfigured()).toBe(false);
    });
  });

  describe("Email Template Rendering", () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it("should render blueprint shared template correctly", () => {
      const html = emailService.renderBlueprintSharedTemplate({
        appName: "Architect Platform",
        recipientName: "John Doe",
        sharerName: "Jane Smith",
        blueprintName: "E-Commerce Platform",
        blueprintDescription: "A modern e-commerce solution",
        permission: "edit",
        blueprintLink: "https://example.com/blueprints/123",
        expirationDate: "2024-12-31",
      });

      expect(html).toContain("Hi John Doe,");
      expect(html).toContain("Jane Smith");
      expect(html).toContain("E-Commerce Platform");
      expect(html).toContain("A modern e-commerce solution");
      expect(html).toContain("Edit access");
      expect(html).toContain("2024-12-31");
      expect(html).toContain("https://example.com/blueprints/123");
      expect(html).toContain("Architect Platform");
    });

    it("should render template with minimal data", () => {
      const html = emailService.renderBlueprintSharedTemplate({
        appName: "Test App",
        blueprintName: "Test Blueprint",
        permission: "read_only",
        blueprintLink: "https://example.com/blueprints/456",
      });

      expect(html).toContain("Hi,");
      expect(html).toContain("Test Blueprint");
      expect(html).toContain("Read-only access");
      expect(html).toContain("https://example.com/blueprints/456");
      expect(html).toContain("Someone has shared");
    });

    it("should render without expiration date when not provided", () => {
      const html = emailService.renderBlueprintSharedTemplate({
        appName: "Test App",
        blueprintName: "Test Blueprint",
        permission: "read_only",
        blueprintLink: "https://example.com/blueprints/789",
      });

      expect(html).toContain("Test Blueprint");
      expect(html).not.toContain("Expires:");
    });

    it("should handle edit permission correctly", () => {
      const html = emailService.renderBlueprintSharedTemplate({
        appName: "Test App",
        blueprintName: "Test Blueprint",
        permission: "edit",
        blueprintLink: "https://example.com/blueprints/101",
      });

      expect(html).toContain("Edit access");
    });

    it("should handle read_only permission correctly", () => {
      const html = emailService.renderBlueprintSharedTemplate({
        appName: "Test App",
        blueprintName: "Test Blueprint",
        permission: "read_only",
        blueprintLink: "https://example.com/blueprints/202",
      });

      expect(html).toContain("Read-only access");
    });
  });

  describe("sendEmail", () => {
    it("should return success: false when service not configured", async () => {
      delete process.env.RESEND_API_KEY;
      emailService = new EmailService();

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email service not configured");
    });

    it("should handle multiple recipients", async () => {
      process.env.RESEND_API_KEY = "test_valid_key";
      emailService = new EmailService();

      const result = await emailService.sendEmail({
        to: ["user1@example.com", "user2@example.com"],
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBeDefined();
    });
  });

  describe("sendBatchEmails", () => {
    it("should return success: false when service not configured", async () => {
      delete process.env.RESEND_API_KEY;
      emailService = new EmailService();

      const result = await emailService.sendBatchEmails({
        emails: [
          { to: "user1@example.com", subject: "Test", html: "<p>Test</p>" },
          { to: "user2@example.com", subject: "Test", html: "<p>Test</p>" },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(2);
      expect(result.sentCount).toBe(0);
    });
  });

  describe("sendBlueprintSharedEmail", () => {
    it("should format email with correct subject", async () => {
      process.env.RESEND_API_KEY = "test_valid_key";
      emailService = new EmailService();

      const result = await emailService.sendBlueprintSharedEmail("test@example.com", {
        sharerName: "Jane Doe",
        blueprintName: "Test Blueprint",
        permission: "read_only",
        blueprintLink: "https://example.com/blueprints/123",
      });

      expect(result).toBeDefined();
    });

    it("should handle array of recipients", async () => {
      process.env.RESEND_API_KEY = "test_valid_key";
      emailService = new EmailService();

      const result = await emailService.sendBlueprintSharedEmail(
        ["user1@example.com", "user2@example.com"],
        {
          sharerName: "Jane Doe",
          blueprintName: "Test Blueprint",
          permission: "edit",
          blueprintLink: "https://example.com/blueprints/456",
        },
      );

      expect(result).toBeDefined();
    });
  });
});
