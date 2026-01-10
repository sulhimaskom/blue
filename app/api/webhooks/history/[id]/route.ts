import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import type { WebhookStatus, WebhookEventType } from "@/lib/schemas/webhook-schema";
import { AuthenticationError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ req, user }) => {
      if (!user) throw new AuthenticationError("User not authenticated");
      const userId = user.id;

      const urlObj = new URL(req.url);
      const limit = parseInt(urlObj.searchParams.get("limit") || "50");
      const offset = parseInt(urlObj.searchParams.get("offset") || "0");
      const statusStr = urlObj.searchParams.get("status");
      const eventTypeStr = urlObj.searchParams.get("eventType");
      const status = statusStr ? (statusStr as WebhookStatus) : undefined;
      const eventType = eventTypeStr ? (eventTypeStr as WebhookEventType) : undefined;

      const events = await WebhookConfigurationService.getEventHistory(
        userId,
        id,
        {
          limit,
          offset,
          status,
          eventType,
        },
      );

      const safeEvents = events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        status: event.status,
        responseStatus: event.responseStatus,
        attemptCount: event.attemptCount,
        nextRetryAt: event.nextRetryAt,
        deliveredAt: event.deliveredAt,
        createdAt: event.createdAt,
      }));

      return {
        success: true,
        data: safeEvents,
        pagination: {
          limit,
          offset,
          total: safeEvents.length,
        },
        message: "Webhook event history retrieved successfully",
      };
    },
  })(req);
}
