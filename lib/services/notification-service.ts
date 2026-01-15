import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, desc, isNull, count } from "drizzle-orm";
import { ValidationError, DatabaseError, NotFoundError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export type NotificationType =
  | "blueprint_complete"
  | "team_invitation"
  | "deployment_status"
  | "credit_warning"
  | "blueprint_shared"
  | "team_member_role_changed"
  | "team_member_removed"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "team_deleted";

export interface NotificationMetadata {
  blueprintId?: string;
  projectId?: string;
  deploymentId?: string;
  teamId?: string;
  duration?: number;
  environment?: string;
  status?: string;
  remainingCredits?: number;
  sharerName?: string;
  inviterName?: string;
  teamName?: string;
  previousRole?: string;
  newRole?: string;
  role?: string;
  updatedBy?: string;
  removedBy?: string;
  deletedBy?: string;
  projectName?: string;
  projectDescription?: string;
  updatedFields?: string[];
  description?: string;
}

export interface CreateNotificationInput {
  clerkId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  link?: string;
}

export interface GetNotificationsInput {
  clerkId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface PaginatedNotifications {
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata: NotificationMetadata | null;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

/**
 * Service layer for notification management
 * Follows the Service Layer principle from blueprint.md:188-192
 */
export class NotificationService {
  /**
   * Create a new notification for a user
   * @param input Notification creation parameters
   * @returns Created notification
   * @throws ValidationError if input is invalid
   * @throws DatabaseError if operation fails
   */
  static async createNotification(
    input: CreateNotificationInput,
  ): Promise<typeof notifications.$inferSelect> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.clerkId, input.clerkId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      const [notification] = await database
        .insert(notifications)
        .values({
          userId: user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          metadata: input.metadata || null,
          link: input.link || null,
        })
        .returning();

      logger.userAction("Notification created", input.clerkId, {
        notificationId: notification.id,
        type: input.type,
      });

      return notification;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Failed to create notification", {
        error: error instanceof Error ? error.message : String(error),
        clerkId: input.clerkId,
        type: input.type,
      });

      throw new DatabaseError("Failed to create notification");
    }
  }

  /**
   * Get paginated notifications for a user
   * @param input Notification query parameters
   * @returns Paginated notifications with unread count
   * @throws ValidationError if input is invalid
   * @throws DatabaseError if operation fails
   */
  static async getNotifications(
    input: GetNotificationsInput,
  ): Promise<PaginatedNotifications> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.clerkId, input.clerkId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      const page = input.page || 1;
      const limit = input.limit || 20;
      const offset = (page - 1) * limit;

      const conditions = [
        eq(notifications.userId, user.id),
      ];

      if (input.unreadOnly) {
        conditions.push(isNull(notifications.readAt));
      }

      if (input.type) {
        conditions.push(eq(notifications.type, input.type));
      }

      const [totalCountResult] = await database
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions));

      const [unreadCountResult] = await database
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            isNull(notifications.readAt),
          ),
        );

      const userNotifications = await database
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(totalCountResult.count / limit);

      return {
        notifications: userNotifications.map((n) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          metadata: n.metadata as NotificationMetadata | null,
          link: n.link,
          readAt: n.readAt,
          createdAt: n.createdAt,
        })),
        pagination: {
          total: totalCountResult.count,
          page,
          limit,
          totalPages,
          unreadCount: unreadCountResult.count,
        },
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Failed to get notifications", {
        error: error instanceof Error ? error.message : String(error),
        clerkId: input.clerkId,
      });

      throw new DatabaseError("Failed to get notifications");
    }
  }

  /**
   * Mark a notification as read
   * @param clerkId User's Clerk ID
   * @param notificationId Notification ID to mark as read
   * @returns Updated notification and unread count
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if notification not found
   * @throws DatabaseError if operation fails
   */
  static async markAsRead(
    clerkId: string,
    notificationId: string,
  ): Promise<{
    notification: typeof notifications.$inferSelect;
    unreadCount: number;
  }> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.clerkId, clerkId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      const [notification] = await database
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id),
          ),
        )
        .limit(1);

      if (!notification) {
        throw new NotFoundError("Notification not found");
      }

      const [updatedNotification] = await database
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, notificationId))
        .returning();

      const [unreadCountResult] = await database
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            isNull(notifications.readAt),
          ),
        );

      logger.userAction("Notification marked as read", clerkId, {
        notificationId,
      });

      return {
        notification: updatedNotification,
        unreadCount: unreadCountResult.count,
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }

      logger.error("Failed to mark notification as read", {
        error: error instanceof Error ? error.message : String(error),
        clerkId,
        notificationId,
      });

      throw new DatabaseError("Failed to mark notification as read");
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param clerkId User's Clerk ID
   * @returns Number of notifications marked as read
   * @throws ValidationError if user not found
   * @throws DatabaseError if operation fails
   */
  static async markAllAsRead(
    clerkId: string,
  ): Promise<{ markedCount: number }> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.clerkId, clerkId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      const result = await database
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, user.id),
            isNull(notifications.readAt),
          ),
        );

      const markedCount = result.rowCount || 0;

      logger.userAction("All notifications marked as read", clerkId, {
        markedCount,
      });

      return { markedCount };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Failed to mark all notifications as read", {
        error: error instanceof Error ? error.message : String(error),
        clerkId,
      });

      throw new DatabaseError("Failed to mark all notifications as read");
    }
  }

  /**
   * Get unread count for a user
   * @param clerkId User's Clerk ID
   * @returns Number of unread notifications
   * @throws ValidationError if user not found
   * @throws DatabaseError if operation fails
   */
  static async getUnreadCount(
    clerkId: string,
  ): Promise<{ unreadCount: number }> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(
          and(
            eq(users.clerkId, clerkId),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      if (!user) {
        throw new ValidationError("User not found");
      }

      const [unreadCountResult] = await database
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            isNull(notifications.readAt),
          ),
        );

      return { unreadCount: unreadCountResult.count };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Failed to get unread count", {
        error: error instanceof Error ? error.message : String(error),
        clerkId,
      });

      throw new DatabaseError("Failed to get unread count");
    }
  }

  /**
   * Dispatch a notification (helper method for easy notification creation)
   * @param clerkId User's Clerk ID
   * @param type Notification type
   * @param title Notification title
   * @param message Notification message
   * @param metadata Optional metadata
   * @param link Optional link
   */
  static async dispatch(
    clerkId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata,
    link?: string,
  ): Promise<typeof notifications.$inferSelect> {
    return this.createNotification({
      clerkId,
      type,
      title,
      message,
      metadata,
      link,
    });
  }
}