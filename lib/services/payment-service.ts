import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { ServiceError } from "@/lib/services/service-error-handler";
import { 
  ValidationError, 
  DatabaseError 
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { CREDIT_RULES } from "@/lib/constants";
import { teamCache } from "@/lib/services/cache-orchestrator";

export interface PaymentProcessRequest {
  userId: string;
  paymentIntentId: string;
  amount: number;
  creditsToAdd: number;
  requestId: string;
}

export interface UserAccountUpdate {
  credits: number;
  subscriptionTier?: string;
}

/**
 * Service for handling payment processing and user account updates
 */
export class PaymentService {
  private CACHE_TTL = 300; // 5 minutes

  /**
   * Process payment and update user account
   */
  async processPayment(request: PaymentProcessRequest): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.userId?.trim() || !request.paymentIntentId?.trim()) {
        throw new ValidationError("User ID and payment intent ID are required");
      }

      if (request.amount <= 0 || request.creditsToAdd <= 0) {
        throw new ValidationError("Amount and credits must be positive");
      }

      const database = db();

      // Find user by clerk ID
      const [userRecord] = await database
        .select()
        .from(users)
        .where(and(eq(users.clerkId, request.userId), isNull(users.deletedAt)))
        .limit(1);

      if (!userRecord) {
        logger.error("User not found for payment processing", {
          requestId: request.requestId,
          userId: request.userId,
          paymentIntent: request.paymentIntentId,
        });
        return; // Skip this webhook processing
      }

      // Check if this payment was already processed
      const existingTransaction = await database
        .select()
        .from(transactions)
        .where(eq(transactions.stripePaymentId, request.paymentIntentId))
        .limit(1);

      if (existingTransaction.length > 0) {
        logger.info("Payment already processed", {
          requestId: request.requestId,
          paymentIntent: request.paymentIntentId,
          transactionId: existingTransaction[0].id,
        });
        return;
      }

      // Calculate new credits and subscription tier
      const accountUpdate = this.calculateAccountUpdate(userRecord, request.creditsToAdd);

      // Update user account and create transaction record
      await database.transaction(async (tx: any) => {
        // Update user credits and subscription tier
        await tx
          .update(users)
          .set(accountUpdate)
          .where(and(eq(users.id, userRecord.id), isNull(users.deletedAt)));

        // Create transaction record
        await tx.insert(transactions).values({
          userId: userRecord.id,
          amount: request.amount,
          creditsAdded: request.creditsToAdd,
          stripePaymentId: request.paymentIntentId,
        });
      });

      // Clear user cache
      await teamCache.invalidate(`user:${userRecord.id}:teams`);

      const duration = Date.now() - startTime;
      logger.userAction("Payment processed via webhook", request.userId, {
        requestId: request.requestId,
        paymentIntent: request.paymentIntentId,
        amount: request.amount / 100,
        creditsAdded: request.creditsToAdd,
        newCredits: accountUpdate.credits,
        subscriptionTier: accountUpdate.subscriptionTier,
        duration: `${duration}ms`,
        eventType: "payment_intent.succeeded",
      });
    } catch (error) {
      logger.error("Failed to process payment", {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        userId: request.userId,
        paymentIntent: request.paymentIntentId,
      });

      if (
        error instanceof ServiceError ||
        error instanceof ValidationError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }

      throw new DatabaseError("Failed to process payment");
    }
  }

  /**
   * Calculate user account update based on credits added
   */
  private calculateAccountUpdate(
    userRecord: any,
    creditsToAdd: number
  ): UserAccountUpdate {
    const newCredits = userRecord.credits + creditsToAdd;
    
    // Update subscription tier based on credit threshold
    const newSubscriptionTier = 
      newCredits >= CREDIT_RULES.PRO_THRESHOLD
        ? "pro"
        : userRecord.subscriptionTier;

    return {
      credits: newCredits,
      subscriptionTier: newSubscriptionTier,
    };
  }
}

export const paymentService = new PaymentService();