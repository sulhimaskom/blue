import { NextRequest } from "next/server";
import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { WebhookConfigurationService } from "@/lib/services/webhook-configuration-service";
import { webhookTestSchema } from "@/lib/schemas/webhook-schema";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    requireCredits: 1,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    schema: webhookTestSchema,
    handler: async ({ data, user }) => {
      if (!user) throw new Error("User not authenticated");
      const userId = user.id;
      const testInput = data as z.infer<typeof webhookTestSchema>;

      const result = await WebhookConfigurationService.testWebhook(
        userId,
        id,
        testInput,
      );

      return {
        success: true,
        data: {
          success: result.success,
          status: result.status,
          responseTime: result.responseTime,
          error: result.error,
        },
        message: result.success
          ? "Webhook test completed successfully"
          : "Webhook test failed",
      };
    },
  })(req);
}
