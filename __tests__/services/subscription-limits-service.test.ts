/**
 * SubscriptionLimitsService Test Suite
 *
 * Critical Business Logic Testing:
 * - Subscription tier limit validation (teams, members)
 * - Unlimited tier handling (enterprise)
 * - Limit enforcement and error message generation
 * - Tier-based quota management
 * - Subscription upgrade/downgrade scenarios
 */

import { describe, test, expect } from "@jest/globals";
import { SubscriptionLimitsService } from "@/lib/services/subscription-limits-service";

describe("SubscriptionLimitsService - Subscription Tier Limits", () => {
  let service: SubscriptionLimitsService;

  beforeEach(() => {
    service = SubscriptionLimitsService.getInstance();
  });

  describe("Singleton Pattern", () => {
    test("should return same instance across multiple calls", () => {
      const instance1 = SubscriptionLimitsService.getInstance();
      const instance2 = SubscriptionLimitsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    test("should be a valid instance of SubscriptionLimitsService", () => {
      expect(service).toBeInstanceOf(SubscriptionLimitsService);
    });
  });

  describe("Max Teams Limit Calculation", () => {
    test("should return 1 for free tier", () => {
      const maxTeams = service.getMaxTeamsForSubscription("free");

      expect(maxTeams).toBe(1);
    });

    test("should return 5 for pro tier", () => {
      const maxTeams = service.getMaxTeamsForSubscription("pro");

      expect(maxTeams).toBe(5);
    });

    test("should return -1 for enterprise tier (unlimited)", () => {
      const maxTeams = service.getMaxTeamsForSubscription("enterprise");

      expect(maxTeams).toBe(-1);
    });

    test("should default to 1 for unknown tier", () => {
      const maxTeams = service.getMaxTeamsForSubscription("unknown_tier");

      expect(maxTeams).toBe(1);
    });
  });

  describe("Max Members Limit Calculation", () => {
    test("should return 2 for free tier", () => {
      const maxMembers = service.getMaxMembersForSubscription("free");

      expect(maxMembers).toBe(2);
    });

    test("should return 10 for pro tier", () => {
      const maxMembers = service.getMaxMembersForSubscription("pro");

      expect(maxMembers).toBe(10);
    });

    test("should return -1 for enterprise tier (unlimited)", () => {
      const maxMembers = service.getMaxMembersForSubscription("enterprise");

      expect(maxMembers).toBe(-1);
    });

    test("should default to 2 for unknown tier", () => {
      const maxMembers = service.getMaxMembersForSubscription("unknown_tier");

      expect(maxMembers).toBe(2);
    });
  });

  describe("Unlimited Teams Detection", () => {
    test("should return false for free tier", () => {
      const isUnlimited = service.hasUnlimitedTeams("free");

      expect(isUnlimited).toBe(false);
    });

    test("should return false for pro tier", () => {
      const isUnlimited = service.hasUnlimitedTeams("pro");

      expect(isUnlimited).toBe(false);
    });

    test("should return true for enterprise tier", () => {
      const isUnlimited = service.hasUnlimitedTeams("enterprise");

      expect(isUnlimited).toBe(true);
    });
  });

  describe("Unlimited Members Detection", () => {
    test("should return false for free tier", () => {
      const isUnlimited = service.hasUnlimitedMembers("free");

      expect(isUnlimited).toBe(false);
    });

    test("should return false for pro tier", () => {
      const isUnlimited = service.hasUnlimitedMembers("pro");

      expect(isUnlimited).toBe(false);
    });

    test("should return true for enterprise tier", () => {
      const isUnlimited = service.hasUnlimitedMembers("enterprise");

      expect(isUnlimited).toBe(true);
    });
  });

  describe("Team Creation Validation", () => {
    test("should allow creating team when under limit (free tier)", () => {
      const canCreate = service.canCreateTeam(0, "free");

      expect(canCreate).toBe(true);
    });

    test("should allow creating team when at limit (free tier, last team)", () => {
      const canCreate = service.canCreateTeam(0, "free");

      expect(canCreate).toBe(true);
    });

    test("should prevent creating team when at limit (free tier)", () => {
      const canCreate = service.canCreateTeam(1, "free");

      expect(canCreate).toBe(false);
    });

    test("should prevent creating team when over limit (free tier)", () => {
      const canCreate = service.canCreateTeam(2, "free");

      expect(canCreate).toBe(false);
    });

    test("should allow creating team when under limit (pro tier)", () => {
      const canCreate = service.canCreateTeam(3, "pro");

      expect(canCreate).toBe(true);
    });

    test("should prevent creating team when at limit (pro tier)", () => {
      const canCreate = service.canCreateTeam(5, "pro");

      expect(canCreate).toBe(false);
    });

    test("should allow unlimited team creation (enterprise tier)", () => {
      const canCreate1 = service.canCreateTeam(100, "enterprise");
      const canCreate2 = service.canCreateTeam(1000, "enterprise");
      const canCreate3 = service.canCreateTeam(10000, "enterprise");

      expect(canCreate1).toBe(true);
      expect(canCreate2).toBe(true);
      expect(canCreate3).toBe(true);
    });

    test("should allow creating team with zero current count", () => {
      const canCreate = service.canCreateTeam(0, "pro");

      expect(canCreate).toBe(true);
    });

    test("should handle edge case: negative current count", () => {
      const canCreate = service.canCreateTeam(-1, "free");

      expect(canCreate).toBe(true);
    });
  });

  describe("Member Addition Validation", () => {
    test("should allow adding member when under limit (free tier)", () => {
      const canAdd = service.canAddMember(1, "free");

      expect(canAdd).toBe(true);
    });

    test("should prevent adding member when at limit (free tier)", () => {
      const canAdd = service.canAddMember(2, "free");

      expect(canAdd).toBe(false);
    });

    test("should prevent adding member when over limit (free tier)", () => {
      const canAdd = service.canAddMember(3, "free");

      expect(canAdd).toBe(false);
    });

    test("should allow adding member when under limit (pro tier)", () => {
      const canAdd = service.canAddMember(8, "pro");

      expect(canAdd).toBe(true);
    });

    test("should prevent adding member when at limit (pro tier)", () => {
      const canAdd = service.canAddMember(10, "pro");

      expect(canAdd).toBe(false);
    });

    test("should allow unlimited member addition (enterprise tier)", () => {
      const canAdd1 = service.canAddMember(50, "enterprise");
      const canAdd2 = service.canAddMember(500, "enterprise");
      const canAdd3 = service.canAddMember(5000, "enterprise");

      expect(canAdd1).toBe(true);
      expect(canAdd2).toBe(true);
      expect(canAdd3).toBe(true);
    });

    test("should allow adding member with zero current count", () => {
      const canAdd = service.canAddMember(0, "free");

      expect(canAdd).toBe(true);
    });

    test("should handle edge case: negative current count", () => {
      const canAdd = service.canAddMember(-1, "pro");

      expect(canAdd).toBe(true);
    });
  });

  describe("Team Limit Error Messages", () => {
    test("should return correct error message for free tier", () => {
      const errorMessage = service.getTeamLimitError("free");

      expect(errorMessage).toBe("Maximum 1 teams allowed for free subscription");
    });

    test("should return correct error message for pro tier", () => {
      const errorMessage = service.getTeamLimitError("pro");

      expect(errorMessage).toBe("Maximum 5 teams allowed for pro subscription");
    });

    test("should return correct error message for enterprise tier", () => {
      const errorMessage = service.getTeamLimitError("enterprise");

      expect(errorMessage).toBe("Enterprise subscription allows unlimited teams");
    });

    test("should return correct error message for unknown tier", () => {
      const errorMessage = service.getTeamLimitError("unknown_tier");

      expect(errorMessage).toBe("Maximum 1 teams allowed for unknown_tier subscription");
    });
  });

  describe("Member Limit Error Messages", () => {
    test("should return correct error message for free tier", () => {
      const errorMessage = service.getMemberLimitError("free");

      expect(errorMessage).toBe("Maximum 2 members allowed for free subscription");
    });

    test("should return correct error message for pro tier", () => {
      const errorMessage = service.getMemberLimitError("pro");

      expect(errorMessage).toBe("Maximum 10 members allowed for pro subscription");
    });

    test("should return correct error message for enterprise tier", () => {
      const errorMessage = service.getMemberLimitError("enterprise");

      expect(errorMessage).toBe("Enterprise subscription allows unlimited team members");
    });

    test("should return correct error message for unknown tier", () => {
      const errorMessage = service.getMemberLimitError("unknown_tier");

      expect(errorMessage).toBe("Maximum 2 members allowed for unknown_tier subscription");
    });
  });

  describe("Subscription Tier Scenarios", () => {
    test("should handle complete free tier lifecycle", () => {
      expect(service.getMaxTeamsForSubscription("free")).toBe(1);
      expect(service.getMaxMembersForSubscription("free")).toBe(2);
      expect(service.hasUnlimitedTeams("free")).toBe(false);
      expect(service.hasUnlimitedMembers("free")).toBe(false);
      expect(service.canCreateTeam(0, "free")).toBe(true);
      expect(service.canCreateTeam(1, "free")).toBe(false);
      expect(service.canAddMember(1, "free")).toBe(true);
      expect(service.canAddMember(2, "free")).toBe(false);
    });

    test("should handle complete pro tier lifecycle", () => {
      expect(service.getMaxTeamsForSubscription("pro")).toBe(5);
      expect(service.getMaxMembersForSubscription("pro")).toBe(10);
      expect(service.hasUnlimitedTeams("pro")).toBe(false);
      expect(service.hasUnlimitedMembers("pro")).toBe(false);
      expect(service.canCreateTeam(4, "pro")).toBe(true);
      expect(service.canCreateTeam(5, "pro")).toBe(false);
      expect(service.canAddMember(9, "pro")).toBe(true);
      expect(service.canAddMember(10, "pro")).toBe(false);
    });

    test("should handle complete enterprise tier lifecycle", () => {
      expect(service.getMaxTeamsForSubscription("enterprise")).toBe(-1);
      expect(service.getMaxMembersForSubscription("enterprise")).toBe(-1);
      expect(service.hasUnlimitedTeams("enterprise")).toBe(true);
      expect(service.hasUnlimitedMembers("enterprise")).toBe(true);
      expect(service.canCreateTeam(1000, "enterprise")).toBe(true);
      expect(service.canAddMember(5000, "enterprise")).toBe(true);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle boundary condition: exactly at team limit", () => {
      expect(service.canCreateTeam(1, "free")).toBe(false);
      expect(service.canCreateTeam(5, "pro")).toBe(false);
    });

    test("should handle boundary condition: exactly at member limit", () => {
      expect(service.canAddMember(2, "free")).toBe(false);
      expect(service.canAddMember(10, "pro")).toBe(false);
    });

    test("should handle boundary condition: one below team limit", () => {
      expect(service.canCreateTeam(0, "free")).toBe(true);
      expect(service.canCreateTeam(4, "pro")).toBe(true);
    });

    test("should handle boundary condition: one below member limit", () => {
      expect(service.canAddMember(1, "free")).toBe(true);
      expect(service.canAddMember(9, "pro")).toBe(true);
    });

    test("should handle large numbers for enterprise tier", () => {
      const largeTeamCount = 999999;
      const largeMemberCount = 999999;

      expect(service.canCreateTeam(largeTeamCount, "enterprise")).toBe(true);
      expect(service.canAddMember(largeMemberCount, "enterprise")).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    test("should validate team and member limits together", () => {
      const teamCount = 3;
      const memberCount = 8;
      const tier = "pro";

      const canCreateTeam = service.canCreateTeam(teamCount, tier);
      const canAddMember = service.canAddMember(memberCount, tier);

      expect(canCreateTeam).toBe(true);
      expect(canAddMember).toBe(true);
    });

    test("should prevent team creation when limit reached but allow member addition", () => {
      const tier = "free";

      const canCreateTeam = service.canCreateTeam(1, tier);
      const canAddMember = service.canAddMember(1, tier);

      expect(canCreateTeam).toBe(false);
      expect(canAddMember).toBe(true);
    });

    test("should provide appropriate error messages for limit violations", () => {
      const teamError = service.getTeamLimitError("free");
      const memberError = service.getMemberLimitError("pro");

      expect(teamError).toContain("Maximum 1 teams");
      expect(memberError).toContain("Maximum 10 members");
    });
  });
});
