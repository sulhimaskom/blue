import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ user, url }: any) => {
      const userId = user.id;

      const urlObj = new URL(url);
      const limit = parseInt(urlObj.searchParams.get("limit") || "50");
      const offset = parseInt(urlObj.searchParams.get("offset") || "0");
      const status = urlObj.searchParams.get("status") as any;
      const eventType = urlObj.searchParams.get("eventType") as any;

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
