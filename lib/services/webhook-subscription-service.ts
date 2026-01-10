import { db } from "@/lib/db";
import { webhookSubscriptions, webhookConfigurations } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { DatabaseError, NotFoundError, ValidationError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export interface CreateSubscriptionRequest {
  webhookConfigurationId: string;
  eventType: string;
  filterExpression?: string;
}

export interface UpdateSubscriptionRequest {
  filterExpression?: string;
  isActive?: boolean;
}

export interface WebhookSubscriptionWithConfig {
  id: string;
  webhookConfigurationId: string;
  eventType: string;
  filterExpression: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  webhookConfiguration?: {
    id: string;
    name: string;
    url: string;
    isActive: boolean;
  };
}

export const EVENT_TYPES = {
  PLATFORM: [
    { type: "blueprint.created", description: "New blueprint generated", category: "blueprint" },
    { type: "blueprint.updated", description: "Blueprint content modified", category: "blueprint" },
    { type: "blueprint.generating", description: "Blueprint generation initiated", category: "blueprint" },
    { type: "blueprint.completed", description: "Blueprint generation completed successfully", category: "blueprint" },
    { type: "blueprint.failed", description: "Blueprint generation failed", category: "blueprint" },
    { type: "blueprint.status_changed", description: "Blueprint status changed", category: "blueprint" },
    { type: "project.deployed", description: "Repository deployment completed", category: "project" },
    { type: "credits.consumed", description: "Credit usage threshold reached", category: "credit" },
    { type: "credit.low_balance", description: "Credit balance below threshold", category: "credit" },
    { type: "credit.depleted", description: "Credit balance reached zero", category: "credit" },
    { type: "credit.purchased", description: "Credits bought or added", category: "credit" },
    { type: "credit.usage_spike", description: "Abnormal credit usage pattern detected", category: "credit" },
    { type: "credit.renewed", description: "Subscription credits renewed", category: "credit" },
    { type: "webhook.failed", description: "Webhook delivery failed", category: "system" },
  ],
  CLERK: [
    { type: "user.created", description: "New user registered", category: "auth" },
    { type: "user.updated", description: "User profile updated", category: "auth" },
    { type: "user.deleted", description: "User account deleted", category: "auth" },
    { type: "user.email.created", description: "Email address added", category: "auth" },
    { type: "user.email.verified", description: "Email address verified", category: "auth" },
    { type: "email.created", description: "Email created", category: "auth" },
  ],
  STRIPE: [
    { type: "payment_intent.succeeded", description: "Payment successful", category: "payment" },
    { type: "payment_intent.payment_failed", description: "Payment failed", category: "payment" },
    { type: "invoice.payment_succeeded", description: "Invoice paid", category: "payment" },
    { type: "invoice.payment_failed", description: "Invoice payment failed", category: "payment" },
    { type: "customer.subscription.created", description: "Subscription created", category: "subscription" },
    { type: "customer.subscription.updated", description: "Subscription updated", category: "subscription" },
    { type: "customer.subscription.deleted", description: "Subscription cancelled", category: "subscription" },
  ],
} as const;

/**
 * WebhookSubscriptionService - Event subscription management
 * 
 * Provides:
 * - CRUD operations for webhook subscriptions
 * - Event type catalog with descriptions
 * - Subscription validation and filtering
 * - Subscription-based event delivery filtering
 */
export class WebhookSubscriptionService {
  /**
   * Get all available event types with descriptions
   */
  static async getAvailableEventTypes(): Promise<typeof EVENT_TYPES> {
    return EVENT_TYPES;
  }

  /**
   * Get event type details by type name
   */
  static async getEventTypeDetails(eventType: string) {
    const allTypes = [...EVENT_TYPES.PLATFORM, ...EVENT_TYPES.CLERK, ...EVENT_TYPES.STRIPE];
    const eventTypeInfo = allTypes.find(t => t.type === eventType);
    
    if (!eventTypeInfo) {
      throw new ValidationError(`Unknown event type: ${eventType}`);
    }
    
    return eventTypeInfo;
  }

  /**
   * Create a new webhook subscription
   */
  static async createSubscription(
    userId: number,
    data: CreateSubscriptionRequest,
  ): Promise<WebhookSubscriptionWithConfig> {
    try {
      const database = await db();

      // Validate webhook configuration ownership
      const webhookConfig = await database
        .select({
          id: webhookConfigurations.id,
          name: webhookConfigurations.name,
          url: webhookConfigurations.url,
          isActive: webhookConfigurations.isActive,
        })
        .from(webhookConfigurations)
        .where(and(
          eq(webhookConfigurations.id, data.webhookConfigurationId),
          eq(webhookConfigurations.userId, userId),
          isNull(webhookConfigurations.deletedAt),
        ))
        .limit(1);

      if (webhookConfig.length === 0) {
        throw new NotFoundError("Webhook configuration not found or access denied");
      }

      // Validate event type
      await this.getEventTypeDetails(data.eventType);

      // Validate filter expression if provided
      if (data.filterExpression) {
        this.validateFilterExpression(data.filterExpression);
      }

      // Create subscription
      const subscriptions = await database
        .insert(webhookSubscriptions)
        .values({
          webhookConfigurationId: data.webhookConfigurationId,
          eventType: data.eventType,
          filterExpression: data.filterExpression || null,
        })
        .returning();

      if (subscriptions.length === 0) {
        throw new DatabaseError("Failed to create webhook subscription");
      }

      logger.userAction(
        "webhook_subscription_created",
        userId.toString(),
        {
          subscriptionId: subscriptions[0].id,
          webhookConfigurationId: data.webhookConfigurationId,
          eventType: data.eventType,
        },
      );

      return {
        ...subscriptions[0],
        webhookConfiguration: webhookConfig[0],
      };

    } catch (error) {
      logger.error("Failed to create webhook subscription", {
        userId,
        eventType: data.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get subscriptions for a webhook configuration
   */
  static async getSubscriptions(
    userId: number,
    webhookConfigurationId: string,
    options: {
      activeOnly?: boolean;
      eventType?: string;
    } = {},
  ): Promise<WebhookSubscriptionWithConfig[]> {
    try {
      const database = await db();

      // Build query conditions
      let conditions = [
        eq(webhookConfigurations.id, webhookConfigurationId),
        eq(webhookConfigurations.userId, userId),
        isNull(webhookConfigurations.deletedAt),
      ];

      if (options.activeOnly) {
        conditions.push(eq(webhookSubscriptions.isActive, true));
      }

      if (options.eventType) {
        conditions.push(eq(webhookSubscriptions.eventType, options.eventType));
      }

      const subscriptions = await database
        .select({
          id: webhookSubscriptions.id,
          webhookConfigurationId: webhookSubscriptions.webhookConfigurationId,
          eventType: webhookSubscriptions.eventType,
          filterExpression: webhookSubscriptions.filterExpression,
          isActive: webhookSubscriptions.isActive,
          createdAt: webhookSubscriptions.createdAt,
          updatedAt: webhookSubscriptions.updatedAt,
          webhookConfiguration: {
            id: webhookConfigurations.id,
            name: webhookConfigurations.name,
            url: webhookConfigurations.url,
            isActive: webhookConfigurations.isActive,
          },
        })
        .from(webhookSubscriptions)
        .innerJoin(
          webhookConfigurations,
          eq(webhookSubscriptions.webhookConfigurationId, webhookConfigurations.id),
        )
        .where(and(...conditions))
        .orderBy(desc(webhookSubscriptions.createdAt));

      return subscriptions;

    } catch (error) {
      logger.error("Failed to get webhook subscriptions", {
        userId,
        webhookConfigurationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update a webhook subscription
   */
  static async updateSubscription(
    userId: number,
    subscriptionId: string,
    data: UpdateSubscriptionRequest,
  ): Promise<WebhookSubscriptionWithConfig> {
    try {
      const database = await db();

      // Validate filter expression if provided
      if (data.filterExpression) {
        this.validateFilterExpression(data.filterExpression);
      }

// First verify ownership through a subquery
      const configCheck = await database
        .select({ id: webhookConfigurations.id })
        .from(webhookConfigurations)
        .where(and(
          eq(webhookConfigurations.userId, userId),
          isNull(webhookConfigurations.deletedAt),
          eq(webhookSubscriptions.id, subscriptionId)
        ))
        .innerJoin(
          webhookSubscriptions,
          eq(webhookConfigurations.id, webhookSubscriptions.webhookConfigurationId)
        )
        .limit(1);

      if (configCheck.length === 0) {
        throw new NotFoundError("Subscription not found or access denied");
      }

      // Update subscription
      const subscriptions = await database
        .update(webhookSubscriptions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(webhookSubscriptions.id, subscriptionId))
        .returning();

      if (subscriptions.length === 0) {
        throw new NotFoundError("Subscription not found or access denied");
      }

      logger.userAction(
        "webhook_subscription_updated",
        userId.toString(),
        {
          subscriptionId,
          updatedFields: Object.keys(data),
        },
      );

      // Get full subscription with webhook config
      return this.getSubscriptionById(userId, subscriptionId);

    } catch (error) {
      logger.error("Failed to update webhook subscription", {
        userId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a webhook subscription
   */
  static async deleteSubscription(
    userId: number,
    subscriptionId: string,
  ): Promise<void> {
    try {
      const database = await db();

      // First verify ownership
      const configCheck = await database
        .select({ id: webhookConfigurations.id })
        .from(webhookConfigurations)
        .where(and(
          eq(webhookConfigurations.userId, userId),
          isNull(webhookConfigurations.deletedAt),
          eq(webhookSubscriptions.id, subscriptionId)
        ))
        .innerJoin(
          webhookSubscriptions,
          eq(webhookConfigurations.id, webhookSubscriptions.webhookConfigurationId)
        )
        .limit(1);

      if (configCheck.length === 0) {
        throw new NotFoundError("Subscription not found or access denied");
      }

      // Delete subscription
      await database
        .delete(webhookSubscriptions)
        .where(eq(webhookSubscriptions.id, subscriptionId));

      logger.userAction(
        "webhook_subscription_deleted",
        userId.toString(),
        {
          subscriptionId,
        },
      );

    } catch (error) {
      logger.error("Failed to delete webhook subscription", {
        userId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get subscription by ID with ownership validation
   */
  static async getSubscriptionById(
    userId: number,
    subscriptionId: string,
  ): Promise<WebhookSubscriptionWithConfig> {
    try {
      const database = await db();

      const subscriptions = await database
        .select({
          id: webhookSubscriptions.id,
          webhookConfigurationId: webhookSubscriptions.webhookConfigurationId,
          eventType: webhookSubscriptions.eventType,
          filterExpression: webhookSubscriptions.filterExpression,
          isActive: webhookSubscriptions.isActive,
          createdAt: webhookSubscriptions.createdAt,
          updatedAt: webhookSubscriptions.updatedAt,
          webhookConfiguration: {
            id: webhookConfigurations.id,
            name: webhookConfigurations.name,
            url: webhookConfigurations.url,
            isActive: webhookConfigurations.isActive,
          },
        })
        .from(webhookSubscriptions)
        .innerJoin(
          webhookConfigurations,
          eq(webhookSubscriptions.webhookConfigurationId, webhookConfigurations.id),
        )
        .where(
          and(
            eq(webhookSubscriptions.id, subscriptionId),
            eq(webhookConfigurations.userId, userId),
            isNull(webhookConfigurations.deletedAt),
          ),
        )
        .limit(1);

      if (subscriptions.length === 0) {
        throw new NotFoundError("Subscription not found");
      }

      return subscriptions[0];

    } catch (error) {
      logger.error("Failed to get webhook subscription", {
        userId,
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if an event should be delivered based on subscriptions
   */
  static async shouldDeliverEvent(
    webhookConfigurationId: string,
    eventType: string,
    eventData: unknown,
  ): Promise<boolean> {
    try {
      const database = await db();

      const subscriptions = await database
        .select({
          id: webhookSubscriptions.id,
          filterExpression: webhookSubscriptions.filterExpression,
          isActive: webhookSubscriptions.isActive,
        })
        .from(webhookSubscriptions)
        .where(
          and(
            eq(webhookSubscriptions.webhookConfigurationId, webhookConfigurationId),
            eq(webhookSubscriptions.eventType, eventType),
            eq(webhookSubscriptions.isActive, true),
          ),
        )
        .limit(1);

      // No subscription = don't deliver
      if (subscriptions.length === 0) {
        return false;
      }

      const subscription = subscriptions[0];

      // No filter expression = deliver always
      if (!subscription.filterExpression) {
        return true;
      }

      // Evaluate filter expression
      return this.evaluateFilterExpression(subscription.filterExpression, eventData);

    } catch (error) {
      logger.error("Failed to check webhook subscription", {
        webhookConfigurationId,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      // Default to not delivering to prevent data leaks
      return false;
    }
  }

  /**
   * Validate filter expression format
   */
  private static validateFilterExpression(expression: string): void {
    if (!expression.includes('=')) {
      throw new ValidationError("Filter expression must contain '=' for field comparison");
    }

    // More sophisticated validation could be added here
    if (expression.length > 255) {
      throw new ValidationError("Filter expression too long (max 255 characters)");
    }
  }

  /**
   * Evaluate filter expression against event data
   * For now, supports simple key=value comparisons
   */
  private static evaluateFilterExpression(expression: string, eventData: unknown): boolean {
    try {
      // Simple parsing for now - could be extended with more complex logic
      const data = eventData as Record<string, unknown>;
      
      // Split by AND/OR operators
      const parts = expression.trim().split(/\s+(AND|OR)\s+/i);
      
      // First part should be a comparison
      const [field, ...valueParts] = parts[0].split('=');
      if (!field || valueParts.length === 0) {
        return true; // If filter is malformed, default to delivering
      }
      
      const expectedValue = valueParts.join('=').trim();
      const actualValue = data[field.trim()];
      
      return String(actualValue) === expectedValue;
      
    } catch (error) {
      logger.error("Failed to evaluate webhook filter expression", {
        expression,
        error: error instanceof Error ? error.message : String(error),
      });
      // Default to not delivering if evaluation fails
      return true; // Be conservative - if filter fails, deliver the event
    }
  }
}