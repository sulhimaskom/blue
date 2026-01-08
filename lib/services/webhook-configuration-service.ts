/**
 * Webhook Configuration Service
 *
 * Manages webhook endpoint configurations for enterprise customers.
 * Follows Service Layer architecture principles.
 */

import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  webhookConfigurations,
  webhookEvents,
  type WebhookConfiguration,
  type NewWebhookConfiguration,
  type WebhookEvent,
} from "@/lib/db/schema";
import { ValidationError, DatabaseError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { IdGenerators } from "@/lib/utils/id-generator";
import crypto from "crypto";

export interface CreateWebhookConfigRequest {
  name: string;
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookConfigRequest {
  name?: string;
  url?: string;
  events?: string[];
  description?: string;
  active?: boolean;
}

export interface WebhookTestResult {
  success: boolean;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  latency: number;
}

export interface WebhookEventWithConfig extends WebhookEvent {
  config: {
    name: string;
    url: string;
    serviceName: string;
  };
}

/**
 * Centralized webhook configuration management
 */
export class WebhookConfigurationService {
  /**
   * Create a new webhook configuration
   */
  static async createConfiguration(
    userId: number,
    data: CreateWebhookConfigRequest,
  ): Promise<WebhookConfiguration> {
    try {
      // Validate URL format
      const urlValidation = this.validateWebhookUrl(data.url);
      if (!urlValidation.isValid) {
        throw new ValidationError(urlValidation.error || "Invalid URL");
      }

      // Validate events
      const validEvents = this.getValidEventTypes();
      const invalidEvents = data.events.filter(
        (event) => !validEvents.includes(event),
      );
      if (invalidEvents.length > 0) {
        throw new ValidationError(
          `Invalid event types: ${invalidEvents.join(", ")}`,
        );
      }

      // Generate secure secret
      const secret = crypto.randomBytes(32).toString("hex");

      const configData: NewWebhookConfiguration = {
        userId,
        name: data.name,
        url: data.url,
        secret,
        events: data.events,
        description: data.description || null,
        active: true,
      };

      const database = db();
      const [config] = await database
        .insert(webhookConfigurations)
        .values(configData)
        .returning();

      logger.userAction("webhook_configuration_created", userId.toString(), {
        configId: config.id,
        eventName: config.name,
        eventCount: data.events.length,
      });

      return config;
    } catch (error) {
      logger.apiError(
        "createConfiguration failed",
        IdGenerators.REQUEST(),
        error as Error,
        { userId, configName: data.name },
      );
      throw error;
    }
  }

  /**
   * Get all webhook configurations for a user
   */
  static async getConfigurations(
    userId: number,
  ): Promise<WebhookConfiguration[]> {
    try {
      const database = db();
      return await database
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.userId, userId),
            isNull(webhookConfigurations.deletedAt),
          ),
        )
        .orderBy(desc(webhookConfigurations.createdAt));
    } catch (error) {
      logger.apiError(
        "getConfigurations failed",
        IdGenerators.REQUEST(),
        error as Error,
        { userId },
      );
      throw new DatabaseError("Failed to retrieve webhook configurations");
    }
  }

  /**
   * Get a specific webhook configuration
   */
  static async getConfigurationById(
    id: string,
    userId: number,
  ): Promise<WebhookConfiguration | null> {
    try {
      const database = db();
      const [config] = await database
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.id, id),
            eq(webhookConfigurations.userId, userId),
            isNull(webhookConfigurations.deletedAt),
          ),
        );

      return config || null;
    } catch (error) {
      logger.apiError(
        "getConfigurationById failed",
        IdGenerators.REQUEST(),
        error as Error,
        { id, userId },
      );
      throw new DatabaseError("Failed to retrieve webhook configuration");
    }
  }

  /**
   * Update webhook configuration
   */
  static async updateConfiguration(
    id: string,
    userId: number,
    data: UpdateWebhookConfigRequest,
  ): Promise<WebhookConfiguration> {
    try {
      // Validate configuration exists and belongs to user
      const existingConfig = await this.getConfigurationById(id, userId);
      if (!existingConfig) {
        throw new ValidationError("Webhook configuration not found");
      }

      // Validate URL if provided
      if (data.url) {
        const urlValidation = this.validateWebhookUrl(data.url);
        if (!urlValidation.isValid) {
          throw new ValidationError(urlValidation.error || "Invalid URL");
        }
      }

      // Validate events if provided
      if (data.events) {
        const validEvents = this.getValidEventTypes();
        const invalidEvents = data.events.filter(
          (event) => !validEvents.includes(event),
        );
        if (invalidEvents.length > 0) {
          throw new ValidationError(
            `Invalid event types: ${invalidEvents.join(", ")}`,
          );
        }
      }

      const database = db();
      const [updatedConfig] = await database
        .update(webhookConfigurations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(webhookConfigurations.id, id))
        .returning();

      logger.userAction("webhook_configuration_updated", userId.toString(), {
        configId: id,
        changedFields: Object.keys(data),
      });

      return updatedConfig;
    } catch (error) {
      logger.apiError(
        "updateConfiguration failed",
        IdGenerators.REQUEST(),
        error as Error,
        { id, userId },
      );
      throw error;
    }
  }

  /**
   * Delete webhook configuration (soft delete)
   */
  static async deleteConfiguration(id: string, userId: number): Promise<void> {
    try {
      // Validate configuration exists and belongs to user
      const existingConfig = await this.getConfigurationById(id, userId);
      if (!existingConfig) {
        throw new ValidationError("Webhook configuration not found");
      }

      const database = db();
      await database
        .update(webhookConfigurations)
        .set({ deletedAt: new Date() })
        .where(eq(webhookConfigurations.id, id));

      logger.userAction("webhook_configuration_deleted", userId.toString(), {
        configId: id,
        configName: existingConfig.name,
      });
    } catch (error) {
      logger.apiError(
        "deleteConfiguration failed",
        IdGenerators.REQUEST(),
        error as Error,
        { id, userId },
      );
      throw error;
    }
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(
    id: string,
    userId: number,
    eventType?: string,
  ): Promise<WebhookTestResult> {
    try {
      const config = await this.getConfigurationById(id, userId);
      if (!config) {
        throw new ValidationError("Webhook configuration not found");
      }

      const testEventType = eventType || config.events[0] || "test.event";
      const testPayload = this.generateTestPayload(testEventType);

      const startTime = Date.now();

      try {
        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Architect-Platform-Webhook/1.0",
            "X-Webhook-Event": testEventType,
            "X-Webhook-Signature": this.generateSignature(
              JSON.stringify(testPayload),
              config.secret,
            ),
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        const latency = Date.now() - startTime;
        const responseBody = await response.text();

        // Log test event
        await this.logWebhookEvent(config.id, testEventType, testPayload, {
          status: response.ok ? "success" : "failed",
          responseStatus: response.status,
          responseBody,
          attemptCount: 1,
          deliveredAt: response.ok ? new Date() : null,
          failedAt: response.ok ? null : new Date(),
        });

        return {
          success: response.ok,
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 500), // Limit response size
          latency,
        };
      } catch (fetchError) {
        const latency = Date.now() - startTime;

        // Log failed test
        await this.logWebhookEvent(config.id, testEventType, testPayload, {
          status: "failed",
          attemptCount: 1,
          failedAt: new Date(),
        });

        return {
          success: false,
          error:
            fetchError instanceof Error ? fetchError.message : "Unknown error",
          latency,
        };
      }
    } catch (error) {
      logger.apiError(
        "testWebhook failed",
        IdGenerators.REQUEST(),
        error as Error,
        { id, userId },
      );
      throw error;
    }
  }

  /**
   * Get webhook event history
   */
  static async getEventHistory(
    userId: number,
    configId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<WebhookEventWithConfig[]> {
    try {
      const database = db();
      const whereConditions = [
        eq(webhookConfigurations.userId, userId),
        isNull(webhookConfigurations.deletedAt),
      ];

      if (configId) {
        whereConditions.push(eq(webhookEvents.configId, configId));
      }

      const results = await database
        .select({
          id: webhookEvents.id,
          configId: webhookEvents.configId,
          eventType: webhookEvents.eventType,
          payload: webhookEvents.payload,
          responseStatus: webhookEvents.responseStatus,
          responseBody: webhookEvents.responseBody,
          attemptCount: webhookEvents.attemptCount,
          status: webhookEvents.status,
          deliveredAt: webhookEvents.deliveredAt,
          failedAt: webhookEvents.failedAt,
          lastRetryAt: webhookEvents.lastRetryAt,
          createdAt: webhookEvents.createdAt,
          config: {
            name: webhookConfigurations.name,
            url: webhookConfigurations.url,
          },
        })
        .from(webhookEvents)
        .innerJoin(
          webhookConfigurations,
          eq(webhookEvents.configId, webhookConfigurations.id),
        )
        .where(and(...whereConditions))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(limit)
        .offset(offset);

      return results.map((result: any) => ({
        ...result,
        config: {
          ...result.config,
          serviceName: "Custom", // All webhook configs are custom for now
        },
      }));
    } catch (error) {
      logger.apiError(
        "getEventHistory failed",
        IdGenerators.REQUEST(),
        error as Error,
        { userId, configId },
      );
      throw new DatabaseError("Failed to retrieve event history");
    }
  }

  /**
   * Rotate webhook secret
   */
  static async rotateSecret(
    id: string,
    userId: number,
  ): Promise<{ secret: string }> {
    try {
      const config = await this.getConfigurationById(id, userId);
      if (!config) {
        throw new ValidationError("Webhook configuration not found");
      }

      const newSecret = crypto.randomBytes(32).toString("hex");

      const database = db();
      await database
        .update(webhookConfigurations)
        .set({
          secret: newSecret,
          updatedAt: new Date(),
        })
        .where(eq(webhookConfigurations.id, id));

      logger.security("webhook_secret_rotated", {
        configId: id,
        userId,
        timestamp: new Date().toISOString(),
      });

      return { secret: newSecret };
    } catch (error) {
      logger.apiError(
        "rotateSecret failed",
        IdGenerators.REQUEST(),
        error as Error,
        { id, userId },
      );
      throw error;
    }
  }

  /**
   * Retry failed webhook event
   */
  static async retryWebhook(
    eventId: string,
    userId: number,
  ): Promise<WebhookTestResult> {
    try {
      // Get the event with configuration
      const database = db();
      const [eventResult] = await database
        .select({
          event: webhookEvents,
          config: webhookConfigurations,
        })
        .from(webhookEvents)
        .innerJoin(
          webhookConfigurations,
          eq(webhookEvents.configId, webhookConfigurations.id),
        )
        .where(
          and(
            eq(webhookEvents.id, eventId),
            eq(webhookConfigurations.userId, userId),
            eq(webhookEvents.status, "failed"),
          ),
        );

      if (!eventResult) {
        throw new ValidationError("Failed webhook event not found");
      }

      const { event, config } = eventResult;

      // Update event to retrying
      await database
        .update(webhookEvents)
        .set({
          status: "retrying",
          attemptCount: event.attemptCount + 1,
          lastRetryAt: new Date(),
        })
        .where(eq(webhookEvents.id, eventId));

      const startTime = Date.now();

      try {
        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Architect-Platform-Webhook/1.0",
            "X-Webhook-Event": event.eventType,
            "X-Webhook-Retry": event.attemptCount.toString(),
            "X-Webhook-Signature": this.generateSignature(
              JSON.stringify(event.payload),
              config.secret,
            ),
          },
          body: JSON.stringify(event.payload),
          signal: AbortSignal.timeout(10000),
        });

        const latency = Date.now() - startTime;
        const responseBody = await response.text();

        // Update event with result
        await database
          .update(webhookEvents)
          .set({
            status: response.ok ? "success" : "failed",
            responseStatus: response.status,
            responseBody: responseBody.slice(0, 500),
            deliveredAt: response.ok ? new Date() : null,
            failedAt: response.ok ? null : new Date(),
          })
          .where(eq(webhookEvents.id, eventId));

        return {
          success: response.ok,
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 500),
          latency,
        };
      } catch (fetchError) {
        const latency = Date.now() - startTime;

        await database
          .update(webhookEvents)
          .set({
            status: "failed",
            failedAt: new Date(),
          })
          .where(eq(webhookEvents.id, eventId));

        return {
          success: false,
          error:
            fetchError instanceof Error ? fetchError.message : "Unknown error",
          latency,
        };
      }
    } catch (error) {
      logger.apiError(
        "retryWebhook failed",
        IdGenerators.REQUEST(),
        error as Error,
        { eventId, userId },
      );
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private static validateWebhookUrl(url: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return { isValid: false, error: "URL must use HTTP or HTTPS protocol" };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Invalid URL format" };
    }
  }

  private static getValidEventTypes(): string[] {
    return [
      // Stripe events
      "payment_intent.succeeded",
      "payment_intent.failed",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "checkout.session.completed",
      // Clerk events
      "user.created",
      "user.updated",
      "user.deleted",
      "email.created",
      "email.updated",
      "email.deleted",
      // Custom events
      "test.event",
      "blueprint.generated",
      "project.created",
      "payment.processed",
    ];
  }

  private static generateTestPayload(
    eventType: string,
  ): Record<string, unknown> {
    return {
      id: IdGenerators.REQUEST(),
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: { test: true, message: "Test webhook payload" },
      },
      test: true,
    };
  }

  private static generateSignature(payload: string, secret: string): string {
    return `sha256=${crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;
  }

  private static async logWebhookEvent(
    configId: string,
    eventType: string,
    payload: Record<string, unknown>,
    status: {
      status: string;
      responseStatus?: number;
      responseBody?: string;
      attemptCount: number;
      deliveredAt?: Date | null;
      failedAt?: Date | null;
    },
  ): Promise<void> {
    try {
      const database = db();
      await database.insert(webhookEvents).values({
        configId,
        eventType,
        payload: payload as any,
        responseStatus: status.responseStatus || null,
        responseBody: status.responseBody || null,
        attemptCount: status.attemptCount,
        status: status.status,
        deliveredAt: status.deliveredAt || null,
        failedAt: status.failedAt || null,
      });
    } catch (error) {
      logger.apiError(
        "Failed to log webhook event",
        IdGenerators.REQUEST(),
        error as Error,
        { configId, eventType },
      );
    }
  }
}
