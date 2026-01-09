import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookSecretRotationSchema } from "@/lib/schemas/webhook-schema";
import { RateLimiters } from "@/lib/rate-limit-config";

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  requireCredits: 1,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  schema: webhookSecretRotationSchema,
  handler: async ({ data, user }) => {
    if (!user) throw new Error("User not authenticated");
    const userId = user.id;
    const { webhookId } = data as z.infer<
      typeof webhookSecretRotationSchema
    >;

    const newSecret = await WebhookConfigurationService.rotateSecret(
      userId,
      webhookId,
    );

    return {
      success: true,
      data: { webhookId, secret: newSecret },
      message: "Webhook secret rotated successfully",
    };
  },
});
