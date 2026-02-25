import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { redisManager } from "./redis";
import { Timing } from "./utils/time-measurement";
import { logger } from "./logger";

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

// Validation middleware factory
export function validateRequest<T>(
  schema: ZodSchema<T>,
  source: "body" | "query" = "body",
) {
  return async (
    req: NextRequest,
  ): Promise<
    { success: true; data: T } | { success: false; error: string }
  > => {
    try {
      let rawData: unknown;

      switch (source) {
        case "body":
          rawData = await req.json().catch((error) => {
            logger.warn(`Failed to parse request body as JSON: ${error instanceof Error ? error.message : String(error)}`);
            return {};
          });
          break;
        case "query":
          const url = new URL(req.url);
          rawData = Object.fromEntries(url.searchParams);
          break;
        default:
          return { success: false, error: "Invalid validation source" };
      }

      const validatedData = schema.parse(rawData);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        return { success: false, error: `Validation failed: ${errorMessage}` };
      }
      return { success: false, error: "Invalid request format" };
    }
  };
}

// User-friendly direct validation function
export async function validateRequestData<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  source: "body" | "query" = "body",
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  return await validateRequest(schema, source)(req);
}

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

export const sanitize = {
  // Remove HTML tags and normalize whitespace
  text: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  },

  // Sanitize for SQL injection protection (additional layer to ORM)
  sql: (input: string): string => {
    return input.replace(/['"\\;]/g, "");
  },

  // Sanitize email addresses
  email: (email: string): string => {
    return email.toLowerCase().trim();
  },

  // Sanitize file names
  filename: (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
  },
};

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * RateLimiter function with fail-closed support for critical endpoints
 *
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @param failClosed - If true, deny requests when Redis fails (for critical endpoints)
 */
export function RateLimiter(maxRequests: number, windowMs: number, failClosed: boolean = false) {
  return async (
    identifier: string,
  ): Promise<{ allowed: boolean; resetTime?: number }> => {
    const now = Timing.now();
    const windowSeconds = Math.ceil(windowMs / 1000);
    const key = `rate_limit:${identifier}`;
    const resetTime = now + windowMs;

    try {
      return await redisManager.executeWithFallback<{
        allowed: boolean;
        resetTime?: number;
      }>(
        async (client) => {
          // Use Redis pipeline for atomic operations
          const pipeline = client.multi();

          // Increment counter
          pipeline.incr(key);

          // Set expiry if key is new
          pipeline.expire(key, windowSeconds);

          const results = await pipeline.exec();
          if (!results || results.length === 0) {
            throw new DatabaseError("Redis pipeline failed");
          }

          const currentCount = results[0] as unknown as number;

          if (currentCount > maxRequests) {
            return { allowed: false, resetTime };
          }

          return { allowed: true };
        },
        // Fallback behavior based on failClosed parameter
        async () => {
          if (failClosed) {
            // Critical endpoints: fail-closed - deny requests when Redis unavailable
            logger.error("Redis unavailable, failing closed for critical endpoint", {
              component: "RateLimitMiddleware",
              action: "redisUnavailableFailClosed",
              failClosed: true,
            });
            return { allowed: false, resetTime };
          } else {
            // Non-critical endpoints: fail-open - allow with warning
            logger.warn("Redis unavailable, using fallback rate limiting", {
              component: "RateLimitMiddleware",
              action: "redisFallback",
              failClosed: false,
            });
            return { allowed: true, resetTime };
          }
        },
      );
    } catch (error) {
      logger.error("Rate limiting failed", {
        error: error instanceof Error ? error.message : String(error),
        component: "RateLimitMiddleware",
        action: "rateLimitError",
      });
      // Fail behavior based on failClosed parameter
      if (failClosed) {
        return { allowed: false, resetTime };
      }
      // Fail open - allow the request but log the error
      return { allowed: true, resetTime };
    }
  };
}

// =============================================================================
// CORS UTILITIES
// =============================================================================

// Environment-aware CORS origin validation
export function getAllowedOrigin(requestedOrigin?: string): string {
  // In production, restrict CORS to approved domains only
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [];

    // If no allowed origins configured, default to same-origin for security
    if (allowedOrigins.length === 0) {
      return process.env.NEXT_PUBLIC_APP_URL || "same-origin";
    }

    // If specific origin requested and it's in allowed list, use it
    if (requestedOrigin && allowedOrigins.includes(requestedOrigin)) {
      return requestedOrigin;
    }

    // Otherwise, use the first allowed origin or same-origin
    return (
      allowedOrigins[0] || process.env.NEXT_PUBLIC_APP_URL || "same-origin"
    );
  }

  // In development, allow all origins for convenience
  return "*";
}

// CORS middleware helper with production security restrictions
export function createCorsResponse(
  data: any,
  status: number = 200,
  origin?: string,
): NextResponse {
  const response = NextResponse.json(data, { status });

  // Determine allowed origin based on environment and configuration
  const allowedOrigin = getAllowedOrigin(origin);

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add Content Security Policy in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    );
  }

  return response;
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
    void statusCode;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class DatabaseError extends Error {
  constructor(message: string = "Database operation failed") {
    super(message);
    this.name = "DatabaseError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends Error {
  // eslint-disable-next-line no-unused-vars
  constructor(message: string = "Rate limit exceeded", _resetTime?: number) {
    super(message);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// =============================================================================
// RESPONSE FORMATTERS
// =============================================================================

// Error response formatter
export function formatErrorResponse(error: Error): NextResponse {
  const status =
    error instanceof ValidationError
      ? 400
      : error instanceof AuthenticationError
        ? 401
        : error instanceof AuthorizationError
          ? 403
          : error instanceof NotFoundError
            ? 404
            : error instanceof RateLimitError
              ? 429
              : error instanceof DatabaseError
                ? 500
                : 500;

  const message =
    process.env.NODE_ENV === "production"
      ? status === 500
        ? "Internal server error"
        : error.message
      : error.message;

  const response = createCorsResponse(
    {
      success: false,
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    },
    status,
  );

  if (error instanceof RateLimitError && "resetTime" in error) {
    const resetTime = (error as any).resetTime;
    if (resetTime) {
      const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
      response.headers.set("Retry-After", String(retryAfterSeconds));
    }
  }

  return response;
}

// Success response formatter
export function formatSuccessResponse<T>(
  data: T,
  message?: string,
): NextResponse {
  return createCorsResponse({
    success: true,
    data,
    ...(message && { message }),
  });
}

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

// Unified rate limiting middleware function
// Encapsulates rate limit checking and 429 response generation
// Usage: return withRateLimiter(req, "standard", async () => { ... });
export async function withRateLimiter(
  req: NextRequest,
  rateLimitCategory:
    | "strict"
    | "moderate"
    | "standard"
    | "permissive"
    | "webhook",
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const { RateLimiters } = await import("./rate-limit-config");

  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitCheck = await RateLimiters[rateLimitCategory]()(identifier);

  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil(
              rateLimitCheck.resetTime
                ? (rateLimitCheck.resetTime - Date.now()) / 1000
                : 60,
            ),
          ),
        },
      },
    );
  }

  return handler();
}
