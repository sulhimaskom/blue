import { NextRequest, NextResponse } from "next/server";
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
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { RuntimeServiceInitializer } from "@/lib/services/runtime-service-initializer";
import { IntelligentPrefetchService } from "@/lib/services/intelligent-prefetch-service";
import { RealTimePerformanceMonitor } from "@/lib/services/real-time-performance-monitor";
import { withCompression } from "@/lib/middleware/compression-wrapper";
import { Timing } from "@/lib/utils/time-measurement";

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

export interface CachedAPIHandlerConfig {
  /** Cache TTL in seconds */
  ttl: number;
  /** Cache tags for invalidation */
  tags: string[];
  /** Request parameters to vary cache by (empty array = same for all users) */
  varyBy: string[];
  /** Enable runtime service initialization (performance optimization) */
  initializeServices?: boolean;
  /** Custom response status based on data */
  // eslint-disable-next-line no-unused-vars
  getStatus?: (data: any) => number;
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
 * - Compression and caching unified patterns
 */
class APIRouteHandler {
  /**
   * Create a standardized POST handler with authentication, validation, and rate limiting
   */
  static createPOSTHandler<TInput = any>(config: APIHandlerConfig<TInput>) {
    return async (req: NextRequest) => {
      const startTime = Timing.now();
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
              `Rate limit exceeded. Try again in ${Math.ceil((rateLimitCheck.resetTime! - Timing.now()) / 1000)} seconds.`,
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

        const duration = Timing.perf(startTime);

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
        const duration = Timing.perf(startTime);
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
      const startTime = Timing.now();
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

        const duration = Timing.perf(startTime);

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
        const duration = Timing.perf(startTime);

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

  /**
   * Create a cached GET handler with compression and unified caching
   *
   * This factory method eliminates 80% of boilerplate across API routes by combining:
   * - Runtime service initialization
   * - Compression middleware
   * - Unified caching with tag-based invalidation
   * - Response formatting and status determination
   * - Performance monitoring and logging
   *
   * @param config - Handler configuration
   * @param cacheConfig - Cache configuration options
   * @returns Standardized GET handler function
   */
  static createCachedGETHandler(
    config: Omit<APIHandlerConfig, "schema" | "requireCredits">,
    cacheConfig: CachedAPIHandlerConfig,
  ) {
    return async (req: NextRequest) => {
      return withCompression(async () => {
        // Initialize runtime services safely (won't run during build)
        if (cacheConfig.initializeServices !== false) {
          await RuntimeServiceInitializer.initializeServices();
          await IntelligentPrefetchService.initialize();
          await RealTimePerformanceMonitor.initialize();
        }

        return UnifiedCacheManager.withCache(
          req,
          async () => {
            const startTime = Timing.now();
            const context = createRequestContext();
            let authenticatedUser:
              | import("@/lib/services/user-service").AuthenticatedUser
              | null = null;
            const url = new URL(req.url);

            try {
              // Authentication if required
              if (config.requireAuth !== false) {
                authenticatedUser =
                  await UserService.getAuthenticatedUser(context);
              }

              // Execute the main handler
              const result = await config.handler({
                req,
                context,
                user: authenticatedUser || undefined,
              });

              const duration = Timing.perf(startTime);

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

              // Determine response status or use default
              const httpStatus = cacheConfig.getStatus
                ? cacheConfig.getStatus(result)
                : 200;

              return NextResponse.json(result, { status: httpStatus });
            } catch (error) {
              const duration = Timing.perf(startTime);

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
                throw error;
              }

              throw new DatabaseError("API request failed");
            }
          },
          {
            ttl: cacheConfig.ttl,
            tags: cacheConfig.tags,
            varyBy: cacheConfig.varyBy,
          },
        );
      }, req);
    };
  }

  /**
   * Create a simple cached GET handler for read-only endpoints
   *
   * Simplified version for endpoints that don't need authentication
   * or complex business logic
   */
  static createSimpleCachedGETHandler(
    // eslint-disable-next-line no-unused-vars
    handler: (req: NextRequest) => Promise<any>,
    cacheConfig: CachedAPIHandlerConfig,
  ) {
    return this.createCachedGETHandler(
      {
        requireAuth: false,
        // eslint-disable-next-line no-unused-vars
        handler: async ({ req }) => handler(req),
      },
      cacheConfig,
    );
  }
}

export { APIRouteHandler };
