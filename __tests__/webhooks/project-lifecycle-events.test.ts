import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { logger } from "@/lib/logger";

// Mock logger to avoid console output
jest.mock("@/lib/logger");
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("WebhookEventDispatcher - Project Lifecycle Events", () => {
  const mockUserId = 123;
  const mockClerkId = "clerk_123";
  const mockProjectId = "project_123";
  const mockProjectName = "Test Project";
  const mockProjectDescription = "Test project description";
  const mockContext = { requestId: "req_123" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(WebhookEventDispatcher as any, "dispatchEventToSubscribers").mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("emitProjectCreated", () => {
    it("should emit project.created webhook event with correct data", async () => {
      await WebhookEventDispatcher.emitProjectCreated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockProjectDescription,
        mockContext
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.created",
        {
          projectId: mockProjectId,
          projectName: mockProjectName,
          projectDescription: mockProjectDescription,
          userId: mockUserId,
          timestamp: expect.any(Date),
        },
        `user-${mockClerkId}`,
        mockContext
      );
    });

    it("should emit project.created webhook event without description", async () => {
      await WebhookEventDispatcher.emitProjectCreated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        undefined,
        mockContext
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.created",
        {
          projectId: mockProjectId,
          projectName: mockProjectName,
          projectDescription: undefined,
          userId: mockUserId,
          timestamp: expect.any(Date),
        },
        `user-${mockClerkId}`,
        mockContext
      );
    });

    it("should emit without context by default", async () => {
      await WebhookEventDispatcher.emitProjectCreated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.created",
        expect.any(Object),
        `user-${mockClerkId}`,
        undefined
      );
    });
  });

  describe("emitProjectUpdated", () => {
    const mockUpdatedFields = ["name", "description"];

    it("should emit project.updated webhook event with correct data", async () => {
      await WebhookEventDispatcher.emitProjectUpdated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockProjectDescription,
        mockUpdatedFields,
        mockContext
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.updated",
        {
          projectId: mockProjectId,
          projectName: mockProjectName,
          projectDescription: mockProjectDescription,
          userId: mockUserId,
          timestamp: expect.any(Date),
          updatedFields: mockUpdatedFields,
        },
        `user-${mockClerkId}`,
        mockContext
      );
    });

    it("should emit project.updated with empty updatedFields by default", async () => {
      await WebhookEventDispatcher.emitProjectUpdated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.updated",
        expect.objectContaining({
          updatedFields: [],
        }),
        `user-${mockClerkId}`,
        undefined
      );
    });
  });

  describe("emitProjectDeleted", () => {
    it("should emit project.deleted webhook event with correct data", async () => {
      await WebhookEventDispatcher.emitProjectDeleted(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockContext
      );

      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalledWith(
        "project.deleted",
        {
          projectId: mockProjectId,
          projectName: mockProjectName,
          userId: mockUserId,
          timestamp: expect.any(Date),
          deletedAt: expect.any(String),
        },
        `user-${mockClerkId}`,
        mockContext
      );
    });

    it("should include ISO timestamp for deletedAt", async () => {
      await WebhookEventDispatcher.emitProjectDeleted(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName
      );

      const call = (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mock.calls[0];
      const eventData = call[1] as any;
      
      expect(eventData.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("Error Handling", () => {
    it("should handle dispatch errors gracefully", async () => {
      (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mockRejectedValue(
        new Error("Webhook service unavailable")
      );

      await expect(
        WebhookEventDispatcher.emitProjectCreated(
          mockUserId,
          mockClerkId,
          mockProjectId,
          mockProjectName
        )
      ).rejects.toThrow("Webhook service unavailable");
    });

    it("should propagate dispatch errors with context", async () => {
      const error = new Error("Network timeout");
      (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mockRejectedValue(error);

      await expect(
        WebhookEventDispatcher.emitProjectUpdated(
          mockUserId,
          mockClerkId,
          mockProjectId,
          mockProjectName
        )
      ).rejects.toThrow("Network timeout");
    });
  });

  describe("Integration with WebhookSubscriptionService", () => {
    it("should integrate with webhook dispatch infrastructure", async () => {
      // This test verifies that the dispatcher integrates correctly
      // with the subscription service for filtering logic
      await WebhookEventDispatcher.emitProjectCreated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        undefined,
        mockContext
      );

      // The actual filtering happens inside dispatchEventToSubscribers
      // This test just ensures the integration point exists
      expect(WebhookEventDispatcher["dispatchEventToSubscribers"]).toHaveBeenCalled();
    });
  });

  describe("Data Validation", () => {
    it("should include all required fields in project.created event", async () => {
      await WebhookEventDispatcher.emitProjectCreated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockProjectDescription,
        mockContext
      );

      const call = (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mock.calls[0];
      const eventData = call[1] as any;

      expect(eventData).toHaveProperty("projectId", mockProjectId);
      expect(eventData).toHaveProperty("projectName", mockProjectName);
      expect(eventData).toHaveProperty("projectDescription", mockProjectDescription);
      expect(eventData).toHaveProperty("userId", mockUserId);
      expect(eventData).toHaveProperty("timestamp");
      expect(typeof eventData.timestamp).toBe("object");
    });

    it("should include additional fields in project.updated event", async () => {
      const mockUpdatedFields = ["name", "description", "status"];
      
      await WebhookEventDispatcher.emitProjectUpdated(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockProjectDescription,
        mockUpdatedFields,
        mockContext
      );

      const call = (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mock.calls[0];
      const eventData = call[1] as any;

      expect(eventData).toHaveProperty("updatedFields", mockUpdatedFields);
      expect(Array.isArray(eventData.updatedFields)).toBe(true);
    });

    it("should format deletedAt as ISO string in project.deleted event", async () => {
      await WebhookEventDispatcher.emitProjectDeleted(
        mockUserId,
        mockClerkId,
        mockProjectId,
        mockProjectName,
        mockContext
      );

      const call = (WebhookEventDispatcher["dispatchEventToSubscribers"] as jest.Mock).mock.calls[0];
      const eventData = call[1] as any;

      expect(eventData).toHaveProperty("deletedAt");
      expect(typeof eventData.deletedAt).toBe("string");
      
      // Verify it's a valid ISO date string
      const parsedDate = new Date(eventData.deletedAt);
      expect(isNaN(parsedDate.getTime())).toBe(false);
    });
  });
});