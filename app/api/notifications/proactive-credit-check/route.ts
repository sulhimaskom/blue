import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProactiveNotificationService } from "@/lib/services/proactive-notification-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { AuthenticationError, AuthorizationError } from "@/lib/api-utils";
import { z } from "zod";

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.strict(),
  requireCredits: 10,
  schema: z.object({
    userId: z.number().optional(),
  }),
  handler: async ({ user, data }) => {
    if (!user) {
      throw new AuthenticationError("User authentication required");
    }

    const { userId } = data ?? {};

    if (userId && userId !== user.id) {
      throw new AuthorizationError("You can only check notifications for your own account");
    }

    const targetUserId = userId ?? user.id;

    await ProactiveNotificationService.checkCreditWarningsForUser(
      targetUserId,
      user.clerkId,
    );

    return {
      success: true,
      message: "Credit warnings checked successfully",
      userId: targetUserId,
    };
  },
});
