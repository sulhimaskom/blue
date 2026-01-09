import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookRetrySchema } from "@/lib/schemas/webhook-schema";
import { RateLimiters } from "@/lib/rate-limit-config";

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  requireCredits: 2,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  schema: webhookRetrySchema,
  handler: async ({ data, user }) => {
    if (!user) throw new Error("User not authenticated");
    const userId = user.id;
    const { eventId } = data as z.infer<typeof webhookRetrySchema>;

    const success = await WebhookConfigurationService.retryWebhook(
      userId,
      eventId,
    );

    return {
      success: true,
      data: { eventId, success },
      message: success
        ? "Webhook retry initiated successfully"
        : "Webhook retry failed",
    };
  },
});
