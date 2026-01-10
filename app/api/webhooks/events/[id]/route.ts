import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookSubscriptionService } from "@/lib/services/webhook-subscription-service";
import { webhookSubscriptionCreateSchema } from "@/lib/schemas/webhook-schema";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError } from "@/lib/api-utils";

// GET /api/webhooks/[id]/events - List available event types with descriptions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      // Verify webhook configuration ownership
      const subscriptions = await WebhookSubscriptionService.getSubscriptions(user.id, id, {
        activeOnly: false,
      });

      if (subscriptions.length === 0) {
        logger.security(
          "Unauthorized attempt to access webhook events",
          {
            userId: user.id,
            webhookId: id,
          },
        );
        throw new NotFoundError("Webhook configuration not found");
      }

      // Get available event types
      const eventTypes = await WebhookSubscriptionService.getAvailableEventTypes();

      return {
        data: {
          eventTypes,
          currentSubscriptions: subscriptions.map(sub => ({
            id: sub.id,
            eventType: sub.eventType,
            filterExpression: sub.filterExpression,
            isActive: sub.isActive,
            createdAt: sub.createdAt,
          })),
        },
        message: "Event types and current subscriptions retrieved successfully",
      };
    },
  })(req);
}

// POST /api/webhooks/[id]/events - Create subscription to specific event types
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    requireCredits: 0, // Subscriptions are part of webhook management
    schema: webhookSubscriptionCreateSchema,
    handler: async ({ data: validatedData, user }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      const subscriptionData = validatedData as z.infer<typeof webhookSubscriptionCreateSchema>;
      
      // Override the webhook configuration ID from the URL parameter
      const createData = {
        ...subscriptionData,
        webhookConfigurationId: id,
      };

      const subscription = await WebhookSubscriptionService.createSubscription(
        user.id,
        createData,
      );

      return {
        success: true,
        data: {
          id: subscription.id,
          webhookConfigurationId: subscription.webhookConfigurationId,
          eventType: subscription.eventType,
          filterExpression: subscription.filterExpression,
          isActive: subscription.isActive,
          createdAt: subscription.createdAt,
          webhookConfiguration: subscription.webhookConfiguration,
        },
        message: "Webhook subscription created successfully",
      };
    },
  })(req);
}