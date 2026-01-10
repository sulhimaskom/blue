import { eq, and, desc, count, ilike, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  teams,
  teamMembers,
  teamProjects,
  users,
  projects,
  type Team,
  type TeamMember,
  type TeamProject,
  type User,
  type Project,
} from "@/lib/db/schema";
import {
  ServiceError,
  ValidationError,
  AuthorizationError,
  DatabaseError,
} from "@/lib/services/service-error-handler";
import { NotFoundError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { teamCache } from "@/lib/services/cache-orchestrator";

export type TeamRole = "admin" | "member" | "viewer";

export interface TeamCreationRequest {
  name: string;
  ownerId: number;
  subscriptionTier?: string;
}

export interface TeamMemberInvitationRequest {
  email: string;
  role: TeamRole;
}

export interface TeamWithMembers extends Team {
  memberCount: number;
  members?: Array<TeamMember & { user: Pick<User, "id" | "email" | "clerkId"> }>;
}

export interface ProjectTeamAccess {
  projectId: string;
  teamId: string;
  role: TeamRole;
}

/**
 * Service for managing teams and team collaborations
 */
class TeamService {
  private CACHE_TTL = 300; // 5 minutes

  /**
   * Create a new team
   */
  async createTeam(request: TeamCreationRequest): Promise<Team> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.name?.trim()) {
        throw new ValidationError("Team name is required");
      }

      if (request.name.length > 100) {
        throw new ValidationError("Team name must be 100 characters or less");
      }

      // Check if user exists
      const database = db();
      const user = await database.select({ id: users.id, subscriptionTier: users.subscriptionTier }).from(users)
        .where(eq(users.id, request.ownerId))
        .limit(1);

      if (!user.length) {
        throw new ValidationError("Invalid owner ID");
      }

      // Check user's team limits based on subscription
      const userTeamsCount = await this.getUserActiveTeamCount(request.ownerId);
      const maxTeams = this.getMaxTeamsForSubscription(user[0].subscriptionTier || "free");

      if (userTeamsCount >= maxTeams) {
        throw new ValidationError(
          `Maximum ${maxTeams} teams allowed for ${user[0].subscriptionTier} subscription`
        );
      }

      // Create team and add owner as admin
      const [team] = await database.transaction(async (tx: any) => {
        const [newTeam] = await tx.insert(teams).values({
          name: request.name.trim(),
          ownerId: request.ownerId,
          subscriptionTier: request.subscriptionTier || "free",
        }).returning();

        // Add owner as admin member
        await tx.insert(teamMembers).values({
          teamId: newTeam.id,
          userId: request.ownerId,
          role: "admin",
          invitedBy: request.ownerId,
        });

        return newTeam;
      });

      // Clear user team cache
      await teamCache.invalidate(`user:${request.ownerId}:teams`);

      const duration = Date.now() - startTime;
      logger.userAction("team_created", request.ownerId.toString(), {
        teamId: team.id,
        teamName: team.name,
        duration: `${duration}ms`,
      });

      return team;
    } catch (error) {
      logger.error("Failed to create team", {
        error: error instanceof Error ? error.message : String(error),
        request,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to create team");
    }
  }

  /**
   * Get teams for a user
   */
  async getUserTeams(
    userId: number,
    options: { limit?: number; offset?: number; search?: string } = {}
  ): Promise<{ teams: TeamWithMembers[]; total: number }> {
    const { limit = 20, offset = 0, search } = options;
    const cacheKey = `user:${userId}:teams:${limit}:${offset}:${search || ""}`;

    try {
      // Check cache first
      const cached = await teamCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const database = db();
      
      let baseWhereConditions = and(
          eq(teamMembers.teamId, teams.id),
          eq(teamMembers.userId, userId),
          isNull(teamMembers.deletedAt),
          isNull(teams.deletedAt)
        );
        
      if (search) {
        baseWhereConditions = and(
          baseWhereConditions,
          ilike(teams.name, `%${search}%`)
        );
      }

      const teamsQuery = database.select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        subscriptionTier: teams.subscriptionTier,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        deletedAt: teams.deletedAt,
        memberCount: count(teamMembers.id),
      }).from(teams)
        .innerJoin(teamMembers, baseWhereConditions);

      const [teamsData, [{ count: total }]] = await Promise.all([
        teamsQuery.orderBy(desc(teams.createdAt)).limit(limit).offset(offset),
        database.select({ count: count() }).from(teams)
          .innerJoin(teamMembers, and(
            eq(teamMembers.teamId, teams.id),
            eq(teamMembers.userId, userId),
            isNull(teamMembers.deletedAt)
          ))
          .where(isNull(teams.deletedAt)),
      ]);

      const result = { teams: teamsData, total };

      // Cache result
      await teamCache.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      logger.error("Failed to get user teams", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw new DatabaseError("Failed to get user teams");
    }
  }

  /**
   * Get team details with members
   */
  async getTeamById(teamId: string, requestingUserId: number): Promise<TeamWithMembers> {
    const cacheKey = `team:${teamId}:details`;

    try {
      // Check cache first
      const cached = await teamCache.get(cacheKey);
      if (cached) {
        // Verify user has access
        await this.verifyTeamAccess(teamId, requestingUserId, ["admin", "member", "viewer"]);
        return cached;
      }

      const database = db();
      
      // Get team details
      const [team] = await database.select().from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1);

      if (!team) {
        throw new NotFoundError("Team not found");
      }

      // Verify user access
      await this.verifyTeamAccess(teamId, requestingUserId, ["admin", "member", "viewer"]);

      // Get team members with user details
      const members = await database.select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        invitedBy: teamMembers.invitedBy,
        joinedAt: teamMembers.joinedAt,
        createdAt: teamMembers.createdAt,
        updatedAt: teamMembers.updatedAt,
        deletedAt: teamMembers.deletedAt,
        user: {
          id: users.id,
          email: users.email,
          clerkId: users.clerkId,
        },
      }).from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)))
        .orderBy(teamMembers.joinedAt);

      // Get member count
      const [{ memberCount }] = await database.select({ memberCount: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      const result = { ...team, memberCount, members };

      // Cache result
      await teamCache.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      logger.error("Failed to get team details", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to get team details");
    }
  }

  /**
   * Invite a user to join a team
   */
  async inviteTeamMember(
    teamId: string,
    invitation: TeamMemberInvitationRequest,
    invitingUserId: number
  ): Promise<{ invitation: TeamMember; user: { email: string; clerkId: string | null } }> {
    try {
      // Validate input
      if (!invitation.email?.trim() || !invitation.role) {
        throw new ValidationError("Email and role are required");
      }

      if (!["admin", "member", "viewer"].includes(invitation.role)) {
        throw new ValidationError("Invalid role. Must be admin, member, or viewer");
      }

      // Verify inviting user is team admin
      await this.verifyTeamAccess(teamId, invitingUserId, ["admin"]);

      // Get team and check member limits
      const database = db();
      const [team] = await database.select({
        id: teams.id,
        subscriptionTier: teams.subscriptionTier,
      }).from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1);

      if (!team) {
        throw new NotFoundError("Team not found");
      }

      const memberCount = await this.getTeamMemberCount(teamId);
      const maxMembers = this.getMaxMembersForSubscription(team.subscriptionTier);

      if (memberCount >= maxMembers) {
        throw new ValidationError(
          `Maximum ${maxMembers} members allowed for ${team.subscriptionTier} subscription`
        );
      }

      // Find user by email
      const [user] = await database.select().from(users)
        .where(and(eq(users.email, invitation.email.trim().toLowerCase()), isNull(users.deletedAt)))
        .limit(1);

      if (!user) {
        throw new ValidationError("User with this email not found");
      }

      // Check if user is already a member
      const existingMember = await database.select().from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, user.id),
          isNull(teamMembers.deletedAt)
        ))
        .limit(1);

      if (existingMember.length) {
        throw new ValidationError("User is already a team member");
      }

      // Create invitation
      const [newMember] = await database.insert(teamMembers).values({
        teamId,
        userId: user.id,
        role: invitation.role as TeamRole,
        invitedBy: invitingUserId,
      }).returning();

      // Clear team cache
      await teamCache.invalidate(`team:${teamId}:details`);
      await teamCache.invalidate(`user:${user.id}:teams`);

      logger.userAction("team_member_invited", invitingUserId.toString(), {
        teamId,
        userId: user.id,
        email: invitation.email,
        role: invitation.role,
      });

      return {
        invitation: newMember,
        user: { email: user.email, clerkId: user.clerkId },
      };
    } catch (error) {
      logger.error("Failed to invite team member", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        invitation,
        invitingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to invite team member");
    }
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    teamId: string,
    targetUserId: number,
    newRole: TeamRole,
    requestingUserId: number
  ): Promise<TeamMember> {
    try {
      // Validate role
      if (!["admin", "member", "viewer"].includes(newRole)) {
        throw new ValidationError("Invalid role. Must be admin, member, or viewer");
      }

      // Verify requesting user is team admin
      await this.verifyTeamAccess(teamId, requestingUserId, ["admin"]);

      // Cannot remove owner's admin role
      const database = db();
      const [team] = await database.select({ ownerId: teams.ownerId }).from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1);

      if (!team) {
        throw new NotFoundError("Team not found");
      }

      if (team.ownerId === targetUserId && newRole !== "admin") {
        throw new ValidationError("Cannot change team owner's role");
      }

      // Update member role
      const [updatedMember] = await database.update(teamMembers)
        .set({ role: newRole, updatedAt: new Date() })
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId),
          isNull(teamMembers.deletedAt)
        ))
        .returning();

      if (!updatedMember) {
        throw new NotFoundError("Team member not found");
      }

      // Clear cache
      await teamCache.invalidate(`team:${teamId}:details`);

      logger.userAction("team_member_role_updated", requestingUserId.toString(), {
        teamId,
        targetUserId,
        newRole,
      });

      return updatedMember;
    } catch (error) {
      logger.error("Failed to update team member role", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        targetUserId,
        newRole,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to update team member role");
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(
    teamId: string,
    targetUserId: number,
    requestingUserId: number
  ): Promise<void> {
    try {
      // Verify requesting user is team admin
      await this.verifyTeamAccess(teamId, requestingUserId, ["admin"]);

      // Cannot remove team owner
      const database = db();
      const [team] = await database.select({ ownerId: teams.ownerId }).from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1);

      if (!team) {
        throw new NotFoundError("Team not found");
      }

      if (team.ownerId === targetUserId) {
        throw new ValidationError("Cannot remove team owner");
      }

      // Soft delete member
      const [removedMember] = await database.update(teamMembers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId),
          isNull(teamMembers.deletedAt)
        ))
        .returning();

      if (!removedMember) {
        throw new NotFoundError("Team member not found");
      }

      // Remove from team projects
      const userProjects = await database.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.ownerId, targetUserId));
      
      if (userProjects.length > 0) {
        await database.delete(teamProjects)
          .where(and(
            eq(teamProjects.teamId, teamId),
            inArray(teamProjects.projectId, userProjects.map(p => p.id))
          ));
      }

      // Clear cache
      await teamCache.invalidate(`team:${teamId}:details`);
      await teamCache.invalidate(`user:${targetUserId}:teams`);

      logger.userAction("team_member_removed", requestingUserId.toString(), {
        teamId,
        targetUserId,
      });
    } catch (error) {
      logger.error("Failed to remove team member", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        targetUserId,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to remove team member");
    }
  }

  /**
   * Add project to team
   */
  async addProjectToTeam(
    teamId: string,
    projectId: string,
    role: TeamRole = "member",
    requestingUserId: number
  ): Promise<TeamProject> {
    try {
      // Verify requesting user has admin or member access to team
      await this.verifyTeamAccess(teamId, requestingUserId, ["admin", "member"]);

      // Verify user is project owner
      const database = db();
      const [project] = await database.select({ ownerId: projects.ownerId }).from(projects)
        .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
        .limit(1);

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      if (project.ownerId !== requestingUserId) {
        throw new AuthorizationError("Only project owners can add projects to teams");
      }

      // Check if project is already in team
      const existing = await database.select().from(teamProjects)
        .where(and(
          eq(teamProjects.projectId, projectId),
          eq(teamProjects.teamId, teamId)
        ))
        .limit(1);

      if (existing.length) {
        throw new ValidationError("Project is already in this team");
      }

      // Add project to team
      const [teamProject] = await database.insert(teamProjects).values({
        projectId,
        teamId,
        role,
      }).returning();

      logger.userAction("project_added_to_team", requestingUserId.toString(), {
        teamId,
        projectId,
        role,
      });

      return teamProject;
    } catch (error) {
      logger.error("Failed to add project to team", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        projectId,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to add project to team");
    }
  }

  /**
   * Get team projects
   */
  async getTeamProjects(
    teamId: string,
    requestingUserId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ projects: Array<Project & { role: string }>; total: number }> {
    const { limit = 20, offset = 0 } = options;

    try {
      // Verify user has access to team
      await this.verifyTeamAccess(teamId, requestingUserId, ["admin", "member", "viewer"]);

      // Get team projects
      const database = db();
      const projectsData = await database.select({
        id: projects.id,
        ownerId: projects.ownerId,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        repoUrl: projects.repoUrl,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        deletedAt: projects.deletedAt,
        role: teamProjects.role,
      }).from(teamProjects)
        .innerJoin(projects, eq(teamProjects.projectId, projects.id))
        .where(and(eq(teamProjects.teamId, teamId), isNull(projects.deletedAt)))
        .orderBy(desc(projects.updatedAt))
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await database.select({ count: count() })
        .from(teamProjects)
        .innerJoin(projects, eq(teamProjects.projectId, projects.id))
        .where(and(eq(teamProjects.teamId, teamId), isNull(projects.deletedAt)));

      return { projects: projectsData, total };
    } catch (error) {
      logger.error("Failed to get team projects", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to get team projects");
    }
  }

  /**
   * Delete team (owner only)
   */
  async deleteTeam(teamId: string, requestingUserId: number): Promise<void> {
    try {
      const database = db();
      
      // Get team and verify ownership
      const [team] = await database.select({ ownerId: teams.ownerId }).from(teams)
        .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
        .limit(1);

      if (!team) {
        throw new NotFoundError("Team not found");
      }

      if (team.ownerId !== requestingUserId) {
        throw new AuthorizationError("Only team owners can delete teams");
      }

      // Check if team has active projects
      const [{ projectCount }] = await database.select({ projectCount: count() })
        .from(teamProjects)
        .innerJoin(projects, eq(teamProjects.projectId, projects.id))
        .where(and(eq(teamProjects.teamId, teamId), isNull(projects.deletedAt)));

      if (projectCount > 0) {
        throw new ValidationError("Cannot delete team with active projects");
      }

      // Soft delete team
      await database.transaction(async (tx: any) => {
        await tx.update(teams)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(teams.id, teamId));

        // Soft delete all team members
        await tx.update(teamMembers)
          .set({ deletedAt: new Date() })
          .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

        // Soft delete all team projects
        await tx.update(teamProjects)
          .set({ deletedAt: new Date() })
          .where(eq(teamProjects.teamId, teamId));
      });

      // Clear cache
      await teamCache.invalidate(`team:${teamId}:details`);

      logger.userAction("team_deleted", requestingUserId.toString(), {
        teamId,
      });
    } catch (error) {
      logger.error("Failed to delete team", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestingUserId,
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new DatabaseError("Failed to delete team");
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Get user's active team count
   */
  private async getUserActiveTeamCount(userId: number): Promise<number> {
    try {
      const database = db();
      const [{ count: teamCount }] = await database.select({ count: count() })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(and(
          eq(teamMembers.userId, userId),
          isNull(teamMembers.deletedAt),
          isNull(teams.deletedAt)
        ));

      return teamCount;
    } catch (error) {
      logger.error("Failed to get user team count", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return 0;
    }
  }

  /**
   * Get team member count
   */
  private async getTeamMemberCount(teamId: string): Promise<number> {
    try {
      const database = db();
      const [{ count: memberCount }] = await database.select({ count: count() })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), isNull(teamMembers.deletedAt)));

      return memberCount;
    } catch (error) {
      logger.error("Failed to get team member count", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
      });
      return 0;
    }
  }

  /**
   * Verify user has team access with specified roles
   */
  private async verifyTeamAccess(
    teamId: string,
    userId: number,
    allowedRoles: TeamRole[]
  ): Promise<TeamMember> {
    try {
      const database = db();
      const [member] = await database.select().from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          isNull(teamMembers.deletedAt)
        ))
        .limit(1);

      if (!member) {
        throw new AuthorizationError("You are not a member of this team");
      }

      if (!allowedRoles.includes(member.role as TeamRole)) {
        throw new AuthorizationError("Insufficient permissions for this action");
      }

      return member;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new AuthorizationError("Failed to verify team access");
    }
  }

  /**
   * Get maximum teams allowed for subscription tier
   */
  private getMaxTeamsForSubscription(tier: string): number {
    const limits: Record<string, number> = {
      free: 1,
      pro: 5,
      enterprise: -1, // unlimited
    };
    return limits[tier] || 1;
  }

  /**
   * Get maximum members allowed for subscription tier
   */
  private getMaxMembersForSubscription(tier: string): number {
    const limits: Record<string, number> = {
      free: 2,
      pro: 10,
      enterprise: -1, // unlimited
    };
    return limits[tier] || 2;
  }
}

export const teamService = new TeamService();