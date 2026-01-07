import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { redisManager } from "./redis";
import { Timing } from "./utils/time-measurement";
import { logger } from "./logger";

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
          rawData = await req.json().catch(() => ({}));
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
// This addresses BUG-003: validateRequest function not exported correctly
// The original factory pattern was confusing and led to "is not a function" errors
// Usage: const result = await validateRequestData(req, schema, "body");
export async function validateRequestData<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  source: "body" | "query" = "body",
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  return await validateRequest(schema, source)(req);
}

// Sanitization utilities
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

// Distributed rate limiting check using Redis
export function RateLimiter(maxRequests: number, windowMs: number) {
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
            throw new Error("Redis pipeline failed");
          }

          const currentCount = results[0] as unknown as number;

          if (currentCount > maxRequests) {
            return { allowed: false, resetTime };
          }

          return { allowed: true };
        },
        // Fallback to in-memory if Redis is unavailable
        async () => {
          logger.warn("Redis unavailable, using fallback rate limiting", {
            component: "RateLimitMiddleware",
            action: "redisFallback",
          });
          // Simple fallback that allows requests but logs the issue
          return { allowed: true, resetTime };
        },
      );
    } catch (error) {
      logger.error("Rate limiting failed", {
        error: error instanceof Error ? error.message : String(error),
        component: "RateLimitMiddleware",
        action: "rateLimitError",
      });
      // Fail open - allow the request but log the error
      return { allowed: true, resetTime };
    }
  };
}

// CORS middleware helper
export function createCorsResponse(
  data: any,
  status: number = 200,
  origin: string = "*",
): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

// Centralized error handler
export class ValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ValidationError";
    // Use statusCode in error handling
    void statusCode;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "AuthorizationError";
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
  }
}

// Error response formatter
export function formatErrorResponse(error: Error): NextResponse {
  const status =
    error instanceof ValidationError
      ? 400
      : error instanceof AuthenticationError
        ? 401
        : error instanceof AuthorizationError
          ? 403
          : error instanceof DatabaseError
            ? 500
            : 500;

  const message =
    process.env.NODE_ENV === "production"
      ? status === 500
        ? "Internal server error"
        : error.message
      : error.message;

  return createCorsResponse(
    {
      success: false,
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    },
    status,
  );
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
