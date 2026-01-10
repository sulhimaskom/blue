import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookSubscriptionService } from "@/lib/services/webhook-subscription-service";

import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError, ValidationError } from "@/lib/api-utils";

// GET /api/webhooks/subscriptions - List all user subscriptions with filtering
export async function GET(req: NextRequest) {
  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user, req }) => {
      if (!user) {
        throw new NotFoundError("Authentication required");
      }

      // Extract query parameters
      const { searchParams } = new URL(req.url);
      const webhookId = searchParams.get("webhookId") || undefined;
      const eventType = searchParams.get("eventType") || undefined;
      const activeOnly = searchParams.get("active") === "true";

      // If webhookId provided, get subscriptions for that webhook
      if (webhookId) {
        const subscriptions = await WebhookSubscriptionService.getSubscriptions(
          user.id,
          webhookId,
          {
            activeOnly,
            eventType,
          },
        );

        return {
          data: {
            subscriptions,
            filters: { webhookId, eventType, activeOnly },
          },
          message: "Webhook subscriptions retrieved successfully",
        };
      }

      // If no webhookId, return error since we need to scope to a specific webhook
      throw new ValidationError("webhookId parameter is required");
    },
  })(req);
}