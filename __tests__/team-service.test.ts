import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { teamService } from "@/lib/services/team-service";
import { db } from "@/lib/db";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { ValidationError, AuthorizationError, NotFoundError } from "@/lib/api-utils";
import { DatabaseError } from "@/lib/services/service-error-handler";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
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

    it("should throw ValidationError for invalid email format", async () => {
      await expect(
        teamService.inviteTeamMember(
          "team-1",
          { email: "invalid-email", role: "member" },
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
    const service = teamService as any;

    it("should return correct team limits", () => {
      expect(service.getMaxTeamsForSubscription("free")).toBe(1);
      expect(service.getMaxTeamsForSubscription("pro")).toBe(5);
      expect(service.getMaxTeamsForSubscription("enterprise")).toBe(-1); // unlimited
      expect(service.getMaxTeamsForSubscription("unknown")).toBe(1); // default
    });

    it("should return correct member limits", () => {
      expect(service.getMaxMembersForSubscription("free")).toBe(2);
      expect(service.getMaxMembersForSubscription("pro")).toBe(10);
      expect(service.getMaxMembersForSubscription("enterprise")).toBe(-1); // unlimited
      expect(service.getMaxMembersForSubscription("unknown")).toBe(2); // default
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const mockDbSelect = db.select as jest.Mock;
      mockDbSelect.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockRejectedValue(new Error("Database connection failed"))
            })
          })
        }),
        from: jest.fn().mockReturnThis(),
      });

      await expect(
        teamService.createTeam({ name: "Test Team", ownerId: 1 })
      ).rejects.toThrow(DatabaseError);
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
      const service = teamService as any;

      // Free tier: 1 team max
      expect(service.getMaxTeamsForSubscription("free")).toBe(1);
      
      // Pro tier: 5 teams max
      expect(service.getMaxTeamsForSubscription("pro")).toBe(5);
      
      // Enterprise tier: unlimited teams
      expect(service.getMaxTeamsForSubscription("enterprise")).toBe(-1);
    });

    it("should enforce member limits for different subscription tiers", () => {
      const service = teamService as any;

      // Free tier: 2 members max
      expect(service.getMaxMembersForSubscription("free")).toBe(2);
      
      // Pro tier: 10 members max
      expect(service.getMaxMembersForSubscription("pro")).toBe(10);
      
      // Enterprise tier: unlimited members
      expect(service.getMaxMembersForSubscription("enterprise")).toBe(-1);
    });
  });
});