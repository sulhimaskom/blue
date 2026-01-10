import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { logger } from "@/lib/logger";

// Mock logger to avoid console output
jest.mock("@/lib/logger");
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("WebhookEventDispatcher Integration", () => {
  const mockContext = { requestId: "test-request-123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Credit webhook events", () => {
    it("should handle credit low balance emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditLowBalance(
          123,
          "clerk-123",
          5,
          10,
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle credit depleted emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditDepleted(123, "clerk-123", mockContext),
      ).resolves.toBeUndefined();
    });

    it("should handle credit purchased emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditPurchased(
          123,
          "clerk-123",
          50,
          75,
          "txn-123",
          "pay-123",
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle credit usage spike emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditUsageSpike(
          123,
          "clerk-123",
          60,
          60,
          40,
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle credit renewed emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditRenewed(123, "clerk-123", 100, 150, mockContext),
      ).resolves.toBeUndefined();
    });
  });

  describe("Blueprint webhook events", () => {
    it("should handle blueprint created emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitBlueprintCreated(
          123,
          "clerk-123",
          "proj-123",
          "bp-123",
          1,
          "Test Blueprint",
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle blueprint generating emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitBlueprintGenerating(
          123,
          "clerk-123",
          "proj-123",
          "bp-123",
          1,
          "Test Blueprint",
          30,
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle blueprint completed emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitBlueprintCompleted(
          123,
          "clerk-123",
          "proj-123",
          "bp-123",
          1,
          "Test Blueprint",
          {
            duration: "2500ms",
            aiModelsUsed: ["gpt-4", "claude-2"],
            features: ["auth", "database", "api"],
          },
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle blueprint failed emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitBlueprintFailed(
          123,
          "clerk-123",
          "proj-123",
          "bp-123",
          1,
          "Test Blueprint",
          "AI model timeout exceeded",
          {
            duration: "45000ms",
            inputLength: 1000,
            errorType: "TimeoutError",
          },
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should handle blueprint status changed emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitBlueprintStatusChanged(
          123,
          "clerk-123",
          "proj-123",
          "bp-123",
          1,
          "Test Blueprint",
          "generating",
          "completed",
          {
            duration: "2500ms",
            blueprintId: "bp-123",
          },
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("Project deployment webhook events", () => {
    it("should handle project deployed emission without errors", async () => {
      await expect(
        WebhookEventDispatcher.emitProjectDeployed(
          123,
          "clerk-123",
          "proj-123",
          "deploy-123",
          "success",
          "https://example.com",
          mockContext,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("Credit threshold monitoring", () => {
    it("should handle threshold monitoring without errors", async () => {
      await expect(
        WebhookEventDispatcher.monitorCreditThresholds(123, 15, 5, mockContext),
      ).resolves.toBeUndefined();
    });

    it("should handle threshold monitoring for depleted credits", async () => {
      await expect(
        WebhookEventDispatcher.monitorCreditThresholds(123, 10, 0, mockContext),
      ).resolves.toBeUndefined();
    });

    it("should handle threshold monitoring when no threshold crossed", async () => {
      await expect(
        WebhookEventDispatcher.monitorCreditThresholds(123, 25, 20, mockContext),
      ).resolves.toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing context gracefully", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditLowBalance(123, "clerk-123", 5, 10),
      ).resolves.toBeUndefined();
    });

    it("should handle invalid data gracefully", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditPurchased(
          0,
          "",
          -10,
          -5,
          "",
          "",
          undefined,
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe("Logging", () => {
    it("should not throw errors when logging events", async () => {
      // The most important thing is that webhook emission doesn't crash
      await expect(
        WebhookEventDispatcher.emitCreditLowBalance(123, "clerk-123", 5, 10, mockContext),
      ).resolves.toBeUndefined();
    });

    it("should handle missing context in logging", async () => {
      await expect(
        WebhookEventDispatcher.emitCreditLowBalance(123, "clerk-123", 5, 10),
      ).resolves.toBeUndefined();
    });
  });
});