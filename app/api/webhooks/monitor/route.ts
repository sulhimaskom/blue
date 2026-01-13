import { webhookQueueService } from "@/lib/services/webhook-queue-service";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api-utils";

/**
 * GET /api/webhooks/monitor
 *
 * Get webhook queue statistics and dead letter queue events
 * Public endpoint for monitoring webhook processing health
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async () => {
    const stats = webhookQueueService.getQueueStats();
    const deadLetterEvents = webhookQueueService.getDeadLetterEvents();

    return {
      queue: {
        size: stats.queueSize,
        processingStats: {
          processedEventsCount: stats.processedEventsCount,
        },
        deadLetterQueue: {
          size: stats.deadLetterQueueSize,
          events: deadLetterEvents.map((event) => ({
            id: event.id,
            serviceName: event.serviceName,
            eventType: event.eventType,
            attemptCount: event.attemptCount,
            createdAt: new Date(event.createdAt).toISOString(),
            processedAt: event.processedAt
              ? new Date(event.processedAt).toISOString()
              : null,
          })),
        },
      },
    };
  },
});

/**
 * POST /api/webhooks/monitor
 *
 * Retry dead letter queue events (admin only)
 *
 * SECURITY: Requires authenticated admin user
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ user, context }) => {
    if (!user?.isAdmin) {
      logger.security("Unauthorized webhook queue retry attempt", {
        requestId: context.requestId,
        userId: user?.clerkId,
        isAdmin: user?.isAdmin,
      });
      throw new AuthorizationError(
        "Admin access required to retry dead letter queue events",
      );
    }

    logger.userAction("Dead letter queue retry", user.clerkId, {
      requestId: context.requestId,
      isAdmin: true,
    });

    const result = await webhookQueueService.retryDeadLetterEvents();

    logger.systemEvent("Dead letter queue retry completed", {
      retried: result.retried,
      failed: result.failed,
      adminUserId: user.clerkId,
    });

    return {
      retried: result.retried,
      failed: result.failed,
    };
  },
});
