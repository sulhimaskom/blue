import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, NotFoundError } from "@/lib/api-utils";
import type { NextRequest } from "next/server";

const updateWebhookConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  url: z.string().url("Invalid URL format").optional(),
  events: z
    .array(z.string())
    .min(1, "At least one event is required")
    .optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

// GET /api/webhooks/configure/[id] - Get specific webhook configuration
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      if (!user) {
        throw new ValidationError("Authentication required");
      }

      const { id } = await params;

      const config = await WebhookConfigurationService.getConfigurationById(
        id,
        user.id,
      );

      if (!config) {
        throw new NotFoundError("Webhook configuration not found");
      }

      return { data: config };
    },
  })(req);
}

// PUT /api/webhooks/configure/[id] - Update webhook configuration
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    schema: updateWebhookConfigSchema,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user, data }) => {
      if (!user) {
        throw new ValidationError("Authentication required");
      }

      const { id } = await params;

      if (!data) {
        throw new ValidationError("Request data is required");
      }

      // Verify ownership before update
      const existingConfig =
        await WebhookConfigurationService.getConfigurationById(id, user.id);
      if (!existingConfig) {
        throw new NotFoundError("Webhook configuration not found");
      }

      const config = await WebhookConfigurationService.updateConfiguration(
        id,
        user.id,
        data,
      );

      logger.userAction(
        "webhook_configuration_updated_via_api",
        user.id.toString(),
        {
          configId: id,
          changedFields: Object.keys(data),
        },
      );

      return {
        data: config,
        message: "Webhook configuration updated successfully",
      };
    },
  })(req);
}

// DELETE /api/webhooks/configure/[id] - Delete webhook configuration
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user }) => {
      if (!user) {
        throw new ValidationError("Authentication required");
      }

      const { id } = await params;

      // Verify ownership before deletion
      const existingConfig =
        await WebhookConfigurationService.getConfigurationById(id, user.id);
      if (!existingConfig) {
        throw new NotFoundError("Webhook configuration not found");
      }

      await WebhookConfigurationService.deleteConfiguration(id, user.id);

      logger.userAction(
        "webhook_configuration_deleted_via_api",
        user.id.toString(),
        {
          configId: id,
          configName: existingConfig.name,
        },
      );

      return {
        message: "Webhook configuration deleted successfully",
      };
    },
  })(req);
}
