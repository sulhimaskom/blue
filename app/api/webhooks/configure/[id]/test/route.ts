import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { logger } from "@/lib/logger";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, NotFoundError } from "@/lib/api-utils";
import type { NextRequest } from "next/server";

const testWebhookSchema = z.object({
  eventType: z.string().optional(),
});

// POST /api/webhooks/configure/[id]/test - Test webhook delivery
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    schema: testWebhookSchema,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context: _context, user, data }) => {
      if (!user) {
        throw new ValidationError("Authentication required");
      }

      const { id } = await params;

      // Verify ownership before testing
      const existingConfig =
        await WebhookConfigurationService.getConfigurationById(user.id, id);
      if (!existingConfig) {
        throw new NotFoundError("Webhook configuration not found");
      }

      const testResult = await WebhookConfigurationService.testWebhook(
        user.id,
        id,
        { eventType: data?.eventType || "test.event" },
      );

      logger.userAction("webhook_test_executed", user.id.toString(), {
        configId: id,
        configName: existingConfig.name,
        eventType: data?.eventType || "default",
        success: testResult.success,
        latency: testResult.responseTime,
      });

      return {
        data: testResult,
        message: testResult.success
          ? "Webhook test successful"
          : "Webhook test failed",
      };
    },
  })(req);
}
