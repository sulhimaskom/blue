import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql, isNull, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { AuthenticationError, DatabaseError, ValidationError } from "@/lib/api-utils";
import { setRLSContext } from "@/lib/db/rls-policies";
import { WebhookEventDispatcher } from "./webhook-event-dispatcher";
import { CREDIT_RULES } from "@/lib/constants";
import { NotificationService } from "./notification-service";

// Legacy type for backward compatibility - can be deprecated
export interface AuthenticatedUser {
  clerkId: string;
  id: number;
  email: string;
  credits: number;
  subscriptionTier: string;
  createdAt: Date;
  isAdmin: boolean;
  customerId?: string;
}

export interface RequestContext {
  requestId: string;
}

export interface UserCreationRequest {
  clerkId: string;
  email: string;
  requestId: string;
}

export interface UserUpdateRequest {
  clerkId: string;
  email?: string;
  requestId: string;
}

/**
 * Service layer for user authentication and database operations
 * Follows the Service Layer principle from blueprint.md:188-192
 */
export class UserService {
  /**
   * Authenticates user via Clerk and fetches database record
   * @param context Request context for logging
   * @returns Authenticated user record
   * @throws AuthenticationError if user not found or not authenticated
   * @throws DatabaseError if database operation fails
   */
  static async getAuthenticatedUser(
    context: RequestContext,
  ): Promise<AuthenticatedUser> {
    let clerkUser: { id: string } | null = null;

    try {
      // Authenticate via Clerk
      clerkUser = await currentUser();
      if (!clerkUser?.id) {
        logger.security("Authentication failed - missing user", {
          requestId: context.requestId,
        });
        throw new AuthenticationError("Authentication required");
      }

      const database = db();

      // Set RLS context for multi-tenant security
      await setRLSContext(clerkUser.id);

      // Fetch user from database
      const [userRecord] = await database
        .select()
        .from(users)
        .where(and(eq(users.clerkId, clerkUser.id), isNull(users.deletedAt)))
        .limit(1);

      if (!userRecord) {
        logger.security("Authentication failed - user not found in database", {
          requestId: context.requestId,
          clerkId: clerkUser.id,
        });
        throw new AuthenticationError("User not found");
      }

      const isAdmin = userRecord.subscriptionTier === "enterprise" || userRecord.subscriptionTier === "admin";
      const customerId = isAdmin ? userRecord.email.split("@")[0] : undefined;

      return {
        clerkId: userRecord.clerkId,
        id: userRecord.id,
        email: userRecord.email,
        credits: userRecord.credits,
        subscriptionTier: userRecord.subscriptionTier,
        createdAt: userRecord.createdAt,
        isAdmin,
        customerId,
      };
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      logger.apiError(
        "User authentication failed",
        context.requestId,
        error as Error,
        {
          clerkId: clerkUser?.id,
        },
      );

      throw new DatabaseError("Failed to authenticate user");
    }
  }

  /**
   * Updates user credits atomically
   * @param userId Database user ID
   * @param creditsChange Amount to change (positive or negative)
   * @param context Request context for logging
   * @returns Updated user record
   * @throws DatabaseError if operation fails
   */
  static async updateUserCredits(
    userId: number,
    creditsChange: number,
    context: RequestContext,
  ): Promise<AuthenticatedUser> {
    try {
      const database = db();

      // Set RLS context for multi-tenant security
      const [currentUser] = await database
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (currentUser) {
        await setRLSContext(currentUser.clerkId);
      }

      // Store previous balance for threshold monitoring
      const previousBalance = currentUser?.credits || 0;

      const [updatedUser] = await database
        .update(users)
        .set({ credits: sql`${users.credits} + ${creditsChange}` })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (!updatedUser) {
        throw new DatabaseError("Failed to update user credits");
      }

      logger.userAction("User credits updated", updatedUser.clerkId, {
        requestId: context.requestId,
        userId: updatedUser.id,
        creditsChange,
        newBalance: updatedUser.credits,
      });

      // Monitor credit thresholds and emit webhook events
      await WebhookEventDispatcher.monitorCreditThresholds(
        userId,
        previousBalance,
        updatedUser.credits,
        context,
      );

      const maxCredits = updatedUser.subscriptionTier === "pro" ? 500 : 100;
      const creditPercentage = (updatedUser.credits / maxCredits) * 100;

      if (creditPercentage <= 20 && previousBalance > updatedUser.credits) {
        await NotificationService.dispatch(
          updatedUser.clerkId,
          "credit_warning",
          "Low Credits Warning",
          `You're running low on credits (${updatedUser.credits} remaining). Consider purchasing more to continue using the platform.`,
          {
            remainingCredits: updatedUser.credits,
          },
          "/credits",
        );
      }

      const isAdmin = updatedUser.subscriptionTier === "enterprise" || updatedUser.subscriptionTier === "admin";
      const customerId = isAdmin ? updatedUser.email.split("@")[0] : undefined;

      return {
        clerkId: updatedUser.clerkId,
        id: updatedUser.id,
        email: updatedUser.email,
        credits: updatedUser.credits,
        subscriptionTier: updatedUser.subscriptionTier,
        createdAt: updatedUser.createdAt,
        isAdmin,
        customerId,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }

      logger.apiError(
        "Credit update failed",
        context.requestId,
        error as Error,
        {
          userId,
          creditsChange,
        },
      );

      throw new DatabaseError("Failed to update user credits");
    }
  }

  /**
   * Checks if user has sufficient credits
   * @param user Authenticated user
   * @param requiredCredits Credits required (default: 1)
   * @returns true if user has sufficient credits
   */
  static hasSufficientCredits(
    user: AuthenticatedUser,
    requiredCredits: number = 1,
  ): boolean {
    return user.credits >= requiredCredits;
  }

  /**
   * Updates user subscription tier if credit threshold is met
   * @param userId Database user ID
   * @param creditsAdded Credits added in current transaction
   * @param context Request context for logging
   * @throws DatabaseError if operation fails
   */
  static async updateSubscriptionTierIfNeeded(
    userId: number,
    creditsAdded: number,
    context: RequestContext,
  ): Promise<void> {
    try {
      const database = db();

      // Set RLS context for multi-tenant security
      const [currentUser] = await database
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (currentUser) {
        await setRLSContext(currentUser.clerkId);
      }

      // Upgrade to pro tier if 500+ credits total purchased in single transaction
      if (creditsAdded >= 500) {
        await database
          .update(users)
          .set({ subscriptionTier: "pro" })
          .where(and(eq(users.id, userId), isNull(users.deletedAt)));

        logger.userAction("User upgraded to Pro tier", "system", {
          requestId: context.requestId,
          userId,
          creditsAdded,
        });
      }
    } catch (error) {
      logger.apiError(
        "Subscription tier update failed",
        context.requestId,
        error as Error,
        {
          userId,
          creditsAdded,
        },
      );
      // Don't throw here - this is a non-critical operation
    }
  }

  /**
   * Create new user from webhook
   */
  static async createWebhookUser(request: UserCreationRequest): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.clerkId?.trim() || !request.email?.trim()) {
        throw new ValidationError("Clerk ID and email are required");
      }

      const database = db();

      // Check if user already exists
      const [existingUser] = await database
        .select()
        .from(users)
        .where(and(eq(users.clerkId, request.clerkId), isNull(users.deletedAt)))
        .limit(1);

      if (existingUser) {
        logger.info("User already exists", {
          requestId: request.requestId,
          clerkId: request.clerkId,
          userId: existingUser.id,
        });
        return;
      }

      // Create new user with default credits
      const [newUser] = await database
        .insert(users)
        .values({
          clerkId: request.clerkId,
          email: request.email.toLowerCase(),
          credits: CREDIT_RULES.SIGNUP_BONUS,
          subscriptionTier: "free",
        })
        .returning();

      const duration = Date.now() - startTime;
      logger.userAction("New user created via webhook", newUser.clerkId, {
        requestId: request.requestId,
        userId: newUser.id,
        email: request.email,
        creditsGiven: CREDIT_RULES.SIGNUP_BONUS,
        duration: `${duration}ms`,
        eventType: "user.created",
      });
    } catch (error) {
      logger.error("Failed to create user from webhook", {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        clerkId: request.clerkId,
        email: request.email,
      });

      if (
        error instanceof ValidationError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      throw new DatabaseError("Failed to create user");
    }
  }

  /**
   * Delete user from webhook
   */
  static async deleteWebhookUser(clerkId: string, requestId: string): Promise<void> {
    try {
      if (!clerkId?.trim()) {
        throw new ValidationError("Clerk ID is required");
      }

      const database = db();

      // Soft delete user (mark as deleted)
      const result = await database
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.clerkId, clerkId));

if (result.rowCount === 0) {
        logger.info("User not found for deletion", {
          requestId,
          clerkId,
        });
        return;
      }
      // Clear user cache
      // Note: We don't have the user ID here, but the cache key pattern uses user ID
      // This is a limitation we should address in a future refactor

      logger.systemEvent("User deleted via webhook", {
        requestId,
        clerkId,
        eventType: "user.deleted",
      });
    } catch (error) {
      logger.error("Failed to delete user from webhook", {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        clerkId,
      });

      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError("Failed to delete user");
    }
  }

  /**
   * Update user email from webhook
   */
  static async updateWebhookUser(request: UserUpdateRequest): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.clerkId?.trim()) {
        throw new ValidationError("Clerk ID is required");
      }

      if (!request.email?.trim()) {
        throw new ValidationError("Email is required");
      }

      const database = db();

      // Update user email
      const result = await database
        .update(users)
        .set({ email: request.email.toLowerCase() })
        .where(eq(users.clerkId, request.clerkId));

      if (result.rowCount === 0) {
        logger.info("User not found for email update", {
          requestId: request.requestId,
          clerkId: request.clerkId,
        });
        return;
      }

      const duration = Date.now() - startTime;
      logger.userAction("User email updated via webhook", request.clerkId, {
        requestId: request.requestId,
        clerkId: request.clerkId,
        newEmail: request.email,
        duration: `${duration}ms`,
        eventType: "user.updated",
      });
    } catch (error) {
      logger.error("Failed to update user from webhook", {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        clerkId: request.clerkId,
        newEmail: request.email,
      });

      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError("Failed to update user");
    }
  }
}
