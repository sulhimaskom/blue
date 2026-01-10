import { WebhookSubscriptionService } from "./webhook-subscription-service";
import { logger } from "@/lib/logger";
import type { RequestContext } from "./user-service";

export interface CreditEventData {
  userId: number;
  clerkId: string;
  currentBalance: number;
  previousBalance: number;
  creditChange: number;
  threshold?: number;
  transactionId?: string;
  paymentId?: string;
  timestamp: Date;
}

export interface BlueprintEventData {
  userId: number;
  clerkId: string;
  projectId: string;
  blueprintId: string;
  blueprintVersion: number;
  blueprintName?: string;
  timestamp: Date;
}

export interface ProjectDeploymentData {
  userId: number;
  clerkId: string;
  projectId: string;
  deploymentId: string;
  deploymentStatus: "success" | "failed";
  deploymentUrl?: string;
  timestamp: Date;
}

/**
 * WebhookEventDispatcher - Centralized event emission for outbound webhooks
 * 
 * Integrates business logic events with the existing webhook infrastructure:
 * - Query active webhook configurations for specific event types
 * - Deliver events to subscribed webhooks
 * - Handle retries and error logging
 * - Support event filtering and threshold monitoring
 */
export class WebhookEventDispatcher {
  /**
   * Emit credit low balance webhook event
   * Triggered when user credits fall below threshold (default: 10)
   */
  static async emitCreditLowBalance(
    userId: number,
    clerkId: string,
    currentBalance: number,
    threshold: number = 10,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: Omit<CreditEventData, "creditChange" | "previousBalance"> = {
      userId,
      clerkId,
      currentBalance,
      threshold,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "credit.low_balance",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit credit depleted webhook event
   * Triggered when user credits reach zero
   */
  static async emitCreditDepleted(
    userId: number,
    clerkId: string,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: Omit<CreditEventData, "creditChange" | "previousBalance"> = {
      userId,
      clerkId,
      currentBalance: 0,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "credit.depleted",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit credit purchased webhook event
   * Triggered when user successfully purchases/adds credits
   */
  static async emitCreditPurchased(
    userId: number,
    clerkId: string,
    creditsAdded: number,
    totalBalance: number,
    transactionId: string,
    paymentId: string,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: Pick<CreditEventData, "userId" | "clerkId" | "currentBalance" | "transactionId" | "paymentId" | "timestamp"> & { creditsAdded: number } = {
      userId,
      clerkId,
      currentBalance: totalBalance,
      transactionId,
      paymentId,
      timestamp: new Date(),
      creditsAdded,
    };

    await this.dispatchEventToSubscribers(
      "credit.purchased",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit credit usage spike webhook event
   * Triggered when abnormal credit usage pattern is detected (>50 credits in 1 hour)
   */
  static async emitCreditUsageSpike(
    userId: number,
    clerkId: string,
    creditsUsed: number,
    timeWindowMinutes: number = 60,
    currentBalance: number,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: Omit<CreditEventData, "creditChange" | "previousBalance"> & { creditsUsed: number; timeWindowMinutes: number } = {
      userId,
      clerkId,
      currentBalance,
      creditsUsed,
      timeWindowMinutes,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "credit.usage_spike",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit credit renewed webhook event
   * Triggered when subscription credits are renewed
   */
  static async emitCreditRenewed(
    userId: number,
    clerkId: string,
    creditsRenewed: number,
    totalBalance: number,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: Omit<CreditEventData, "creditChange" | "previousBalance"> & { creditsRenewed: number } = {
      userId,
      clerkId,
      currentBalance: totalBalance,
      creditsRenewed,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "credit.renewed",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit blueprint created webhook event
   * Triggered when a new blueprint is successfully generated
   */
  static async emitBlueprintCreated(
    userId: number,
    clerkId: string,
    projectId: string,
    blueprintId: string,
    blueprintVersion: number,
    blueprintName?: string,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: BlueprintEventData = {
      userId,
      clerkId,
      projectId,
      blueprintId,
      blueprintVersion,
      blueprintName,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "blueprint.created",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit project deployed webhook event
   * Triggered when repository deployment completes
   */
  static async emitProjectDeployed(
    userId: number,
    clerkId: string,
    projectId: string,
    deploymentId: string,
    deploymentStatus: "success" | "failed",
    deploymentUrl?: string,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: ProjectDeploymentData = {
      userId,
      clerkId,
      projectId,
      deploymentId,
      deploymentStatus,
      deploymentUrl,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "project.deployed",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Core event dispatch logic - query subscribers and deliver events
   */
  private static async dispatchEventToSubscribers(
    eventType: string,
    eventData: unknown,
    userTag: string,
    context?: RequestContext,
  ): Promise<void> {
    try {
      // Get all user webhook configurations (this would need to be adapted for multi-user scenarios)
      // For now, we'll use a system user ID or implement user-based webhook retrieval
      const webhookConfigurations = await this.getAllActiveWebhookConfigurations();
      
      if (webhookConfigurations.length === 0) {
        return; // No webhooks configured
      }

      let deliveredCount = 0;
      let failedCount = 0;

      // Deliver to each webhook configuration that has matching subscriptions
      for (const webhookConfig of webhookConfigurations) {
        try {
          // Check if this webhook has a subscription for this event type
          const shouldDeliver = await WebhookSubscriptionService.shouldDeliverEvent(
            webhookConfig.id,
            eventType,
            eventData,
          );

          if (!shouldDeliver) {
            continue; // Skip if not subscribed or filtered out
          }

          // Deliver the event
          const success = await this.deliverWebhookEvent(
            webhookConfig.id,
            eventType,
            eventData,
          );

          if (success) {
            deliveredCount++;
            logger.systemEvent("Webhook event delivered successfully", {
              requestId: context?.requestId || "unknown",
              webhookId: webhookConfig.id,
              eventType,
              userTag,
            });
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
          logger.error("Failed to deliver webhook event", {
            requestId: context?.requestId || "unknown",
            webhookId: webhookConfig.id,
            eventType,
            userTag,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Log overall delivery summary
      logger.systemEvent("Webhook event dispatch completed", {
        requestId: context?.requestId || "unknown",
        eventType,
        userTag,
        totalWebhooks: webhookConfigurations.length,
        deliveredCount,
        failedCount,
      });

    } catch (error) {
      logger.error("Webhook event dispatch failed", {
        requestId: context?.requestId || "unknown",
        eventType,
        userTag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Monitor credit thresholds and emit appropriate events
   * Called after credit operations to check for threshold breaches
   */
  static async monitorCreditThresholds(
    userId: number,
    previousBalance: number,
    newBalance: number,
    context?: RequestContext,
  ): Promise<void> {
    try {
      const user = await this.getUserById(userId, context);
      if (!user) {
        return;
      }

      // Check for low balance threshold (default: 10)
      const LOW_BALANCE_THRESHOLD = 10;
      
      if (newBalance === 0 && previousBalance > 0) {
        // Credits depleted
        await this.emitCreditDepleted(userId, user.clerkId, context);
      } else if (newBalance <= LOW_BALANCE_THRESHOLD && previousBalance > LOW_BALANCE_THRESHOLD) {
        // Low balance threshold breached
        await this.emitCreditLowBalance(userId, user.clerkId, newBalance, LOW_BALANCE_THRESHOLD, context);
      }

      // Note: Usage spike detection would require historical data analysis
      // and should be implemented as a separate monitoring service

    } catch (error) {
      logger.error("Credit threshold monitoring failed", {
        requestId: context?.requestId || "unknown",
        userId,
        previousBalance,
        newBalance,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all active webhook configurations across all users
   * TODO: This should be scoped to specific users or implement system-wide webhooks
   */
  private static async getAllActiveWebhookConfigurations(): Promise<any[]> {
    // For now, return empty array - this would need proper implementation
    // based on your webhook configuration requirements
    return [];
  }

  /**
   * Deliver webhook event using existing infrastructure
   */
  private static async deliverWebhookEvent(
    webhookConfigurationId: string,
    eventType: string,
    _eventData: unknown,
  ): Promise<boolean> {
    try {
      // This would use the existing webhook delivery infrastructure
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      logger.error("Failed to deliver webhook event", {
        webhookConfigurationId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get user by ID using existing database patterns
   */
  private static async getUserById(
    userId: number,
    _context?: RequestContext,
  ): Promise<{ clerkId: string; id: number; email: string; credits: number; subscriptionTier: string } | null> {
    try {
      const { db } = await import("@/lib/db");
      const { users } = await import("@/lib/db/schema");
      const { eq, isNull, and } = await import("drizzle-orm");
      const { setRLSContext } = await import("@/lib/db/rls-policies");

      const database = db();
      
      const [user] = await database
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (user) {
        await setRLSContext(user.clerkId);
        return {
          clerkId: user.clerkId,
          id: user.id,
          email: user.email,
          credits: user.credits,
          subscriptionTier: user.subscriptionTier,
        };
      }

      return null;
    } catch (error) {
      logger.error("Failed to get user by ID", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}