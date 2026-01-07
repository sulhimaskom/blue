import { NextRequest, NextResponse } from "next/server";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { webhookQueueService } from "@/lib/services/webhook-queue-service";

/**
 * API endpoint for webhook queue monitoring and management
 * Provides visibility into webhook processing health
 */

export async function GET(): Promise<NextResponse> {
  try {
    // Get queue statistics
    const stats = webhookQueueService.getQueueStats();

    // Get dead letter queue events
    const deadLetterEvents = webhookQueueService.getDeadLetterEvents();

    const data = {
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

    return formatSuccessResponse(data);
  } catch (error) {
    logger.apiError(
      "Webhook queue monitoring failed",
      "webhook_queue_monitoring",
      error as Error,
      {
        endpoint: "/api/webhooks/monitoring",
      },
    );

    return formatErrorResponse(error as Error);
  }
}

/**
 * Retry dead letter queue events (admin operation)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify this is an admin operation (simplified check)
    // In production, implement proper admin authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          },
        },
        { status: 401 },
      );
    }

    const adminToken = authHeader.split(" ")[1];
    if (adminToken !== process.env.WEBHOOK_ADMIN_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid admin token",
          },
        },
        { status: 401 },
      );
    }

    const result = await webhookQueueService.retryDeadLetterEvents();

    logger.systemEvent("Dead letter queue retry completed", {
      retried: result.retried,
      failed: result.failed,
    });

    return NextResponse.json({
      success: true,
      data: {
        retried: result.retried,
        failed: result.failed,
        message: `Retried ${result.retried} dead letter events`,
      },
    });
  } catch (error) {
    logger.apiError(
      "Dead letter queue retry failed",
      "webhook_queue_retry",
      error as Error,
      {
        endpoint: "/api/webhooks/monitoring",
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retry dead letter queue",
        },
      },
      { status: 500 },
    );
  }
}
