/**
 * TeamService Test Suite
 *
 * Critical Business Logic Testing:
 * - Team creation with subscription limits and validation
 * - Team retrieval with caching and authorization
 * - Team member invitations with email validation
 * - Team member role management
 * - Team member removal with project cleanup
 * - Team project management
 * - Team deletion with validation
 * - Cache behavior (hit/miss scenarios, invalidation)
 * - Error handling for database, authorization, and validation errors
 */

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  teamCache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/lib/services/activity-feed-service", () => ({
  ActivityFeedService: {
    recordActivity: jest.fn(),
  },
}));

jest.mock("@/lib/services/webhook-event-dispatcher", () => ({
  WebhookEventDispatcher: {
    emitTeamCreated: jest.fn(),
    emitTeamMemberAdded: jest.fn(),
    emitTeamMemberRoleChanged: jest.fn(),
    emitTeamMemberRemoved: jest.fn(),
    emitTeamDeleted: jest.fn(),
    emitTeamUpdated: jest.fn(),
  },
}));

jest.mock("@/lib/services/notification-service", () => ({
  NotificationService: {
    dispatch: jest.fn(),
  },
}));

jest.mock("@/lib/services/subscription-limits-service", () => ({
  subscriptionLimitsService: {
    canCreateTeam: jest.fn(),
    canAddMember: jest.fn(),
    getTeamLimitError: jest.fn(),
    getMemberLimitError: jest.fn(),
  },
}));

jest.mock("@/lib/services/team-member-access-service", () => ({
  teamMemberAccessService: {
    verifyTeamAccess: jest.fn(),
    getUserActiveTeamCount: jest.fn(),
    getTeamMemberCount: jest.fn(),
  },
}));

jest.mock("@/lib/services/team-analytics-service", () => ({
  teamAnalyticsService: {
    getTeamAnalytics: jest.fn(),
  },
}));

import { db } from "@/lib/db";
import { teamCache } from "@/lib/services/cache-orchestrator";
import { logger } from "@/lib/logger";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { NotificationService } from "@/lib/services/notification-service";
import { subscriptionLimitsService } from "@/lib/services/subscription-limits-service";
import { teamMemberAccessService } from "@/lib/services/team-member-access-service";
import { teamAnalyticsService } from "@/lib/services/team-analytics-service";
import { teams, teamMembers, users, projects, teamProjects } from "@/lib/db/schema";
import { eq, and, desc, count, ilike, isNull, inArray } from "drizzle-orm";
import { teamService } from "@/lib/services/team-service";
import type { TeamCreationRequest, TeamMemberInvitationRequest, TeamRole } from "@/lib/services/team-service";

const createMockTeam = (overrides?: any) => ({
  id: "team-123",
  name: "Test Team",
  ownerId: 1,
  subscriptionTier: "free",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  deletedAt: null,
  ...overrides,
});

const createMockUser = (overrides?: any) => ({
  id: 1,
  email: "test@example.com",
  clerkId: "clerk-123",
  subscriptionTier: "free",
  credits: 100,
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

const createMockTeamMember = (overrides?: any) => ({
  id: 1,
  teamId: "team-123",
  userId: 1,
  role: "admin",
  invitedBy: 1,
  joinedAt: new Date("2024-01-01"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  deletedAt: null,
  ...overrides,
});

const createMockDb = () => ({
  transaction: jest.fn().mockImplementation(async (callback) => {
    let insertCallCount = 0;
    const mockTx = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockImplementation(async () => {
            insertCallCount++;
            if (insertCallCount === 1) {
              return [createMockTeam()];
            }
            return [];
          }),
        }),
      }),
    };
    return await callback(mockTx);
  }),
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([createMockTeam()]),
      }),
    }),
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([createMockTeamMember()]),
    }),
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue({ rowCount: 1 }),
  }),
});

describe("TeamService - Critical Business Logic", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    (db as jest.Mock).mockReturnValue(mockDb);
    jest.clearAllMocks();
  });

  describe("createTeam - Team Creation", () => {
    it("should successfully create a new team with owner as admin", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "New Team",
        ownerId: 1,
      };

      const mockUser = createMockUser({ id: 1 });

      (teamMemberAccessService.getUserActiveTeamCount as jest.Mock).mockResolvedValue(0);
      (subscriptionLimitsService.canCreateTeam as jest.Mock).mockReturnValue(true);

      let insertCallCount = 0;
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          insert: jest.fn().mockImplementation(() => {
            insertCallCount++;
            return {
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockImplementation(async () => {
                  if (insertCallCount === 1) {
                    return [createMockTeam({ name: request.name })];
                  }
                  return [];
                }),
              }),
            };
          }),
        };
        const newTeam = await callback(mockTx);
        return [newTeam];
      });

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      // Act
      const result = await teamService.createTeam(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe("New Team");
      expect(teamMemberAccessService.getUserActiveTeamCount).toHaveBeenCalledWith(1);
      expect(subscriptionLimitsService.canCreateTeam).toHaveBeenCalled();
      expect(teamCache.invalidate).toHaveBeenCalledWith("user:1:teams");
    });

    it("should throw ValidationError when team name is empty", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "",
        ownerId: 1,
      };

      // Act & Assert
      await expect(teamService.createTeam(request)).rejects.toThrow("Team name is required");
    });

    it("should throw ValidationError when team name exceeds 100 characters", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "a".repeat(101),
        ownerId: 1,
      };

      // Act & Assert
      await expect(teamService.createTeam(request)).rejects.toThrow("Team name must be 100 characters or less");
    });

    it("should throw ValidationError when user does not exist", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "New Team",
        ownerId: 999,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.createTeam(request)).rejects.toThrow("Invalid owner ID");
    });

    it("should throw ValidationError when subscription limit reached", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "New Team",
        ownerId: 1,
      };

      const mockUser = createMockUser({ id: 1 });
      
      (teamMemberAccessService.getUserActiveTeamCount as jest.Mock).mockResolvedValue(5);
      (subscriptionLimitsService.canCreateTeam as jest.Mock).mockReturnValue(false);
      (subscriptionLimitsService.getTeamLimitError as jest.Mock).mockReturnValue("Team limit reached");

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.createTeam(request)).rejects.toThrow("Team limit reached");
    });

    it("should record activity and emit webhook on successful team creation", async () => {
      // Arrange
      const request: TeamCreationRequest = {
        name: "New Team",
        ownerId: 1,
      };

      const mockUser = createMockUser({ id: 1 });
      
      (teamMemberAccessService.getUserActiveTeamCount as jest.Mock).mockResolvedValue(0);
      (subscriptionLimitsService.canCreateTeam as jest.Mock).mockReturnValue(true);
      
      let insertCallCount = 0;
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          insert: jest.fn().mockImplementation(() => {
            insertCallCount++;
            return {
              values: jest.fn().mockReturnValue({
                returning: jest.fn().mockImplementation(async () => {
                  if (insertCallCount === 1) {
                    return [createMockTeam({ name: request.name })];
                  }
                  return [];
                }),
              }),
            };
          }),
        };
        const newTeam = await callback(mockTx);
        return [newTeam];
      });

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        });

      // Act
      await teamService.createTeam(request);

      // Assert
      expect(WebhookEventDispatcher.emitTeamCreated).toHaveBeenCalledWith(
        1,
        "clerk-123",
        "team-123",
        "New Team"
      );
      expect(ActivityFeedService.recordActivity).toHaveBeenCalled();
    });
  });

  describe("getUserTeams - Team Retrieval", () => {
    it("should return user teams from cache when available", async () => {
      // Arrange
      const userId = 1;
      const cachedTeams = {
        teams: [createMockTeam()],
        total: 1,
      };

      (teamCache.get as jest.Mock).mockResolvedValue(cachedTeams);

      // Act
      const result = await teamService.getUserTeams(userId);

      // Assert
      expect(result).toEqual(cachedTeams);
      expect(teamCache.get).toHaveBeenCalled();
      expect(db).not.toHaveBeenCalled();
    });

    it("should fetch user teams from database when not cached", async () => {
      // Arrange
      const userId = 1;
      const mockTeams = [createMockTeam()];

      (teamCache.get as jest.Mock).mockResolvedValue(null);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockTeams),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 1 }]),
            }),
          }),
        });

      // Act
      const result = await teamService.getUserTeams(userId);

      // Assert
      expect(result.teams).toHaveLength(1);
      expect(teamCache.set).toHaveBeenCalled();
    });

    it("should apply search filter when provided", async () => {
      // Arrange
      const userId = 1;

      (teamCache.get as jest.Mock).mockResolvedValue(null);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }),
        });

      // Act
      await teamService.getUserTeams(userId, { search: "Test" });

      // Assert
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("getTeamById - Team Details", () => {
    it("should return team details with members", async () => {
      // Arrange
      const teamId = "team-123";
      const requestingUserId = 1;

      const mockTeam = createMockTeam();
      const mockMembers = [
        createMockTeamMember({ userId: 1, user: createMockUser() }),
      ];
      const mockMemberCount = [{ memberCount: 1 }];

      (teamCache.get as jest.Mock).mockResolvedValue(null);
      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMemberCount),
          }),
        });

      // Act
      const result = await teamService.getTeamById(teamId, requestingUserId);

      // Assert
      expect(result.id).toBe(teamId);
      expect(result.members).toBeDefined();
      expect(teamCache.set).toHaveBeenCalled();
    });

    it("should throw NotFoundError when team does not exist", async () => {
      // Arrange
      const teamId = "nonexistent";
      const requestingUserId = 1;

      (teamCache.get as jest.Mock).mockResolvedValue(null);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.getTeamById(teamId, requestingUserId))
        .rejects.toThrow("Team not found");
    });

    it("should verify user access to team", async () => {
      // Arrange
      const teamId = "team-123";
      const requestingUserId = 1;

      const mockTeam = createMockTeam();
      const mockMembers = [createMockTeamMember()];
      const mockMemberCount = [{ memberCount: 1 }];

      (teamCache.get as jest.Mock).mockResolvedValue(null);
      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockMemberCount),
          }),
        });

      // Act
      await teamService.getTeamById(teamId, requestingUserId);

      // Assert
      expect(teamMemberAccessService.verifyTeamAccess).toHaveBeenCalledWith(
        teamId,
        requestingUserId,
        ["admin", "member", "viewer"]
      );
    });
  });

  describe("inviteTeamMember - Member Invitation", () => {
    it("should successfully invite a team member", async () => {
      // Arrange
      const teamId = "team-123";
      const invitation: TeamMemberInvitationRequest = {
        email: "newmember@example.com",
        role: "member",
      };
      const invitingUserId = 1;

      const mockTeam = createMockTeam({ subscriptionTier: "pro" });
      const mockUser = createMockUser({ id: 2, email: "newmember@example.com" });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      (teamMemberAccessService.getTeamMemberCount as jest.Mock).mockResolvedValue(1);
      (subscriptionLimitsService.canAddMember as jest.Mock).mockReturnValue(true);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createMockTeamMember()]),
        }),
      });

      // Act
      const result = await teamService.inviteTeamMember(teamId, invitation, invitingUserId);

      // Assert
      expect(result).toBeDefined();
      expect(teamMemberAccessService.verifyTeamAccess).toHaveBeenCalledWith(teamId, invitingUserId, ["admin"]);
      expect(teamCache.invalidate).toHaveBeenCalled();
    });

    it("should throw ValidationError when email is invalid", async () => {
      // Arrange
      const teamId = "team-123";
      const invitation: TeamMemberInvitationRequest = {
        email: "invalid-email",
        role: "member",
      };
      const invitingUserId = 1;

      // Act & Assert
      await expect(teamService.inviteTeamMember(teamId, invitation, invitingUserId))
        .rejects.toThrow("Invalid email format");
    });

    it("should throw ValidationError when user is already a team member", async () => {
      // Arrange
      const teamId = "team-123";
      const invitation: TeamMemberInvitationRequest = {
        email: "existing@example.com",
        role: "member",
      };
      const invitingUserId = 1;

      const mockTeam = createMockTeam();
      const mockUser = createMockUser({ id: 2, email: "existing@example.com" });
      const mockExistingMember = [createMockTeamMember()];

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      (teamMemberAccessService.getTeamMemberCount as jest.Mock).mockResolvedValue(1);
      (subscriptionLimitsService.canAddMember as jest.Mock).mockReturnValue(true);

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockExistingMember]),
            }),
          }),
        });

      // Act & Assert
      await expect(teamService.inviteTeamMember(teamId, invitation, invitingUserId))
        .rejects.toThrow("User is already a team member");
    });

    it("should throw ValidationError when subscription member limit reached", async () => {
      // Arrange
      const teamId = "team-123";
      const invitation: TeamMemberInvitationRequest = {
        email: "newmember@example.com",
        role: "member",
      };
      const invitingUserId = 1;

      const mockTeam = createMockTeam({ subscriptionTier: "free" });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      (teamMemberAccessService.getTeamMemberCount as jest.Mock).mockResolvedValue(5);
      (subscriptionLimitsService.canAddMember as jest.Mock).mockReturnValue(false);
      (subscriptionLimitsService.getMemberLimitError as jest.Mock).mockReturnValue("Member limit reached");

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.inviteTeamMember(teamId, invitation, invitingUserId))
        .rejects.toThrow("Member limit reached");
    });
  });

  describe("updateTeamMemberRole - Role Management", () => {
    it("should successfully update team member role", async () => {
      // Arrange
      const teamId = "team-123";
      const targetUserId = 2;
      const newRole: TeamRole = "member";
      const requestingUserId = 1;

      const mockTeam = createMockTeam();
      const mockUpdatedMember = createMockTeamMember({ userId: 2, role: "member" });
      const mockRequestingUser = createMockUser();
      const mockTargetUser = createMockUser({ id: 2 });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              mockTeam,
              mockRequestingUser,
              mockTargetUser,
              mockTeam,
            ]),
          }),
        }),
      });

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedMember]),
          }),
        }),
      });

      // Act
      const result = await teamService.updateTeamMemberRole(teamId, targetUserId, newRole, requestingUserId);

      // Assert
      expect(result.role).toBe("member");
      expect(teamCache.invalidate).toHaveBeenCalledWith(`team:${teamId}:details`);
    });

    it("should throw ValidationError when trying to change owner's role", async () => {
      // Arrange
      const teamId = "team-123";
      const targetUserId = 1;
      const newRole: TeamRole = "member";
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ ownerId: 1 });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.updateTeamMemberRole(teamId, targetUserId, newRole, requestingUserId))
        .rejects.toThrow("Cannot change team owner's role");
    });
  });

  describe("removeTeamMember - Member Removal", () => {
    it("should successfully remove team member", async () => {
      // Arrange
      const teamId = "team-123";
      const targetUserId = 2;
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ ownerId: 1 });
      const mockRemovedMember = createMockTeamMember({ userId: 2 });
      const mockRequestingUser = createMockUser();
      const mockTargetUser = createMockUser({ id: 2 });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              mockTeam,
              [],
              mockRequestingUser,
              mockTargetUser,
              mockTeam,
            ]),
          }),
        }),
      });

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockRemovedMember]),
          }),
        }),
      });

      mockDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 0 }),
      });

      // Act
      await teamService.removeTeamMember(teamId, targetUserId, requestingUserId);

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
      expect(teamCache.invalidate).toHaveBeenCalledWith(`team:${teamId}:details`);
    });

    it("should throw ValidationError when trying to remove team owner", async () => {
      // Arrange
      const teamId = "team-123";
      const targetUserId = 1;
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ ownerId: 1 });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      // Act & Assert
      await expect(teamService.removeTeamMember(teamId, targetUserId, requestingUserId))
        .rejects.toThrow("Cannot remove team owner");
    });
  });

  describe("deleteTeam - Team Deletion", () => {
    it("should successfully delete team with no active projects", async () => {
      // Arrange
      const teamId = "team-123";
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ id: teamId, name: "Test Team", ownerId: 1 });
      const mockUser = createMockUser({ id: 1 });
      const mockMembers = [];
      const mockProjectCount = [{ projectCount: 0 }];

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          update: jest.fn().mockImplementation(() => {
            return {
              set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue(undefined),
              }),
            };
          }),
        };
        await callback(mockTx);
      });

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ memberCount: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(mockMembers),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(mockProjectCount),
            }),
          }),
        });

      // Act
      await teamService.deleteTeam(teamId, requestingUserId);

      // Assert
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(teamCache.invalidate).toHaveBeenCalledWith(`team:${teamId}:details`);
    });

    it("should throw ValidationError when team has active projects", async () => {
      // Arrange
      const teamId = "team-123";
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ id: teamId, name: "Test Team", ownerId: 1 });
      const mockUser = createMockUser({ id: 1 });
      const mockProjectCount = [{ projectCount: 5 }];

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ memberCount: 1 }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(mockProjectCount),
            }),
          }),
        });

      // Act & Assert
      await expect(teamService.deleteTeam(teamId, requestingUserId))
        .rejects.toThrow("Cannot delete team with active projects");
    });

    it("should throw AuthorizationError when user is not team owner", async () => {
      // Arrange
      const teamId = "team-123";
      const requestingUserId = 2;

      const mockTeam = createMockTeam({ id: teamId, name: "Test Team", ownerId: 1 });
      const mockUser = createMockUser({ id: 2 });

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTeam]),
            }),
          }),
        });

      // Act & Assert
      await expect(teamService.deleteTeam(teamId, requestingUserId))
        .rejects.toThrow("Only team owners can delete teams");
    });
  });

  describe("updateTeamName - Team Name Update", () => {
    it("should successfully update team name", async () => {
      // Arrange
      const teamId = "team-123";
      const newName = "Updated Team Name";
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ id: teamId, name: "Old Team Name" });
      const mockUpdatedTeam = createMockTeam({ id: teamId, name: "Updated Team Name" });
      const mockUser = createMockUser();
      const mockMembers = [];

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTeam, mockUser, mockTeam, mockMembers]),
          }),
        }),
      });

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedTeam]),
          }),
        }),
      });

      // Act
      const result = await teamService.updateTeamName(teamId, newName, requestingUserId);

      // Assert
      expect(result.name).toBe("Updated Team Name");
      expect(teamCache.invalidate).toHaveBeenCalledWith(`team:${teamId}:details`);
    });

    it("should return original team when name is unchanged", async () => {
      // Arrange
      const teamId = "team-123";
      const newName = "Test Team";
      const requestingUserId = 1;

      const mockTeam = createMockTeam({ id: teamId, name: "Test Team" });

      (teamMemberAccessService.verifyTeamAccess as jest.Mock).mockResolvedValue(undefined);
      
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      // Act
      const result = await teamService.updateTeamName(teamId, newName, requestingUserId);

      // Assert
      expect(result.name).toBe("Test Team");
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
