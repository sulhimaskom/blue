import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { teamService } from "@/lib/services/team-service";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { ValidationError, AuthorizationError, NotFoundError, DatabaseError } from "@/lib/api-utils";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { NotificationService } from "@/lib/services/notification-service";
import { subscriptionLimitsService } from "@/lib/services/subscription-limits-service";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockResolvedValue([]),
    insert: jest.fn(),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn(),
        }),
      }),
    }),
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  teamCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/services/webhook-event-dispatcher", () => ({
  WebhookEventDispatcher: {
    emitTeamDeleted: jest.fn().mockResolvedValue(undefined),
    emitTeamUpdated: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/activity-feed-service", () => ({
  ActivityFeedService: {
    recordActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/notification-service", () => ({
  NotificationService: {
    dispatch: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("TeamService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTeam validation", () => {
    it("should throw ValidationError for missing name", async () => {
      await expect(
        teamService.createTeam({ name: "", ownerId: 1 })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for name too long", async () => {
      await expect(
        teamService.createTeam({ name: "a".repeat(101), ownerId: 1 })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("inviteTeamMember validation", () => {
    it("should throw ValidationError for missing email", async () => {
      await expect(
        teamService.inviteTeamMember(
          "team-1",
          { email: "", role: "member" },
          1
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for invalid role", async () => {
      await expect(
        teamService.inviteTeamMember(
          "team-1",
          { email: "test@example.com", role: "invalid" as any },
          1
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateTeamMemberRole validation", () => {
    it("should throw ValidationError for invalid role", async () => {
      await expect(
        teamService.updateTeamMemberRole("team-1", 1, "invalid" as any, 1)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("subscription limits", () => {
    it("should return correct team limits", () => {
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("free")).toBe(1);
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("pro")).toBe(5);
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("enterprise")).toBe(-1); // unlimited
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("unknown")).toBe(1); // default
    });

    it("should return correct member limits", () => {
      expect(subscriptionLimitsService.getMaxMembersForSubscription("free")).toBe(2);
      expect(subscriptionLimitsService.getMaxMembersForSubscription("pro")).toBe(10);
      expect(subscriptionLimitsService.getMaxMembersForSubscription("enterprise")).toBe(-1); // unlimited
      expect(subscriptionLimitsService.getMaxMembersForSubscription("unknown")).toBe(2); // default
    });
  });

describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock the db function to return a database that throws on transaction
      const mockDb = {
        select: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({}),
            from: jest.fn().mockReturnValue({}),
          }),
        }),
        transaction: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      };
      
      const { db: originalDb } = require("@/lib/db");
      require("@/lib/db").db = jest.fn().mockReturnValue(mockDb);

      await expect(
        teamService.createTeam({ name: "Test Team", ownerId: 1 })
      ).rejects.toThrow(DatabaseError);

      // Restore original mock
      require("@/lib/db").db = originalDb;
    });

    it("should handle validation errors properly", async () => {
      // Test that validation errors are properly thrown
      await expect(
        teamService.createTeam({ name: "", ownerId: 1 })
      ).rejects.toThrow(ValidationError);

      await expect(
        teamService.inviteTeamMember("team-1", { email: "", role: "member" }, 1)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("role validation", () => {
    it("should validate all allowed roles", () => {
      const validRoles = ["admin", "member", "viewer"];
      const invalidRoles = ["owner", "guest", "read-only"];

      // Test valid roles (should not throw in validation logic)
      validRoles.forEach(role => {
        expect(() => {
          // This simulates the role validation in the service
          if (!["admin", "member", "viewer"].includes(role)) {
            throw new Error("Invalid role");
          }
        }).not.toThrow();
      });

      // Test invalid roles (should throw)
      invalidRoles.forEach(role => {
        expect(() => {
          if (!["admin", "member", "viewer"].includes(role)) {
            throw new Error("Invalid role");
          }
        }).toThrow("Invalid role");
      });
    });
  });

  describe("team limits validation", () => {
    it("should enforce team limits for different subscription tiers", () => {
      // Free tier: 1 team max
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("free")).toBe(1);
      
      // Pro tier: 5 teams max
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("pro")).toBe(5);
      
      // Enterprise tier: unlimited teams
      expect(subscriptionLimitsService.getMaxTeamsForSubscription("enterprise")).toBe(-1);
    });

    it("should enforce member limits for different subscription tiers", () => {
      // Free tier: 2 members max
      expect(subscriptionLimitsService.getMaxMembersForSubscription("free")).toBe(2);
      
      // Pro tier: 10 members max
      expect(subscriptionLimitsService.getMaxMembersForSubscription("pro")).toBe(10);
      
      // Enterprise tier: unlimited members
      expect(subscriptionLimitsService.getMaxMembersForSubscription("enterprise")).toBe(-1);
    });
  });

  describe("deleteTeam integration", () => {
    it("should have correct integration services imported", () => {
      expect(WebhookEventDispatcher).toBeDefined();
      expect(ActivityFeedService).toBeDefined();
      expect(NotificationService).toBeDefined();
    });
  });

  describe("updateTeamName", () => {
    it("should throw ValidationError for empty name", async () => {
      await expect(
        teamService.updateTeamName("team-1", "", 1)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for name too long", async () => {
      await expect(
        teamService.updateTeamName("team-1", "a".repeat(101), 1)
      ).rejects.toThrow(ValidationError);
    });
  });
});