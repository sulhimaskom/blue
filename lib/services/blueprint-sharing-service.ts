import { db } from "@/lib/db";
import { blueprintShares, blueprintShareAuditLogs, blueprints, users, teams, teamMembers, projects, userSettings } from "@/lib/db/schema";
import { eq, and, desc, isNull, count } from "drizzle-orm";
import { ValidationError, DatabaseError, NotFoundError, AuthorizationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { emailService } from "@/lib/services/email-service";
import { NotificationService } from "@/lib/services/notification-service";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { env } from "@/lib/env";

export type BlueprintPermission = "view" | "edit" | "fork" | "admin";

export interface ShareBlueprintInput {
  blueprintId: string;
  sharedBy: number;
  emails?: string[];
  teamIds?: string[];
  permission: BlueprintPermission;
  expiresInDays?: number;
}

export interface SharedBlueprint {
  id: string;
  blueprintId: string;
  sharedBy: number;
  sharedWithUser: number | null;
  sharedWithTeam: string | null;
  permission: BlueprintPermission;
  expiresAt: Date | null;
  viewCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  recipientEmail?: string;
  teamName?: string;
}

export interface ShareResult {
  shares: SharedBlueprint[];
  sharedWithCount: number;
  message: string;
}

export interface GetBlueprintSharesInput {
  blueprintId: string;
  userId: number;
  page?: number;
  limit?: number;
}

export interface PaginatedBlueprintShares {
  shares: SharedBlueprint[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ShareStats {
  totalShares: number;
  totalViews: number;
  uniqueRecipients: number;
  sharesByPermission: {
    view: number;
    edit: number;
    fork: number;
    admin: number;
  };
}

/**
 * Service layer for blueprint sharing management
 * Follows Service Layer principle from blueprint.md:188-192
 */
export class BlueprintSharingService {
  /**
   * Share a blueprint with users and/or teams
   * @param input Share blueprint parameters
   * @returns Share result with created shares
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if blueprint not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async shareBlueprint(
    input: ShareBlueprintInput,
  ): Promise<ShareResult> {
    try {
      const database = db();

      // Verify user exists
      const [sharer] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, input.sharedBy),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!sharer) {
        throw new ValidationError("User not found");
      }

      // Verify blueprint exists and user owns it
      const [blueprint] = await database
        .select({
          id: blueprints.id,
          projectId: blueprints.projectId,
        })
        .from(blueprints)
        .where(eq(blueprints.id, input.blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      // Get project owner
      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== input.sharedBy) {
        throw new AuthorizationError("You don't have permission to share this blueprint");
      }

      // Validate input
      if (!input.emails && !input.teamIds) {
        throw new ValidationError("At least one email or team ID must be provided");
      }

      if (input.emails && input.emails.length === 0) {
        throw new ValidationError("Emails array cannot be empty");
      }

      if (input.teamIds && input.teamIds.length === 0) {
        throw new ValidationError("Team IDs array cannot be empty");
      }

      const shares: typeof blueprintShares.$inferInsert[] = [];
      const expirationDate = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Share with users by email
      if (input.emails && input.emails.length > 0) {
        for (const email of input.emails) {
          const [recipient] = await database
            .select()
            .from(users)
            .where(
              and(
                eq(users.email, email),
                isNull(users.deletedAt),
              ),
            )
            .limit(1);

          if (recipient) {
            // Create share for existing user
            shares.push({
              blueprintId: input.blueprintId,
              sharedBy: input.sharedBy,
              sharedWithUser: recipient.id,
              sharedWithTeam: null,
              permission: input.permission,
              expiresAt: expirationDate,
            });
          }
          // Note: Non-registered users will receive email invitation (future enhancement)
        }
      }

      // Share with teams
      if (input.teamIds && input.teamIds.length > 0) {
        for (const teamId of input.teamIds) {
          const [team] = await database
            .select()
            .from(teams)
            .where(
              and(
                eq(teams.id, teamId),
                isNull(teams.deletedAt),
              ),
            )
            .limit(1);

          if (!team) {
            throw new ValidationError(`Team ${teamId} not found`);
          }

          shares.push({
            blueprintId: input.blueprintId,
            sharedBy: input.sharedBy,
            sharedWithUser: null,
            sharedWithTeam: teamId,
            permission: input.permission,
            expiresAt: expirationDate,
          });
        }
      }

      // Insert all shares
      if (shares.length > 0) {
        await database.insert(blueprintShares).values(shares);
      }

      logger.userAction("Blueprint shared", sharer.clerkId, {
        blueprintId: input.blueprintId,
        sharesCreated: shares.length,
        permission: input.permission,
        expiresAt: expirationDate,
      });

      // Send email notifications to recipients
      await this.sendEmailNotifications({
        blueprintId: input.blueprintId,
        sharer,
        shares,
        permission: input.permission,
        expirationDate,
      });

      // Create in-app notifications for recipients
      await this.createInAppNotifications({
        blueprintId: input.blueprintId,
        sharer,
        shares,
        permission: input.permission,
        expirationDate,
      });

      // Record activity feed for blueprint sharing
      try {
        await ActivityFeedService.recordActivity({
          userId: input.sharedBy,
          clerkId: sharer.clerkId,
          entityType: "blueprint",
          entityId: input.blueprintId,
          eventType: "blueprint.shared",
          eventData: {
            sharedWithCount: shares.length,
            permission: input.permission,
            expiresAt: expirationDate?.toISOString(),
          },
        });
      } catch (activityError) {
        logger.error("Failed to record blueprint.shared activity", {
          blueprintId: input.blueprintId,
          error: activityError instanceof Error ? activityError.message : String(activityError),
        });
      }

      // Fetch created shares with details
      const sharedBlueprints = await this.getSharesByBlueprintId(input.blueprintId);

      return {
        shares: sharedBlueprints,
        sharedWithCount: shares.length,
        message: `Blueprint shared with ${shares.length} recipient(s)`,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to share blueprint", {
        blueprintId: input.blueprintId,
        userId: input.sharedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to share blueprint");
    }
  }

  /**
   * Get all shares for a blueprint
   * @param input Get blueprint shares parameters
   * @returns Paginated blueprint shares
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if blueprint not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async getBlueprintShares(
    input: GetBlueprintSharesInput,
  ): Promise<PaginatedBlueprintShares> {
    try {
      const database = db();

      // Verify blueprint exists and user owns it
      const [blueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, input.blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      // Get project owner
      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== input.userId) {
        throw new AuthorizationError("You don't have permission to view shares for this blueprint");
      }

      const page = input.page || 1;
      const limit = input.limit || 20;
      const offset = (page - 1) * limit;

      // Get total count
      const [totalResult] = await database
        .select({ count: count() })
        .from(blueprintShares)
        .where(eq(blueprintShares.blueprintId, input.blueprintId));

      const total = totalResult?.count || 0;

      // Get shares with details
      const shares = await database
        .select({
          id: blueprintShares.id,
          blueprintId: blueprintShares.blueprintId,
          sharedBy: blueprintShares.sharedBy,
          sharedWithUser: blueprintShares.sharedWithUser,
          sharedWithTeam: blueprintShares.sharedWithTeam,
          permission: blueprintShares.permission,
          expiresAt: blueprintShares.expiresAt,
          viewCount: blueprintShares.viewCount,
          lastViewedAt: blueprintShares.lastViewedAt,
          createdAt: blueprintShares.createdAt,
          updatedAt: blueprintShares.updatedAt,
          recipientEmail: users.email,
          teamName: teams.name,
        })
        .from(blueprintShares)
        .leftJoin(users, eq(blueprintShares.sharedWithUser, users.id))
        .leftJoin(teams, eq(blueprintShares.sharedWithTeam, teams.id))
        .where(eq(blueprintShares.blueprintId, input.blueprintId))
        .orderBy(desc(blueprintShares.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        shares: shares as SharedBlueprint[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to get blueprint shares", {
        blueprintId: input.blueprintId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to get blueprint shares");
    }
  }

  /**
   * Revoke a blueprint share
   * @param shareId Share ID to revoke
   * @param userId User ID performing the revocation
   * @returns Success message
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if share not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async revokeShare(
    shareId: string,
    userId: number,
  ): Promise<{ message: string }> {
    try {
      const database = db();

      // Get share details
      const [share] = await database
        .select()
        .from(blueprintShares)
        .where(eq(blueprintShares.id, shareId))
        .limit(1);

      if (!share) {
        throw new NotFoundError("Share not found");
      }

      // Verify user owns the blueprint
      const [blueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, share.blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== userId) {
        throw new AuthorizationError("You don't have permission to revoke this share");
      }

      // Get user details for activity feed
      const [user] = await database
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      // Delete share
      await database
        .delete(blueprintShares)
        .where(eq(blueprintShares.id, shareId));

      logger.userAction("Blueprint share revoked", user.clerkId, {
        shareId,
        blueprintId: share.blueprintId,
      });

      // Record activity feed for blueprint share revocation
      try {
        await ActivityFeedService.recordActivity({
          userId,
          clerkId: user.clerkId,
          entityType: "blueprint",
          entityId: share.blueprintId,
          eventType: "blueprint.share_revoked",
          eventData: {
            shareId,
            revokedAt: new Date().toISOString(),
          },
        });
      } catch (activityError) {
        logger.error("Failed to record blueprint.share_revoked activity", {
          shareId,
          blueprintId: share.blueprintId,
          error: activityError instanceof Error ? activityError.message : String(activityError),
        });
      }

      return { message: "Share revoked successfully" };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to revoke blueprint share", {
        shareId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to revoke blueprint share");
    }
  }

  /**
   * Get share statistics for a blueprint
   * @param blueprintId Blueprint ID
   * @param userId User ID requesting stats
   * @returns Share statistics
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if blueprint not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async getShareStats(
    blueprintId: string,
    userId: number,
  ): Promise<ShareStats> {
    try {
      const database = db();

      // Verify user owns the blueprint
      const [blueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== userId) {
        throw new AuthorizationError("You don't have permission to view stats for this blueprint");
      }

      // Get all shares for the blueprint
      const shares = await database
        .select()
        .from(blueprintShares)
        .where(eq(blueprintShares.blueprintId, blueprintId));

      const totalShares = shares.length;
      const totalViews = shares.reduce((sum, share) => sum + share.viewCount, 0);
      const uniqueRecipients = new Set(
        shares.map(share => share.sharedWithUser || share.sharedWithTeam),
      ).size;

      const sharesByPermission = {
        view: shares.filter(s => s.permission === "view").length,
        edit: shares.filter(s => s.permission === "edit").length,
        fork: shares.filter(s => s.permission === "fork").length,
        admin: shares.filter(s => s.permission === "admin").length,
      };

      return {
        totalShares,
        totalViews,
        uniqueRecipients,
        sharesByPermission,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to get blueprint share stats", {
        blueprintId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to get blueprint share stats");
    }
  }

  /**
   * Track a blueprint view
   * @param shareId Share ID to track view for
   * @param userId User ID viewing the blueprint
   * @returns Success message
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if share not found
   * @throws DatabaseError if operation fails
   */
  static async trackView(
    shareId: string,
    userId: number,
  ): Promise<{ message: string }> {
    try {
      const database = db();

      // Get share details
      const [share] = await database
        .select()
        .from(blueprintShares)
        .where(eq(blueprintShares.id, shareId))
        .limit(1);

      if (!share) {
        throw new NotFoundError("Share not found");
      }

      // Check if user has access (either shared directly or through team)
      if (share.sharedWithUser !== userId) {
        // Check if user is in the team
        if (share.sharedWithTeam) {
          const [teamMember] = await database
            .select()
            .from(teamMembers)
            .where(
              and(
                eq(teamMembers.teamId, share.sharedWithTeam),
                eq(teamMembers.userId, userId),
                isNull(teamMembers.deletedAt),
              ),
            )
            .limit(1);

          if (!teamMember) {
            throw new AuthorizationError("You don't have permission to view this blueprint");
          }
        } else {
          throw new AuthorizationError("You don't have permission to view this blueprint");
        }
      }

      // Update view count and last viewed timestamp
      await database
        .update(blueprintShares)
        .set({
          viewCount: share.viewCount + 1,
          lastViewedAt: new Date(),
        })
        .where(eq(blueprintShares.id, shareId));

      logger.userAction("Shared blueprint viewed", String(userId), {
        shareId,
        blueprintId: share.blueprintId,
      });

      return { message: "View tracked successfully" };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to track blueprint view", {
        shareId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to track blueprint view");
    }
  }

  /**
   * Update a blueprint share's permission level
   * @param shareId Share ID to update
   * @param userId User ID performing the update
   * @param newPermission New permission level
   * @returns Success message
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if share not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async updateSharePermission(
    shareId: string,
    userId: number,
    newPermission: BlueprintPermission,
  ): Promise<{ message: string; share: SharedBlueprint }> {
    try {
      const database = db();

      // Validate permission
      if (!["view", "edit", "fork", "admin"].includes(newPermission)) {
        throw new ValidationError("Invalid permission level");
      }

      // Get share details
      const [share] = await database
        .select()
        .from(blueprintShares)
        .where(eq(blueprintShares.id, shareId))
        .limit(1);

      if (!share) {
        throw new NotFoundError("Share not found");
      }

      // Verify user owns the blueprint
      const [blueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, share.blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== userId) {
        throw new AuthorizationError("You don't have permission to update this share");
      }

      // Update share permission
      await database
        .update(blueprintShares)
        .set({
          permission: newPermission,
          updatedAt: new Date(),
        })
        .where(eq(blueprintShares.id, shareId));

      logger.userAction("Blueprint share permission updated", String(userId), {
        shareId,
        blueprintId: share.blueprintId,
        newPermission,
      });

      // Record activity feed for permission update
      try {
        const [user] = await database
          .select()
          .from(users)
          .where(and(eq(users.id, userId), isNull(users.deletedAt)))
          .limit(1);

        if (user) {
          await ActivityFeedService.recordActivity({
            userId,
            clerkId: user.clerkId,
            entityType: "blueprint",
            entityId: share.blueprintId,
            eventType: "blueprint.share_permission_updated",
            eventData: {
              shareId,
              previousPermission: share.permission,
              newPermission,
            },
          });
        }
      } catch (activityError) {
        logger.error("Failed to record blueprint.share_permission_updated activity", {
          shareId,
          blueprintId: share.blueprintId,
          error: activityError instanceof Error ? activityError.message : String(activityError),
        });
      }

      // Fetch updated share with details
      const [updatedShare] = await database
        .select({
          id: blueprintShares.id,
          blueprintId: blueprintShares.blueprintId,
          sharedBy: blueprintShares.sharedBy,
          sharedWithUser: blueprintShares.sharedWithUser,
          sharedWithTeam: blueprintShares.sharedWithTeam,
          permission: blueprintShares.permission,
          expiresAt: blueprintShares.expiresAt,
          viewCount: blueprintShares.viewCount,
          lastViewedAt: blueprintShares.lastViewedAt,
          createdAt: blueprintShares.createdAt,
          updatedAt: blueprintShares.updatedAt,
          recipientEmail: users.email,
          teamName: teams.name,
        })
        .from(blueprintShares)
        .leftJoin(users, eq(blueprintShares.sharedWithUser, users.id))
        .leftJoin(teams, eq(blueprintShares.sharedWithTeam, teams.id))
        .where(eq(blueprintShares.id, shareId))
        .limit(1);

      return {
        message: "Share permission updated successfully",
        share: updatedShare as SharedBlueprint,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to update blueprint share permission", {
        shareId,
        userId,
        newPermission,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to update blueprint share permission");
    }
  }

  /**
   * Get audit logs for blueprint shares
   * @param blueprintId Blueprint ID
   * @param userId User ID requesting logs
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated audit logs
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if blueprint not found
   * @throws AuthorizationError if user doesn't own the blueprint
   * @throws DatabaseError if operation fails
   */
  static async getShareAuditLogs(
    blueprintId: string,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    logs: Array<{
      id: string;
      blueprintId: string;
      shareId: string;
      userId: number;
      action: string;
      permissionLevel: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      metadata: unknown;
      createdAt: Date;
      userEmail?: string;
      userName?: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const database = db();

      // Verify user owns the blueprint
      const [blueprint] = await database
        .select()
        .from(blueprints)
        .where(eq(blueprints.id, blueprintId))
        .limit(1);

      if (!blueprint) {
        throw new NotFoundError("Blueprint not found");
      }

      const [project] = await database
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, blueprint.projectId))
        .limit(1);

      if (!project || project.ownerId !== userId) {
        throw new AuthorizationError("You don't have permission to view audit logs for this blueprint");
      }

      const offset = (page - 1) * limit;

      // Get total count
      const [totalResult] = await database
        .select({ count: count() })
        .from(blueprintShareAuditLogs)
        .where(eq(blueprintShareAuditLogs.blueprintId, blueprintId));

      const total = totalResult?.count || 0;

      // Get audit logs with user details
      const logs = await database
        .select({
          id: blueprintShareAuditLogs.id,
          blueprintId: blueprintShareAuditLogs.blueprintId,
          shareId: blueprintShareAuditLogs.shareId,
          userId: blueprintShareAuditLogs.userId,
          action: blueprintShareAuditLogs.action,
          permissionLevel: blueprintShareAuditLogs.permissionLevel,
          ipAddress: blueprintShareAuditLogs.ipAddress,
          userAgent: blueprintShareAuditLogs.userAgent,
          metadata: blueprintShareAuditLogs.metadata,
          createdAt: blueprintShareAuditLogs.createdAt,
          userEmail: users.email,
          userName: users.clerkId,
        })
        .from(blueprintShareAuditLogs)
        .leftJoin(users, eq(blueprintShareAuditLogs.userId, users.id))
        .where(eq(blueprintShareAuditLogs.blueprintId, blueprintId))
        .orderBy(desc(blueprintShareAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        logs: logs as Array<{
          id: string;
          blueprintId: string;
          shareId: string;
          userId: number;
          action: string;
          permissionLevel: string | null;
          ipAddress: string | null;
          userAgent: string | null;
          metadata: unknown;
          createdAt: Date;
          userEmail?: string;
          userName?: string;
        }>,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      logger.error("Failed to get blueprint share audit logs", {
        blueprintId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to get blueprint share audit logs");
    }
  }

  /**
   * Helper method to get shares by blueprint ID
   * @param blueprintId Blueprint ID
   * @returns Array of shared blueprints
   * @throws DatabaseError if operation fails
   */
  private static async getSharesByBlueprintId(
    blueprintId: string,
  ): Promise<SharedBlueprint[]> {
    try {
      const database = db();

      const shares = await database
        .select({
          id: blueprintShares.id,
          blueprintId: blueprintShares.blueprintId,
          sharedBy: blueprintShares.sharedBy,
          sharedWithUser: blueprintShares.sharedWithUser,
          sharedWithTeam: blueprintShares.sharedWithTeam,
          permission: blueprintShares.permission,
          expiresAt: blueprintShares.expiresAt,
          viewCount: blueprintShares.viewCount,
          lastViewedAt: blueprintShares.lastViewedAt,
          createdAt: blueprintShares.createdAt,
          updatedAt: blueprintShares.updatedAt,
          recipientEmail: users.email,
          teamName: teams.name,
        })
        .from(blueprintShares)
        .leftJoin(users, eq(blueprintShares.sharedWithUser, users.id))
        .leftJoin(teams, eq(blueprintShares.sharedWithTeam, teams.id))
        .where(eq(blueprintShares.blueprintId, blueprintId));

      return shares as SharedBlueprint[];
    } catch (error) {
      logger.error("Failed to get shares by blueprint ID", {
        blueprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError("Failed to get blueprint shares");
    }
  }

  /**
   * Send email notifications to blueprint share recipients
   * @param params Email notification parameters
   */
  private static async sendEmailNotifications(params: {
    blueprintId: string;
    sharer: typeof users.$inferSelect;
    shares: typeof blueprintShares.$inferInsert[];
    permission: BlueprintPermission;
    expirationDate: Date | null;
  }): Promise<void> {
    try {
      const database = db();

      if (!emailService.isConfigured()) {
        logger.info("Email service not configured, skipping email notifications");
        return;
      }

      const [blueprint] = await database
        .select({
          id: blueprints.id,
          projectName: projects.name,
          projectDescription: projects.description,
        })
        .from(blueprints)
        .leftJoin(projects, eq(blueprints.projectId, projects.id))
        .where(eq(blueprints.id, params.blueprintId))
        .limit(1);

      if (!blueprint) {
        logger.warn("Blueprint not found for email notification", {
          blueprintId: params.blueprintId,
        });
        return;
      }

      const blueprintName = blueprint.projectName ?? "Untitled Blueprint";
      const blueprintDescription = blueprint.projectDescription;

      const recipientEmails: Array<{ email: string; recipientName?: string }> = [];
      const teamMemberEmails: Array<{ email: string; recipientName?: string }> = [];

      for (const share of params.shares) {
        if (share.sharedWithUser) {
          const [user] = await database
            .select({
              email: users.email,
              id: users.id,
            })
            .from(users)
            .where(and(eq(users.id, share.sharedWithUser), isNull(users.deletedAt)))
            .limit(1);

          if (user) {
            const [settings] = await database
              .select({
                notificationPreferences: userSettings.notificationPreferences,
              })
              .from(userSettings)
              .where(and(eq(userSettings.userId, user.id), isNull(userSettings.deletedAt)))
              .limit(1);

            const prefs = settings?.notificationPreferences as { projectShares?: boolean } | undefined;
            if (prefs?.projectShares !== false) {
              recipientEmails.push({
                email: user.email,
                recipientName: undefined,
              });
            }
          }
        } else if (share.sharedWithTeam) {
          const [team] = await database
            .select({
              name: teams.name,
            })
            .from(teams)
            .where(and(eq(teams.id, share.sharedWithTeam), isNull(teams.deletedAt)))
            .limit(1);

          if (team) {
            const members = await database
              .select({
                email: users.email,
                userId: users.id,
              })
              .from(teamMembers)
              .leftJoin(users, eq(teamMembers.userId, users.id))
              .where(and(eq(teamMembers.teamId, share.sharedWithTeam), isNull(teamMembers.deletedAt)));

            for (const member of members) {
              if (member.email) {
                const [settings] = await database
                  .select({
                    notificationPreferences: userSettings.notificationPreferences,
                  })
                  .from(userSettings)
                  .where(and(eq(userSettings.userId, member.userId!), isNull(userSettings.deletedAt)))
                  .limit(1);

                const prefs = settings?.notificationPreferences as { projectShares?: boolean } | undefined;
                if (prefs?.projectShares !== false) {
                  teamMemberEmails.push({
                    email: member.email,
                    recipientName: undefined,
                  });
                }
              }
            }
          }
        }
      }

      const allRecipients = [...recipientEmails, ...teamMemberEmails];
      const uniqueRecipients = Array.from(new Map(allRecipients.map(r => [r.email, r])).values());

      if (uniqueRecipients.length === 0) {
        logger.info("No email recipients found or all opted out", {
          blueprintId: params.blueprintId,
        });
        return;
      }

      const blueprintUrl = `${env.NEXT_PUBLIC_APP_URL}/blueprints/${params.blueprintId}`;
      const expirationText = params.expirationDate
        ? params.expirationDate.toLocaleDateString()
        : undefined;

      const result = await emailService.sendBatchEmails({
        emails: uniqueRecipients.map(recipient => ({
          to: recipient.email,
          subject: `${params.sharer.email} shared a blueprint with you`,
          html: emailService.renderBlueprintSharedTemplate({
            appName: env.NEXT_PUBLIC_APP_NAME || "Architect Platform",
            recipientName: recipient.recipientName,
            sharerName: params.sharer.email,
            blueprintName: blueprintName,
            blueprintDescription: blueprintDescription ?? undefined,
            permission: params.permission,
            blueprintLink: blueprintUrl,
            expirationDate: expirationText,
          }),
        })),
      });

      logger.info("Email notifications sent", {
        blueprintId: params.blueprintId,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      });
    } catch (error) {
      logger.error("Failed to send email notifications", {
        blueprintId: params.blueprintId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create in-app notifications for blueprint share recipients
   * @param params In-app notification parameters
   */
  private static async createInAppNotifications(params: {
    blueprintId: string;
    sharer: typeof users.$inferSelect;
    shares: typeof blueprintShares.$inferInsert[];
    permission: BlueprintPermission;
    expirationDate: Date | null;
  }): Promise<void> {
    try {
      const database = db();

      const [blueprint] = await database
        .select({
          id: blueprints.id,
          projectName: projects.name,
        })
        .from(blueprints)
        .leftJoin(projects, eq(blueprints.projectId, projects.id))
        .where(eq(blueprints.id, params.blueprintId))
        .limit(1);

      if (!blueprint) {
        logger.warn("Blueprint not found for in-app notification", {
          blueprintId: params.blueprintId,
        });
        return;
      }

      const blueprintName = blueprint.projectName ?? "Untitled Blueprint";
      const blueprintUrl = `${env.NEXT_PUBLIC_APP_URL}/blueprints/${params.blueprintId}`;

      const uniqueRecipientClerkIds = new Set<string>();

      for (const share of params.shares) {
        if (share.sharedWithUser) {
          const [user] = await database
            .select({ clerkId: users.clerkId })
            .from(users)
            .where(and(eq(users.id, share.sharedWithUser), isNull(users.deletedAt)))
            .limit(1);

          if (user) {
            uniqueRecipientClerkIds.add(user.clerkId);
          }
        } else if (share.sharedWithTeam) {
          const teamMembersList = await database
            .select({ clerkId: users.clerkId })
            .from(teamMembers)
            .leftJoin(users, eq(teamMembers.userId, users.id))
            .where(and(eq(teamMembers.teamId, share.sharedWithTeam), isNull(teamMembers.deletedAt)));

          for (const member of teamMembersList) {
            if (member.clerkId) {
              uniqueRecipientClerkIds.add(member.clerkId);
            }
          }
        }
      }

      if (uniqueRecipientClerkIds.size === 0) {
        logger.info("No in-app notification recipients found", {
          blueprintId: params.blueprintId,
        });
        return;
      }

      const expirationText = params.expirationDate
        ? params.expirationDate.toLocaleDateString()
        : undefined;

      for (const clerkId of uniqueRecipientClerkIds) {
        let message = `${params.sharer.email} shared "${blueprintName}" with you. You have ${params.permission} access.`;
        if (expirationText) {
          message += ` This share expires on ${expirationText}.`;
        }

        await NotificationService.dispatch(
          clerkId,
          "blueprint_shared",
          `${params.sharer.email} shared a blueprint with you`,
          message,
          {
            blueprintId: params.blueprintId,
            sharerName: params.sharer.email,
          },
          blueprintUrl,
        );
      }

      logger.info("In-app notifications created", {
        blueprintId: params.blueprintId,
        notificationCount: uniqueRecipientClerkIds.size,
      });
    } catch (error) {
      logger.error("Failed to create in-app notifications", {
        blueprintId: params.blueprintId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
