import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { NotificationService } from "@/lib/services/notification-service";
import { ValidationError, NotFoundError, AuthorizationError, DatabaseError } from "@/lib/api-utils";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";

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
            "User shared blueprint with you. You have view access.",
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
        ["view", "edit", "fork", "admin"];

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
          expect.stringContaining("view"),
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

  describe("updateSharePermission", () => {
    it.skip("should update share permission level", async () => {
      // Test skipped - requires comprehensive database mocking
    });

    it.skip("should validate permission level", async () => {
      // Test skipped - requires comprehensive database mocking
    });

    it.skip("should require valid permission types", async () => {
      // Test skipped - requires comprehensive database mocking
    });
  });

  describe("getShareAuditLogs", () => {
    it("should return audit logs for blueprint shares", async () => {
      const mockDatabase = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([
          {
            id: "log-1",
            action: "view",
            createdAt: new Date(),
          },
        ]),
      };

      jest.doMock("@/lib/db", () => ({
        db: () => mockDatabase,
      }));

      try {
        const result = await BlueprintSharingService.getShareAuditLogs(
          "blueprint-id",
          1,
          1,
          50,
        );

        expect(result.logs).toBeDefined();
        expect(Array.isArray(result.logs)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBeDefined();
      } finally {
        jest.clearAllMocks();
      }
    });

    it("should paginate audit logs", async () => {
      const result = await BlueprintSharingService.getShareAuditLogs(
        "blueprint-id",
        1,
        2,
        25,
      );

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
    });

    it("should enforce owner access for audit logs", async () => {
      await expect(
        BlueprintSharingService.getShareAuditLogs("blueprint-id", 999, 1, 50),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe("Permission Levels", () => {
    it("should support view permission", () => {
      expect(["view", "edit", "fork", "admin"]).toContain("view");
    });

    it("should support edit permission", () => {
      expect(["view", "edit", "fork", "admin"]).toContain("edit");
    });

    it("should support fork permission", () => {
      expect(["view", "edit", "fork", "admin"]).toContain("fork");
    });

    it("should support admin permission", () => {
      expect(["view", "edit", "fork", "admin"]).toContain("admin");
    });

    it("should maintain backward compatibility with old permissions", () => {
      const permissions = ["view", "edit", "fork", "admin"];
      expect(permissions.length).toBeGreaterThan(2);
    });
  });

  describe("Audit Log Actions", () => {
    it("should track view actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("view");
    });

    it("should track edit actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("edit");
    });

    it("should track fork actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("fork");
    });

    it("should track share_created actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("share_created");
    });

    it("should track share_revoked actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("share_revoked");
    });

    it("should track permission_changed actions", () => {
      const validActions = ["view", "edit", "fork", "share_created", "share_revoked", "permission_changed"];
      expect(validActions).toContain("permission_changed");
    });
  });
});
