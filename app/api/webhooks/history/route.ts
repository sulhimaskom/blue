import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, NotFoundError } from "@/lib/api-utils";
import type { NextRequest } from "next/server";

// GET /api/webhooks/history - Get webhook event history
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user, req }) => {
    if (!user) {
      throw new ValidationError("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const events = await WebhookConfigurationService.getEventHistory(
      user.id,
      configId,
      limit,
      offset,
    );

    return { data: events };
  },
});

// POST /api/webhooks/[eventId]/retry - Retry failed webhook event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user }) => {
      if (!user) {
        throw new ValidationError("Authentication required");
      }

      const { eventId } = await params;

      const result = await WebhookConfigurationService.retryWebhook(
        eventId,
        user.id,
      );

      logger.userAction("webhook_event_retried", user.id.toString(), {
        eventId,
        success: result.success,
        latency: result.latency,
      });

      return {
        data: result,
        message: result.success
          ? "Webhook event retry successful"
          : "Webhook event retry failed",
      };
    },
  })(req);
}
