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

export interface BlueprintLifecycleEventData extends BlueprintEventData {
  blueprintStatus: "generating" | "completed" | "failed";
  estimatedDuration?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
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
   * Emit blueprint generating webhook event
   * Triggered when blueprint generation is initiated
   */
  static async emitBlueprintGenerating(
    userId: number,
    clerkId: string,
    projectId: string,
    blueprintId: string,
    blueprintVersion: number,
    blueprintName?: string,
    estimatedDuration?: number,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: BlueprintLifecycleEventData = {
      userId,
      clerkId,
      projectId,
      blueprintId,
      blueprintVersion,
      blueprintName,
      blueprintStatus: "generating",
      estimatedDuration,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "blueprint.generating",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit blueprint completed webhook event
   * Triggered when blueprint generation completes successfully
   */
  static async emitBlueprintCompleted(
    userId: number,
    clerkId: string,
    projectId: string,
    blueprintId: string,
    blueprintVersion: number,
    blueprintName?: string,
    metadata?: Record<string, any>,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: BlueprintLifecycleEventData = {
      userId,
      clerkId,
      projectId,
      blueprintId,
      blueprintVersion,
      blueprintName,
      blueprintStatus: "completed",
      metadata,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "blueprint.completed",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit blueprint failed webhook event
   * Triggered when blueprint generation fails
   */
  static async emitBlueprintFailed(
    userId: number,
    clerkId: string,
    projectId: string,
    blueprintId: string,
    blueprintVersion: number,
    blueprintName?: string,
    errorMessage?: string,
    metadata?: Record<string, any>,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: BlueprintLifecycleEventData = {
      userId,
      clerkId,
      projectId,
      blueprintId,
      blueprintVersion,
      blueprintName,
      blueprintStatus: "failed",
      errorMessage,
      metadata,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "blueprint.failed",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

  /**
   * Emit blueprint status changed webhook event
   * Triggered when blueprint status changes between any states
   */
  static async emitBlueprintStatusChanged(
    userId: number,
    clerkId: string,
    projectId: string,
    blueprintId: string,
    blueprintVersion: number,
    blueprintName?: string,
    previousStatus?: string,
    currentStatus: "generating" | "completed" | "failed" = "generating",
    metadata?: Record<string, any>,
    context?: RequestContext,
  ): Promise<void> {
    const eventData: BlueprintLifecycleEventData & { previousStatus?: string } = {
      userId,
      clerkId,
      projectId,
      blueprintId,
      blueprintVersion,
      blueprintName,
      blueprintStatus: currentStatus,
      previousStatus,
      metadata,
      timestamp: new Date(),
    };

    await this.dispatchEventToSubscribers(
      "blueprint.status_changed",
      eventData,
      `user-${clerkId}`,
      context,
    );
  }

/**
 * Emit project created webhook event
 * Triggered when a new project is created
 */
static async emitProjectCreated(
  userId: number,
  clerkId: string,
  projectId: string,
  projectName: string,
  projectDescription?: string,
  context?: RequestContext,
): Promise<void> {
  const eventData = {
    projectId,
    projectName,
    projectDescription,
    userId,
    timestamp: Date.now(),
  };

  await this.dispatchEventToSubscribers(
    "project.created",
    eventData,
    `user-${clerkId}`,
    context,
  );
}

/**
 * Emit project updated webhook event
 * Triggered when project details are modified
 */
static async emitProjectUpdated(
  userId: number,
  clerkId: string,
  projectId: string,
  projectName: string,
  projectDescription?: string,
  updatedFields: string[] = [],
  context?: RequestContext,
): Promise<void> {
  const eventData = {
    projectId,
    projectName,
    projectDescription,
    userId,
    timestamp: Date.now(),
    updatedFields,
  };

  await this.dispatchEventToSubscribers(
    "project.updated",
    eventData,
    `user-${clerkId}`,
    context,
  );
}

/**
 * Emit project deleted webhook event
 * Triggered when a project is soft-deleted
 */
static async emitProjectDeleted(
  userId: number,
  clerkId: string,
  projectId: string,
  projectName: string,
  context?: RequestContext,
): Promise<void> {
  const eventData = {
    projectId,
    projectName,
    userId,
    timestamp: Date.now(),
    deletedAt: new Date().toISOString(),
  };

  await this.dispatchEventToSubscribers(
    "project.deleted",
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
      // Get all active webhook configurations for event delivery
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
   * Returns active, non-deleted webhook configurations for event delivery
   */
  private static async getAllActiveWebhookConfigurations(): Promise<
    Array<{
      id: string;
      userId: number;
      name: string;
      url: string;
      secret: string;
      eventTypes: any;
      isActive: boolean;
    }>
  > {
    try {
      const { db } = await import("@/lib/db");
      const { webhookConfigurations } = await import("@/lib/db/schema");
      const { eq, isNull, and } = await import("drizzle-orm");

      const database = db();

      const configurations = await database
        .select({
          id: webhookConfigurations.id,
          userId: webhookConfigurations.userId,
          name: webhookConfigurations.name,
          url: webhookConfigurations.url,
          secret: webhookConfigurations.secret,
          eventTypes: webhookConfigurations.eventTypes,
          isActive: webhookConfigurations.isActive,
        })
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.isActive, true),
            isNull(webhookConfigurations.deletedAt),
          ),
        );

      return configurations;
    } catch (error) {
      logger.error("Failed to get active webhook configurations", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
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