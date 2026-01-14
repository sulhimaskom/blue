import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { NotificationService } from "@/lib/services/notification-service";
import { RateLimiters } from "@/lib/rate-limit-config";

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const result = await NotificationService.markAllAsRead(
      user!.clerkId,
    );

    logger.userAction("All notifications marked as read", user!.clerkId, {
      requestId: context.requestId,
      markedCount: result.markedCount,
    });

    return {
      markedCount: result.markedCount,
      message: "All notifications marked as read successfully",
    };
  },
});