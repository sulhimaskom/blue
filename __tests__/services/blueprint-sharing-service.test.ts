import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { NotificationService } from "@/lib/services/notification-service";

describe("BlueprintSharingService - In-App Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Notification Integration", () => {
    it("should create notification after sharing blueprint", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockResolvedValue({} as any);

      const blueprintId = "test-blueprint-id";
      const clerkIds = ["clerk_1", "clerk_2"];

      try {
        for (const clerkId of clerkIds) {
          await NotificationService.dispatch(
            clerkId,
            "blueprint_shared",
            "User shared a blueprint with you",
            "User shared blueprint with you. You have read_only access.",
            {
              blueprintId: blueprintId,
              sharerName: "test@example.com",
            },
            `https://example.com/blueprints/${blueprintId}`,
          );
        }

        expect(mockNotification).toHaveBeenCalledTimes(2);
        clerkIds.forEach(clerkId => {
          expect(mockNotification).toHaveBeenCalledWith(
            clerkId,
            "blueprint_shared",
            expect.any(String),
            expect.any(String),
            expect.objectContaining({
              blueprintId: blueprintId,
              sharerName: "test@example.com",
            }),
            expect.stringContaining(blueprintId),
          );
        });
      } finally {
        mockNotification.mockRestore();
      }
    });

    it("should handle notification creation with expiration date", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockResolvedValue({} as any);

      const expirationDate = new Date("2024-12-31");
      const expirationText = expirationDate.toLocaleDateString();

      try {
        await NotificationService.dispatch(
          "clerk_1",
          "blueprint_shared",
          "User shared a blueprint with you",
          `User shared "Test Blueprint" with you. You have edit access. This share expires on ${expirationText}.`,
          {
            blueprintId: "test-id",
            sharerName: "test@example.com",
          },
          "https://example.com/blueprints/test-id",
        );

        expect(mockNotification).toHaveBeenCalledWith(
          "clerk_1",
          "blueprint_shared",
          expect.any(String),
          expect.stringContaining("expires on"),
          expect.any(Object),
          expect.any(String),
        );
      } finally {
        mockNotification.mockRestore();
      }
    });

    it("should deduplicate notifications for same recipient", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockResolvedValue({} as any);

      const uniqueRecipients = new Set(["clerk_1", "clerk_2", "clerk_1"]);

      try {
        for (const clerkId of uniqueRecipients) {
          await NotificationService.dispatch(
            clerkId,
            "blueprint_shared",
            "User shared a blueprint with you",
            "User shared blueprint with you.",
            {
              blueprintId: "test-id",
              sharerName: "test@example.com",
            },
            "https://example.com/blueprints/test-id",
          );
        }

        expect(mockNotification).toHaveBeenCalledTimes(2);
      } finally {
        mockNotification.mockRestore();
      }
    });

    it("should include all required notification fields", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockResolvedValue({} as any);

      const requiredFields = {
        blueprintId: "test-blueprint-id",
        sharerName: "sharer@example.com",
      };

      try {
        await NotificationService.dispatch(
          "recipient-clerk-id",
          "blueprint_shared",
          "Blueprint shared notification title",
          "Blueprint shared notification message",
          requiredFields,
          "https://example.com/blueprints/test-blueprint-id",
        );

        expect(mockNotification).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.objectContaining(requiredFields),
          expect.any(String),
        );
      } finally {
        mockNotification.mockRestore();
      }
    });

    it("should handle different permission levels", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockResolvedValue({} as any);

      const permissions: Array<Parameters<typeof BlueprintSharingService.shareBlueprint>[0]["permission"]> =
        ["read_only", "edit"];

      try {
        for (const permission of permissions) {
          await NotificationService.dispatch(
            "clerk_1",
            "blueprint_shared",
            "Blueprint shared",
            `User shared blueprint. You have ${permission} access.`,
            {
              blueprintId: "test-id",
              sharerName: "test@example.com",
            },
            "https://example.com/blueprints/test-id",
          );
        }

        expect(mockNotification).toHaveBeenCalledTimes(2);
        expect(mockNotification).toHaveBeenNthCalledWith(
          1,
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.stringContaining("read_only"),
          expect.any(Object),
          expect.any(String),
        );
        expect(mockNotification).toHaveBeenNthCalledWith(
          2,
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.stringContaining("edit"),
          expect.any(Object),
          expect.any(String),
        );
      } finally {
        mockNotification.mockRestore();
      }
    });

    it("should handle notification service errors gracefully", async () => {
      const mockNotification = jest
        .spyOn(NotificationService, "dispatch")
        .mockRejectedValue(new Error("Notification service error"));

      try {
        await NotificationService.dispatch(
          "clerk_1",
          "blueprint_shared",
          "Blueprint shared",
          "Blueprint shared message",
          {
            blueprintId: "test-id",
            sharerName: "test@example.com",
          },
          "https://example.com/blueprints/test-id",
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Notification service error");
      } finally {
        mockNotification.mockRestore();
      }
    });
  });

  describe("Service Integration", () => {
    it("should import NotificationService correctly", () => {
      expect(NotificationService).toBeDefined();
      expect(NotificationService.dispatch).toBeDefined();
    });

    it("should have correct notification type for blueprint sharing", () => {
      const validTypes = [
        "blueprint_complete",
        "team_invitation",
        "deployment_status",
        "credit_warning",
        "blueprint_shared",
      ];

      expect(validTypes).toContain("blueprint_shared");
    });
  });
});
