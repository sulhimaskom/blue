import { describe, it, expect, jest } from "@jest/globals";
import { WebhookSubscriptionService } from "@/lib/services/webhook-subscription-service";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    apiError: jest.fn(),
    security: jest.fn(),
  },
}));

describe("WebhookSubscriptionService Unit Tests", () => {
  describe("getAvailableEventTypes", () => {
    it("should return all available event types with descriptions", async () => {
      const result = await WebhookSubscriptionService.getAvailableEventTypes();
      
      expect(result).toHaveProperty("PLATFORM");
      expect(result).toHaveProperty("CLERK");
      expect(result).toHaveProperty("STRIPE");
      
      expect(result.PLATFORM).toContainEqual({
        type: "blueprint.created",
        description: "New blueprint generated",
        category: "blueprint",
      });
      
      expect(result.PLATFORM).toContainEqual({
        type: "webhook.failed", 
        description: "Webhook delivery failed",
        category: "system",
      });
    });

    it("should include blueprint.updated event type", async () => {
      const result = await WebhookSubscriptionService.getAvailableEventTypes();
      
      expect(result.PLATFORM).toContainEqual({
        type: "blueprint.updated",
        description: "Blueprint content modified",
        category: "blueprint",
      });
    });

    it("should include project.deployed event type", async () => {
      const result = await WebhookSubscriptionService.getAvailableEventTypes();
      
      expect(result.PLATFORM).toContainEqual({
        type: "project.deployed",
        description: "Repository deployment completed",
        category: "project",
      });
    });

    it("should include credits.consumed event type", async () => {
      const result = await WebhookSubscriptionService.getAvailableEventTypes();
      
      expect(result.PLATFORM).toContainEqual({
        type: "credits.consumed",
        description: "Credit usage threshold reached",
        category: "credit",
      });
    });
  });

  describe("getEventTypeDetails", () => {
    it("should return event type details for known types", async () => {
      const result = await WebhookSubscriptionService.getEventTypeDetails("blueprint.created");
      
      expect(result).toEqual({
        type: "blueprint.created",
        description: "New blueprint generated", 
        category: "blueprint",
      });
    });

    it("should return event type details for webhook.failed", async () => {
      const result = await WebhookSubscriptionService.getEventTypeDetails("webhook.failed");
      
      expect(result).toEqual({
        type: "webhook.failed",
        description: "Webhook delivery failed",
        category: "system",
      });
    });

    it("should throw ValidationError for unknown event types", async () => {
      try {
        await WebhookSubscriptionService.getEventTypeDetails("unknown.event");
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Unknown event type");
      }
    });
  });

  describe("validateFilterExpression", () => {
    it("should validate simple key=value expressions", () => {
      const service = WebhookSubscriptionService as any;
      
      // These should not throw
      expect(() => service.validateFilterExpression("userId=123")).not.toThrow();
      expect(() => service.validateFilterExpression("projectId=abc")).not.toThrow();
      expect(() => service.validateFilterExpression("status=active")).not.toThrow();
    });

    it("should throw ValidationError for expressions without =", () => {
      const service = WebhookSubscriptionService as any;
      
      expect(() => service.validateFilterExpression("userId:123")).toThrow("Filter expression must contain '='");
      expect(() => service.validateFilterExpression("userId")).toThrow("Filter expression must contain '='");
    });

    it("should throw ValidationError for expressions too long", () => {
      const service = WebhookSubscriptionService as any;
      const longExpression = "field=".concat("x".repeat(260));
      
      expect(() => service.validateFilterExpression(longExpression)).toThrow("Filter expression too long");
    });
  });

  describe("evaluateFilterExpression", () => {
    it("should evaluate simple key=value expressions", () => {
      const service = WebhookSubscriptionService as any;
      
      const eventData = { userId: 123, status: "active", projectId: "abc" };
      
      expect(service.evaluateFilterExpression("userId=123", eventData)).toBe(true);
      expect(service.evaluateFilterExpression("userId=456", eventData)).toBe(false);
      expect(service.evaluateFilterExpression("status=active", eventData)).toBe(true);
      expect(service.evaluateFilterExpression("status=inactive", eventData)).toBe(false);
    });

    it("should handle malformed expressions gracefully", () => {
      const service = WebhookSubscriptionService as any;
      
      const eventData = { userId: 123 };
      
      // Should return true (conservative approach) for malformed expressions
      expect(service.evaluateFilterExpression("invalid", eventData)).toBe(true);
      expect(service.evaluateFilterExpression("userId", eventData)).toBe(true);
    });

    it("should handle missing fields", () => {
      const service = WebhookSubscriptionService as any;
      
      const eventData = { userId: 123 };
      
      expect(service.evaluateFilterExpression("missingField=value", eventData)).toBe(false);
    });

    it("should handle complex filter expressions", () => {
      const service = WebhookSubscriptionService as any;
      
      const eventData = { userId: 123, status: "active", role: "admin" };
      
      expect(service.evaluateFilterExpression("userId=123", eventData)).toBe(true);
      expect(service.evaluateFilterExpression("status=active", eventData)).toBe(true);
      expect(service.evaluateFilterExpression("role=admin", eventData)).toBe(true);
    });
  });
});