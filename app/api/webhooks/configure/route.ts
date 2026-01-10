import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookConfigurationSchema } from "@/lib/schemas/webhook-schema";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/api-utils";

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  requireCredits: 10,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  schema: webhookConfigurationSchema,
  handler: async ({ data: validatedData, user }) => {
    if (!user) {
      throw new AuthenticationError("Authentication required");
    }

    const userId = user.id;
    const {
      name,
      url,
      secret,
      eventTypes,
      isActive,
      retryCount,
      timeoutSeconds,
    } = validatedData as z.infer<typeof webhookConfigurationSchema>;

    const configuration = await WebhookConfigurationService.createConfiguration(
      userId,
      {
        name,
        url,
        secret,
        eventTypes,
        isActive,
        retryCount,
        timeoutSeconds,
      },
    );

    logger.userAction("created_webhook_configuration", userId.toString(), {
      webhookId: configuration.id,
      name: configuration.name,
    });

    return {
      success: true,
      data: {
        id: configuration.id,
        name: configuration.name,
        url: configuration.url,
        eventTypes: configuration.eventTypes,
        isActive: configuration.isActive,
        retryCount: configuration.retryCount,
        timeoutSeconds: configuration.timeoutSeconds,
        createdAt: configuration.createdAt,
      },
      message: "Webhook configuration created successfully",
    };
  },
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ user }) => {
    if (!user) {
      throw new AuthenticationError("Authentication required");
    }

    const configurations = await WebhookConfigurationService.getConfigurations(
      user.id,
    );

    const safeConfigurations = configurations.map((config) => ({
      id: config.id,
      name: config.name,
      url: config.url,
      eventTypes: config.eventTypes,
      isActive: config.isActive,
      retryCount: config.retryCount,
      timeoutSeconds: config.timeoutSeconds,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    return {
      success: true,
      data: safeConfigurations,
      message: "Webhook configurations retrieved successfully",
    };
  },
});
