import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookConfigurationUpdateSchema } from "@/lib/schemas/webhook-schema";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: webhookConfigurationUpdateSchema,
    handler: async ({ validatedData, user }: any) => {
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }: any) => {
      const userId = user.id;

      await WebhookConfigurationService.deleteConfiguration(userId, id);

      return {
        success: true,
        data: { id },
        message: "Webhook configuration deleted successfully",
      };
    },
  })(req);
}
