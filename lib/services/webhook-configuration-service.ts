import { randomBytes, createHmac } from "crypto";
import { db } from "@/lib/db";
import { webhookConfigurations, webhookEvents } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type {
  WebhookConfiguration,
  WebhookEvent,
  NewWebhookConfiguration,
  NewWebhookEvent,
} from "@/lib/db/schema";
import type {
  WebhookConfigurationInput,
  WebhookTestInput,
  WebhookConfigurationUpdateInput,
  WebhookEventType,
  WebhookStatus,
} from "@/lib/schemas/webhook-schema";

export interface WebhookConfigurationWithEvents extends WebhookConfiguration {
  events: WebhookEvent[];
}

export interface WebhookTestResult {
  success: boolean;
  status: number;
  responseTime: number;
  error?: string;
}

export interface WebhookEventHistoryOptions {
  limit?: number;
  offset?: number;
  status?: WebhookStatus;
  eventType?: WebhookEventType;
  startDate?: Date;
  endDate?: Date;
}

class ServiceError extends Error {
  constructor(
    message: string,
    public _code: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }

  static databaseError(message: string) {
    return new ServiceError(message, "DATABASE_ERROR");
  }

  static notFound(message: string) {
    return new ServiceError(message, "NOT_FOUND");
  }

  static badRequest(message: string) {
    return new ServiceError(message, "BAD_REQUEST");
  }
}

export class WebhookConfigurationService {
  private static readonly DEFAULT_RETRY_COUNT = 3;
  private static readonly DEFAULT_TIMEOUT_SECONDS = 30;

  static async createConfiguration(
    userId: number,
    input: WebhookConfigurationInput,
  ): Promise<WebhookConfiguration> {
    try {
      logger.info("Creating webhook configuration", {
        userId,
        name: input.name,
      });

      const secret = this.generateSecureSecret();
      const database = db();

      const newConfiguration: NewWebhookConfiguration = {
        userId,
        name: input.name,
        url: input.url,
        secret,
        eventTypes: input.eventTypes,
        isActive: input.isActive,
        retryCount: input.retryCount,
        timeoutSeconds: input.timeoutSeconds,
      };

      const [created] = await database
        .insert(webhookConfigurations)
        .values(newConfiguration)
        .returning();

      logger.info("Webhook configuration created", {
        webhookId: created.id,
        userId,
        name: created.name,
      });

      return created;
    } catch (error) {
      logger.error("Failed to create webhook configuration", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError(
        "Failed to create webhook configuration",
      );
    }
  }

  static async getConfigurations(
    userId: number,
  ): Promise<WebhookConfiguration[]> {
    try {
      const database = db();
      const configurations = await database
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.userId, userId),
            isNull(webhookConfigurations.deletedAt),
          ),
        )
        .orderBy(desc(webhookConfigurations.createdAt));

      return configurations;
    } catch (error) {
      logger.error("Failed to get webhook configurations", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to get webhook configurations");
    }
  }

  static async getConfigurationById(
    userId: number,
    webhookId: string,
  ): Promise<WebhookConfiguration | null> {
    try {
      const database = db();
      const [configuration] = await database
        .select()
        .from(webhookConfigurations)
        .where(
          and(
            eq(webhookConfigurations.id, webhookId),
            eq(webhookConfigurations.userId, userId),
            isNull(webhookConfigurations.deletedAt),
          ),
        );

      return configuration || null;
    } catch (error) {
      logger.error("Failed to get webhook configuration", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to get webhook configuration");
    }
  }

  static async updateConfiguration(
    userId: number,
    webhookId: string,
    input: WebhookConfigurationUpdateInput,
  ): Promise<WebhookConfiguration> {
    try {
      const existing = await this.getConfigurationById(userId, webhookId);
      if (!existing) {
        throw ServiceError.notFound("Webhook configuration not found");
      }

      const updateData = {
        ...input,
        updatedAt: new Date(),
      };

      const database = db();
      const [updated] = await database
        .update(webhookConfigurations)
        .set(updateData)
        .where(eq(webhookConfigurations.id, webhookId))
        .returning();

      logger.info("Webhook configuration updated", {
        webhookId,
        userId,
        name: updated.name,
      });

      return updated;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to update webhook configuration", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError(
        "Failed to update webhook configuration",
      );
    }
  }

  static async deleteConfiguration(
    userId: number,
    webhookId: string,
  ): Promise<boolean> {
    try {
      const existing = await this.getConfigurationById(userId, webhookId);
      if (!existing) {
        throw ServiceError.notFound("Webhook configuration not found");
      }

      const database = db();
      await database
        .update(webhookConfigurations)
        .set({ deletedAt: new Date() })
        .where(eq(webhookConfigurations.id, webhookId));

      logger.info("Webhook configuration deleted", {
        webhookId,
        userId,
        name: existing.name,
      });

      return true;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to delete webhook configuration", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError(
        "Failed to delete webhook configuration",
      );
    }
  }

  static async testWebhook(
    userId: number,
    webhookId: string,
    input: WebhookTestInput,
  ): Promise<WebhookTestResult> {
    try {
      const configuration = await this.getConfigurationById(userId, webhookId);
      if (!configuration) {
        throw ServiceError.notFound("Webhook configuration not found");
      }

      const startTime = Date.now();
      const testPayload = input.payload || {
        test: true,
        eventType: input.eventType,
      };

      const response = await this.sendWebhookRequest(
        configuration.url,
        configuration.secret,
        input.eventType,
        testPayload,
        configuration.timeoutSeconds * 1000,
      );

      const responseTime = Date.now() - startTime;

      const testEvent: NewWebhookEvent = {
        webhookConfigurationId: webhookId,
        eventType: input.eventType,
        payload: testPayload,
        status: response.ok ? "success" : "failed",
        responseStatus: response.status,
        responseBody: await response.text(),
        attemptCount: 1,
        deliveredAt: response.ok ? new Date() : undefined,
      };

      const database = db();
      await database.insert(webhookEvents).values(testEvent);

      const result: WebhookTestResult = {
        success: response.ok,
        status: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };

      logger.info("Webhook test completed", {
        webhookId,
        userId,
        success: result.success,
        status: result.status,
        responseTime,
      });

      return result;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to test webhook", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to test webhook");
    }
  }

  static async getEventHistory(
    userId: number,
    webhookId: string,
    options: WebhookEventHistoryOptions = {},
  ): Promise<WebhookEvent[]> {
    try {
      const configuration = await this.getConfigurationById(userId, webhookId);
      if (!configuration) {
        throw ServiceError.notFound("Webhook configuration not found");
      }

      const database = db();

      // Build the where conditions
      const whereConditions = [
        eq(webhookEvents.webhookConfigurationId, webhookId),
      ];

      if (options.status) {
        whereConditions.push(eq(webhookEvents.status, options.status));
      }

      if (options.eventType) {
        whereConditions.push(eq(webhookEvents.eventType, options.eventType));
      }

      const events = await database
        .select()
        .from(webhookEvents)
        .where(and(...whereConditions))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      return events;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to get webhook event history", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to get webhook event history");
    }
  }

  static async retryWebhook(userId: number, eventId: string): Promise<boolean> {
    try {
      const database = db();
      const [event] = await database
        .select({
          event: webhookEvents,
          configuration: webhookConfigurations,
        })
        .from(webhookEvents)
        .innerJoin(
          webhookConfigurations,
          eq(webhookEvents.webhookConfigurationId, webhookConfigurations.id),
        )
        .where(
          and(
            eq(webhookEvents.id, eventId),
            eq(webhookConfigurations.userId, userId),
            eq(webhookEvents.status, "failed"),
          ),
        );

      if (!event) {
        throw ServiceError.notFound("Failed webhook event not found");
      }

      const { event: webhookEvent, configuration } = event;

      if (webhookEvent.attemptCount >= configuration.retryCount) {
        throw ServiceError.badRequest("Maximum retry attempts exceeded");
      }

      const response = await this.sendWebhookRequest(
        configuration.url,
        configuration.secret,
        webhookEvent.eventType,
        webhookEvent.payload,
        configuration.timeoutSeconds * 1000,
      );

      await database
        .update(webhookEvents)
        .set({
          status: response.ok ? "success" : "retrying",
          responseStatus: response.status,
          responseBody: await response.text(),
          attemptCount: webhookEvent.attemptCount + 1,
          nextRetryAt: response.ok
            ? undefined
            : this.calculateNextRetryAt(webhookEvent.attemptCount + 1),
          deliveredAt: response.ok ? new Date() : undefined,
        })
        .where(eq(webhookEvents.id, eventId));

      logger.info("Webhook retry completed", {
        eventId,
        webhookId: configuration.id,
        userId,
        success: response.ok,
        attempt: webhookEvent.attemptCount + 1,
      });

      return response.ok;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to retry webhook", {
        userId,
        eventId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to retry webhook");
    }
  }

  static async rotateSecret(
    userId: number,
    webhookId: string,
  ): Promise<string> {
    try {
      const configuration = await this.getConfigurationById(userId, webhookId);
      if (!configuration) {
        throw ServiceError.notFound("Webhook configuration not found");
      }

      const newSecret = this.generateSecureSecret();

      const database = db();
      await database
        .update(webhookConfigurations)
        .set({
          secret: newSecret,
          updatedAt: new Date(),
        })
        .where(eq(webhookConfigurations.id, webhookId));

      logger.info("Webhook secret rotated", {
        webhookId,
        userId,
        name: configuration.name,
      });

      return newSecret;
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      logger.error("Failed to rotate webhook secret", {
        userId,
        webhookId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ServiceError.databaseError("Failed to rotate webhook secret");
    }
  }

  static verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const [hashAlgorithm, signatureValue] = signature.split("=");
      if (hashAlgorithm !== "sha256") {
        return false;
      }

      const expectedSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      return timingSafeEqual(
        Buffer.from(signatureValue, "hex"),
        Buffer.from(expectedSignature, "hex"),
      );
    } catch (error) {
      logger.error("Failed to verify webhook signature", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  private static generateSecureSecret(): string {
    return randomBytes(32).toString("hex");
  }

  private static async sendWebhookRequest(
    url: string,
    secret: string,
    eventType: string,
    payload: any,
    timeout: number,
  ): Promise<Response> {
    const payloadString = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", secret).update(payloadString).digest("hex")}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Webhooks-Platform/1.0",
          "X-Webhook-Event": eventType,
          "X-Webhook-Signature": signature,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private static calculateNextRetryAt(attemptCount: number): Date {
    const exponentialBackoff = Math.pow(2, attemptCount) * 1000;
    const jitter = Math.random() * 1000;
    const nextRetryIn = exponentialBackoff + jitter;

    return new Date(Date.now() + nextRetryIn);
  }
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}
