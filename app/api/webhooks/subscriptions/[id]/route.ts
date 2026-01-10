import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookSubscriptionService } from "@/lib/services/webhook-subscription-service";
import { webhookSubscriptionUpdateSchema } from "@/lib/schemas/webhook-schema";

import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/webhooks/subscriptions/[id] - Get specific subscription details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      const subscription = await WebhookSubscriptionService.getSubscriptionById(
        user.id,
        id,
      );

      return {
        data: subscription,
        message: "Subscription details retrieved successfully",
      };
    },
  })(req);
}

// PUT /api/webhooks/subscriptions/[id] - Update subscription filters
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: webhookSubscriptionUpdateSchema,
    handler: async ({ data: validatedData, user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      const updateData = validatedData as z.infer<typeof webhookSubscriptionUpdateSchema>;

      const subscription = await WebhookSubscriptionService.updateSubscription(
        user.id,
        id,
        updateData,
      );

      return {
        success: true,
        data: subscription,
        message: "Subscription updated successfully",
      };
    },
  })(req);
}

// DELETE /api/webhooks/subscriptions/[id] - Remove subscription
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createDELETEHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      // Get subscription details for logging
      const subscription = await WebhookSubscriptionService.getSubscriptionById(
        user.id,
        id,
      );

      await WebhookSubscriptionService.deleteSubscription(user.id, id);

      return {
        success: true,
        data: {
          id,
          eventType: subscription.eventType,
          webhookConfigurationId: subscription.webhookConfigurationId,
        },
        message: "Subscription deleted successfully",
      };
    },
  })(req);
}