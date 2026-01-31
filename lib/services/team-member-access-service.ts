import { eq, and, count, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers, teams } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  AuthorizationError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from "@/lib/api-utils";
import { ServiceError } from "@/lib/services/service-error-handler";
import type { TeamMember } from "@/lib/db/schema";
import type { TeamRole } from "./team-service";

/**
 * Service for team member access verification and team/user counting
 * Handles access control, member counting, and team membership queries
 */
export class TeamMemberAccessService {
  private static instance: TeamMemberAccessService;

  private constructor() {}

  static getInstance(): TeamMemberAccessService {
    if (!TeamMemberAccessService.instance) {
      TeamMemberAccessService.instance = new TeamMemberAccessService();
    }
    return TeamMemberAccessService.instance;
  }

  /**
   * Verify user has team access with specified roles
   */
  async verifyTeamAccess(
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
      if (
        error instanceof ServiceError ||
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof NotFoundError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      throw new DatabaseError("Failed to verify team access");
    }
  }

  /**
   * Get user's active team count (excluding deleted teams)
   */
  async getUserActiveTeamCount(userId: number): Promise<number> {
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
  async getTeamMemberCount(teamId: string): Promise<number> {
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
   * Check if user is team member
   */
  async isTeamMember(teamId: string, userId: number): Promise<boolean> {
    try {
      const member = await this.verifyTeamAccess(teamId, userId, ["admin", "member", "viewer"]);
      return !!member;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get user's role in team
   */
  async getUserTeamRole(teamId: string, userId: number): Promise<TeamRole | null> {
    try {
      const member = await this.verifyTeamAccess(teamId, userId, ["admin", "member", "viewer"]);
      return member.role as TeamRole;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Check if user is team admin
   */
  async isTeamAdmin(teamId: string, userId: number): Promise<boolean> {
    try {
      await this.verifyTeamAccess(teamId, userId, ["admin"]);
      return true;
    } catch (_error) {
      return false;
    }
  }
}

export const teamMemberAccessService = TeamMemberAccessService.getInstance();
