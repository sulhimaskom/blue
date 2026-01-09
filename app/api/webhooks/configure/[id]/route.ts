import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookConfigurationUpdateSchema } from "@/lib/schemas/webhook-schema";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/webhooks/configure/[id] - Get specific webhook configuration
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      const config = await WebhookConfigurationService.getConfigurationById(
        user.id,
        id,
      );

      if (!config) {
        throw new NotFoundError("Webhook configuration not found");
      }

      return { data: config };
    },
  })(req);
}

// PUT /api/webhooks/configure/[id] - Update webhook configuration
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: webhookConfigurationUpdateSchema,
    handler: async ({ data: validatedData, user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      const userId = user.id;
      const updateData = validatedData as z.infer<
        typeof webhookConfigurationUpdateSchema
      >;

      const configuration =
        await WebhookConfigurationService.updateConfiguration(
          userId,
          id,
          updateData,
        );

      logger.userAction(
        "webhook_configuration_updated_via_api",
        userId.toString(),
        {
          configId: id,
          changedFields: Object.keys(updateData),
        },
      );

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
          updatedAt: configuration.updatedAt,
        },
        message: "Webhook configuration updated successfully",
      };
    },
  })(req);
}

// DELETE /api/webhooks/configure/[id] - Delete webhook configuration
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createDELETEHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      // Verify ownership before deletion
      const existingConfig =
        await WebhookConfigurationService.getConfigurationById(user.id, id);
      if (!existingConfig) {
        throw new NotFoundError("Webhook configuration not found");
      }

      await WebhookConfigurationService.deleteConfiguration(user.id, id);

      logger.userAction(
        "webhook_configuration_deleted_via_api",
        user.id.toString(),
        {
          configId: id,
          configName: existingConfig.name,
        },
      );

      return {
        success: true,
        data: { id },
        message: "Webhook configuration deleted successfully",
      };
    },
  })(req);
}
