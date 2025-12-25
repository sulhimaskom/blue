import { NextRequest, NextResponse } from "next/server";
import {
  formatSuccessResponse,
  formatErrorResponse,
  DatabaseError,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { IdGenerators } from "@/lib/utils/id-generator";
import { APIResponseFormatter } from "@/lib/services/api-response-formatter";

export interface WebhookHandlerConfig {
  serviceName: string;
  // eslint-disable-next-line no-unused-vars
  verifySignature: (_body: string, _headers: Headers) => boolean;
  // eslint-disable-next-line no-unused-vars
  processEvent: (_event: any, _context: { requestId: string }) => Promise<void>;
}

/**
 * WebhookService - Centralized webhook processing utilities
 *
 * Eliminates code duplication across webhook handlers by providing:
 * - Standardized response formatting
 * - Consistent error handling and logging
 * - Test environment response handling
 * - Signature verification patterns
 */
export class WebhookService {
  /**
   * Create standardized webhook response based on environment
   */
  static createWebhookResponse(
    success: boolean,
    data: any = { received: true },
    error?: string,
  ): NextResponse | Response {
    // Handle test environment differently
    if (process.env.NODE_ENV === "test") {
      return new NextResponse(
        JSON.stringify({
          success,
          data: success ? data : null,
          error: success ? null : error,
        }),
        {
          status: success ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Production response format
    if (success) {
      return formatSuccessResponse(data);
    } else {
      const errorResponse = new DatabaseError(
        error || "Webhook processing failed",
      );
      return formatErrorResponse(errorResponse);
    }
  }

  /**
   * Centralized webhook processing with consistent error handling
   */
  static async processWebhook(
    req: NextRequest,
    config: WebhookHandlerConfig,
  ): Promise<Response> {
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      const body = await req.text();
      const headers = req.headers;

      // Signature verification
      if (!config.verifySignature(body, headers)) {
        logger.security(
          `${config.serviceName} webhook signature verification failed`,
          {
            requestId: context.requestId,
            headers: Object.fromEntries(headers.entries()),
          },
        );

        return this.createWebhookResponse(
          false,
          null,
          `Invalid ${config.serviceName} webhook signature`,
        );
      }

      // Parse event
      let event: any;
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        logger.apiError(
          `${config.serviceName} webhook JSON parsing failed`,
          context.requestId,
          parseError as Error,
          { bodyLength: body.length },
        );

        return this.createWebhookResponse(
          false,
          null,
          "Invalid webhook payload",
        );
      }

      // Process event
      await config.processEvent(event, context);

      logger.systemEvent(
        `${config.serviceName} webhook processed successfully`,
        {
          requestId: context.requestId,
          eventType: event.type,
        },
      );

      return this.createWebhookResponse(true);
    } catch (error) {
      // Defensive: Ensure context is available even in unexpected error scenarios
      const requestId = context?.requestId || "unknown";

      logger.apiError(
        `${config.serviceName} webhook processing failed`,
        requestId,
        error as Error,
        {
          endpoint: `/api/webhooks/${config.serviceName.toLowerCase()}`,
        },
      );

      return this.createWebhookResponse(
        false,
        null,
        "Webhook processing failed",
      );
    }
  }

  /**
   * Handle webhook OPTIONS requests consistently
   */
  static handleOptions(): Response {
    return new Response(null, { status: 200 });
  }
  /**
   * Enhanced webhook response using APIResponseFormatter
   * Provides consistent error handling and response structure
   */
  static createStandardizedWebhookResponse(
    success: boolean,
    data: any = { received: true },
    error?: Error,
    requestId?: string,
    service?: string,
  ): NextResponse | Response {
    // Handle test environment differently for backward compatibility
    if (process.env.NODE_ENV === "test") {
      return new NextResponse(
        JSON.stringify({
          success,
          data: success ? data : null,
          error: success ? null : error?.message,
        }),
        {
          status: success ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Use standardized API response formatter for production
    if (success) {
      return APIResponseFormatter.createSuccessResponse(
        data,
        requestId,
        service,
        "webhook_processing",
      );
    } else {
      return APIResponseFormatter.createErrorResponse(
        error || new Error("Webhook processing failed"),
        requestId,
        service,
        "webhook_processing",
      );
    }
  }
}
