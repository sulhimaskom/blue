import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql, isNull, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { AuthenticationError, DatabaseError } from "@/lib/api-utils";
import { setRLSContext } from "@/lib/db/rls-policies";
import { WebhookEventDispatcher } from "./webhook-event-dispatcher";

// Legacy type for backward compatibility - can be deprecated
export interface AuthenticatedUser {
  clerkId: string;
  id: number;
  email: string;
  credits: number;
  subscriptionTier: string;
  createdAt: Date;
}

export interface RequestContext {
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

      return {
        clerkId: userRecord.clerkId,
        id: userRecord.id,
        email: userRecord.email,
        credits: userRecord.credits,
        subscriptionTier: userRecord.subscriptionTier,
        createdAt: userRecord.createdAt,
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

      return {
        clerkId: updatedUser.clerkId,
        id: updatedUser.id,
        email: updatedUser.email,
        credits: updatedUser.credits,
        subscriptionTier: updatedUser.subscriptionTier,
        createdAt: updatedUser.createdAt,
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
}
