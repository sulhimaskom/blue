import {
  WebhookManagementService,
  type WebhookConfiguration,
  type WebhookTestResult,
  type WebhookEvent,
} from "@/lib/services/webhook-management-service";
import type { WebhookConfigurationInput } from "@/lib/schemas/webhook-schema";

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("WebhookManagementService", () => {
  let service: WebhookManagementService;

  beforeEach(() => {
    WebhookManagementService.resetInstance();
    service = WebhookManagementService.getInstance();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return same instance across multiple calls", () => {
      const instance1 = WebhookManagementService.getInstance();
      const instance2 = WebhookManagementService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across instances", async () => {
      const instance1 = WebhookManagementService.getInstance();
      const instance2 = WebhookManagementService.getInstance();

      const mockData: WebhookConfiguration[] = [
        {
          id: "1",
          name: "Test Webhook",
          url: "https://example.com/webhook",
          eventTypes: ["user.created"],
          isActive: true,
          retryCount: 3,
          timeoutSeconds: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      await instance1.loadWebhooks();

      const webhooksFromInstance2 = instance2.getAllWebhooks();
      expect(webhooksFromInstance2).toHaveLength(1);
      expect(webhooksFromInstance2[0].id).toBe("1");
    });
  });

  describe("loadWebhooks", () => {
    it("should load and cache webhooks successfully", async () => {
      const mockData: WebhookConfiguration[] = [
        {
          id: "1",
          name: "Webhook 1",
          url: "https://example.com/webhook1",
          eventTypes: ["user.created"],
          isActive: true,
          retryCount: 3,
          timeoutSeconds: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Webhook 2",
          url: "https://example.com/webhook2",
          eventTypes: ["order.completed"],
          isActive: false,
          retryCount: 5,
          timeoutSeconds: 60,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const webhooks = await service.loadWebhooks();

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/configure", {
        headers: { "Content-Type": "application/json" },
      });
      expect(webhooks).toHaveLength(2);
      expect(webhooks[0].name).toBe("Webhook 1");
      expect(webhooks[1].name).toBe("Webhook 2");
      expect(service.getAllWebhooks()).toHaveLength(2);
    });

    it("should throw error when API returns failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Failed to load webhooks",
        }),
      });

      await expect(service.loadWebhooks()).rejects.toThrow(
        "Failed to load webhooks",
      );
    });

    it("should throw error when fetch fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.loadWebhooks()).rejects.toThrow("Network error");
    });

    it("should handle empty webhook list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const webhooks = await service.loadWebhooks();

      expect(webhooks).toHaveLength(0);
      expect(service.getAllWebhooks()).toHaveLength(0);
    });

    it("should handle HTTP error status codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      });

      await expect(service.loadWebhooks()).rejects.toThrow(
        "HTTP 500: Internal Server Error",
      );
    });

    it("should handle HTTP error status codes with API error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      });

      await expect(service.loadWebhooks()).rejects.toThrow("Server error");
    });
  });

  describe("createWebhook", () => {
    it("should create webhook and add to cache", async () => {
      const newWebhook: WebhookConfiguration = {
        id: "3",
        name: "New Webhook",
        url: "https://example.com/new",
        eventTypes: ["payment.completed"],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const input: WebhookConfigurationInput = {
        name: "New Webhook",
        url: "https://example.com/new",
        secret: "secret123",
        eventTypes: ["payment.completed"],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newWebhook }),
      });

      const result = await service.createWebhook(input);

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(result.id).toBe("3");
      expect(service.getWebhookById("3")).toBeDefined();
    });

    it("should throw error when creation fails", async () => {
      const input: WebhookConfigurationInput = {
        name: "Invalid Webhook",
        url: "invalid-url",
        secret: "secret",
        eventTypes: [],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Invalid URL format",
        }),
      });

      await expect(service.createWebhook(input)).rejects.toThrow(
        "Invalid URL format",
      );
    });
  });

  describe("updateWebhook", () => {
    it("should update existing webhook in cache", async () => {
      const updatedWebhook: WebhookConfiguration = {
        id: "1",
        name: "Updated Webhook",
        url: "https://example.com/updated",
        eventTypes: ["user.updated"],
        isActive: true,
        retryCount: 5,
        timeoutSeconds: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const input: WebhookConfigurationInput = {
        name: "Updated Webhook",
        url: "https://example.com/updated",
        secret: "newsecret",
        eventTypes: ["user.updated"],
        isActive: true,
        retryCount: 5,
        timeoutSeconds: 60,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedWebhook }),
      });

      const result = await service.updateWebhook("1", input);

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/configure/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(result.name).toBe("Updated Webhook");
      expect(service.getWebhookById("1")?.name).toBe("Updated Webhook");
    });

    it("should throw error when update fails", async () => {
      const input: WebhookConfigurationInput = {
        name: "Webhook",
        url: "https://example.com",
        secret: "secret",
        eventTypes: [],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Webhook not found",
        }),
      });

      await expect(service.updateWebhook("1", input)).rejects.toThrow(
        "Webhook not found",
      );
    });
  });

  describe("deleteWebhook", () => {
    it("should delete webhook and remove from cache", async () => {
      const mockWebhook: WebhookConfiguration = {
        id: "1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        eventTypes: ["user.created"],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      service.clearCache();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockWebhook] }),
      });
      await service.loadWebhooks();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.deleteWebhook("1");

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/configure/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(service.getWebhookById("1")).toBeUndefined();
    });

    it("should throw error when deletion fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Failed to delete webhook",
        }),
      });

      await expect(service.deleteWebhook("1")).rejects.toThrow(
        "Failed to delete webhook",
      );
    });
  });

  describe("testWebhook", () => {
    it("should test webhook successfully", async () => {
      const mockResult: WebhookTestResult = {
        success: true,
        status: 200,
        responseTime: 145,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResult }),
      });

      const result = await service.testWebhook("1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/webhooks/test/1",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs?.body as string);
      expect(body.eventType).toBe("test.event");
      expect(body.payload.test).toBe(true);
      expect(body.payload.timestamp).toBeDefined();
      expect(typeof body.payload.timestamp).toBe("string");
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.responseTime).toBe(145);
    });

    it("should return failed test result", async () => {
      const mockResult: WebhookTestResult = {
        success: false,
        status: 500,
        responseTime: 0,
        error: "Internal server error",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResult }),
      });

      const result = await service.testWebhook("1");

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe("Internal server error");
    });

    it("should throw error when test fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Webhook not found",
        }),
      });

      await expect(service.testWebhook("1")).rejects.toThrow("Webhook not found");
    });
  });

  describe("rotateSecret", () => {
    it("should rotate webhook secret successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.rotateSecret("1");

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/rotate-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: "1" }),
      });
    });

    it("should throw error when rotation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Failed to rotate secret",
        }),
      });

      await expect(service.rotateSecret("1")).rejects.toThrow(
        "Failed to rotate secret",
      );
    });
  });

  describe("loadWebhookEvents", () => {
    it("should load webhook events with pagination", async () => {
      const mockEvents: WebhookEvent[] = [
        {
          id: "e1",
          webhookId: "1",
          eventType: "user.created",
          status: "success",
          responseStatus: 200,
          attemptCount: 1,
          createdAt: new Date().toISOString(),
        },
        {
          id: "e2",
          webhookId: "1",
          eventType: "order.completed",
          status: "failed",
          responseStatus: 500,
          attemptCount: 3,
          createdAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockEvents }),
      });

      const events = await service.loadWebhookEvents("1", { limit: 50, offset: 0 });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/webhooks/history/1?limit=50&offset=0",
        { headers: { "Content-Type": "application/json" } },
      );
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe("user.created");
      expect(events[1].status).toBe("failed");
    });

    it("should use default pagination options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await service.loadWebhookEvents("1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/webhooks/history/1?limit=50&offset=0",
        { headers: { "Content-Type": "application/json" } },
      );
    });

    it("should throw error when loading events fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Webhook not found",
        }),
      });

      await expect(service.loadWebhookEvents("1")).rejects.toThrow(
        "Webhook not found",
      );
    });

    it("should handle empty event list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const events = await service.loadWebhookEvents("1");

      expect(events).toHaveLength(0);
    });
  });

  describe("retryEvent", () => {
    it("should retry failed event successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.retryEvent("e1");

      expect(mockFetch).toHaveBeenCalledWith("/api/webhooks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: "e1" }),
      });
    });

    it("should throw error when retry fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Event not found",
        }),
      });

      await expect(service.retryEvent("e1")).rejects.toThrow("Event not found");
    });
  });

  describe("Cache Management", () => {
    it("should get webhook by ID from cache", async () => {
      const mockWebhook: WebhookConfiguration = {
        id: "1",
        name: "Cached Webhook",
        url: "https://example.com",
        eventTypes: ["test"],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockWebhook] }),
      });

      await service.loadWebhooks();

      const cachedWebhook = service.getWebhookById("1");
      expect(cachedWebhook).toBeDefined();
      expect(cachedWebhook?.name).toBe("Cached Webhook");
    });

    it("should return undefined for non-existent webhook", () => {
      const webhook = service.getWebhookById("non-existent");
      expect(webhook).toBeUndefined();
    });

    it("should get all webhooks from cache", async () => {
      const mockWebhooks: WebhookConfiguration[] = [
        {
          id: "1",
          name: "Webhook 1",
          url: "https://example.com/1",
          eventTypes: ["test"],
          isActive: true,
          retryCount: 3,
          timeoutSeconds: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Webhook 2",
          url: "https://example.com/2",
          eventTypes: ["test"],
          isActive: false,
          retryCount: 5,
          timeoutSeconds: 60,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWebhooks }),
      });

      await service.loadWebhooks();

      const allWebhooks = service.getAllWebhooks();
      expect(allWebhooks).toHaveLength(2);
    });

    it("should clear cache", async () => {
      const mockWebhook: WebhookConfiguration = {
        id: "1",
        name: "Test",
        url: "https://example.com",
        eventTypes: ["test"],
        isActive: true,
        retryCount: 3,
        timeoutSeconds: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockWebhook] }),
      });

      await service.loadWebhooks();

      expect(service.getAllWebhooks()).toHaveLength(1);

      service.clearCache();

      expect(service.getAllWebhooks()).toHaveLength(0);
    });
  });
});
