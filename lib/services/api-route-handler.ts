import { NextRequest } from "next/server";
import { z } from "zod";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";
import { monitoringService } from "@/lib/monitoring";

export interface APIHandlerConfig<TInput = any> {
  schema?: z.ZodSchema<TInput>;
  requireAuth?: boolean;
  requireCredits?: number;
  rateLimiter?: (
    // eslint-disable-next-line no-unused-vars
    identifier: string,
  ) => Promise<{ allowed: boolean; resetTime?: number }>;
  // eslint-disable-next-line no-unused-vars
  handler: (_params: {
    req: NextRequest;
    context: { requestId: string };
    user?: import("@/lib/services/user-service").AuthenticatedUser;
    data?: TInput;
  }) => Promise<any>;
}

/**
 * APIRouteHandler - Centralized API processing utilities
 *
 * Eliminates code duplication across API routes by providing:
 * - Standardized authentication flow
 * - Consistent validation and error handling
 * - Rate limiting integration
 * - Credit validation
 * - Request context creation and logging
 */
class APIRouteHandler {
  /**
   * Create a standardized POST handler with authentication, validation, and rate limiting
   */
  static createPOSTHandler<TInput = any>(config: APIHandlerConfig<TInput>) {
    return async (req: NextRequest) => {
      const startTime = Date.now();
      const context = createRequestContext();
      let authenticatedUser:
        | import("@/lib/services/user-service").AuthenticatedUser
        | null = null;
      let validationData: TInput | undefined;
      const url = new URL(req.url);

      try {
        // Authentication if required
        if (config.requireAuth !== false) {
          authenticatedUser = await UserService.getAuthenticatedUser(context);
        }

        // Rate limiting if configured
        if (config.rateLimiter) {
          const _clientIp =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown";
          const identifier = authenticatedUser
            ? `user:${authenticatedUser.clerkId}:${_clientIp}`
            : `ip:${_clientIp}`;

          const rateLimitCheck = await config.rateLimiter(identifier);
          if (!rateLimitCheck.allowed) {
            logger.security("API rate limit exceeded", {
              requestId: context.requestId,
              userId: authenticatedUser?.clerkId,
              clientIp: _clientIp,
              resetTime: rateLimitCheck.resetTime,
            });
            throw new ValidationError(
              `Rate limit exceeded. Try again in ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000)} seconds.`,
              429,
            );
          }
        }

        // Input validation if schema provided
        if (config.schema) {
          const validation = await validateRequest(config.schema, "body")(req);
          if (!validation.success) {
            throw new ValidationError(validation.error);
          }
          validationData = validation.data;
        }

        // Credit validation if required
        if (config.requireCredits && authenticatedUser) {
          if (
            !UserService.hasSufficientCredits(
              authenticatedUser,
              config.requireCredits,
            )
          ) {
            logger.warn("API request blocked - insufficient credits", {
              requestId: context.requestId,
              userId: authenticatedUser.clerkId,
              currentCredits: authenticatedUser.credits,
              requiredCredits: config.requireCredits,
            });
            throw new ValidationError(
              "Insufficient credits. Please upgrade your plan.",
            );
          }
        }

        // Execute the main handler
        const result = await config.handler({
          req,
          context,
          user: authenticatedUser || undefined,
          data: validationData,
        });

        const duration = Date.now() - startTime;

        // Log successful request
        logger.apiRequest(
          "POST",
          req.url,
          context.requestId,
          authenticatedUser?.clerkId,
        );

        // Track performance metrics
        monitoringService.trackApiRequest(
          "POST",
          url.pathname,
          200,
          duration,
          authenticatedUser?.clerkId,
        );

        return formatSuccessResponse(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode =
          error instanceof ValidationError ? error.statusCode : 500;

        // Log error
        logger.apiError(
          "API POST request failed",
          context.requestId,
          error as Error,
          {
            userId: authenticatedUser?.clerkId,
            endpoint: req.url,
            hasValidationData: !!validationData,
          },
        );

        // Track error metrics
        monitoringService.trackApiRequest(
          "POST",
          url.pathname,
          statusCode,
          duration,
          authenticatedUser?.clerkId,
        );

        if (
          error instanceof ValidationError ||
          error instanceof DatabaseError
        ) {
          return formatErrorResponse(error);
        }

        return formatErrorResponse(new DatabaseError("API request failed"));
      }
    };
  }

  /**
   * Create a standardized GET handler with authentication
   */
  static createGETHandler<TInput = any>(
    config: Omit<APIHandlerConfig<TInput>, "schema" | "requireCredits">,
  ) {
    return async (req: NextRequest) => {
      const startTime = Date.now();
      const context = createRequestContext();
      let authenticatedUser:
        | import("@/lib/services/user-service").AuthenticatedUser
        | null = null;
      const url = new URL(req.url);

      try {
        // Authentication if required
        if (config.requireAuth !== false) {
          authenticatedUser = await UserService.getAuthenticatedUser(context);
        }

        // Execute the main handler
        const result = await config.handler({
          req,
          context,
          user: authenticatedUser || undefined,
        });

        const duration = Date.now() - startTime;

        // Log successful request
        logger.apiRequest(
          "GET",
          req.url,
          context.requestId,
          authenticatedUser?.clerkId,
        );

        // Track performance metrics
        monitoringService.trackApiRequest(
          "GET",
          url.pathname,
          200,
          duration,
          authenticatedUser?.clerkId,
        );

        return formatSuccessResponse(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        const url = new URL(req.url);

        // Log error
        logger.apiError(
          "API GET request failed",
          context.requestId,
          error as Error,
          {
            userId: authenticatedUser?.clerkId,
            endpoint: req.url,
          },
        );

        // Track error metrics
        monitoringService.trackApiRequest(
          "GET",
          url.pathname,
          500,
          duration,
          authenticatedUser?.clerkId,
        );

        if (error instanceof DatabaseError) {
          return formatErrorResponse(error);
        }

        return formatErrorResponse(new DatabaseError("API request failed"));
      }
    };
  }
}

export { APIRouteHandler };
