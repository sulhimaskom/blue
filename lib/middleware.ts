/* eslint-disable no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import {
  validateRequest,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  RateLimiter,
} from "@/lib/api-utils";

// Enhanced middleware factory with multiple validation layers
export function createAPIRoute<T>(options: {
  requireAuth?: boolean;
  rateLimit?: { requests: number; windowMs: number };
  validate?: { schema: ZodSchema<T>; source: "body" | "query" };
  handler: (
    _req: NextRequest,
    _data: T,
    _context: { userId?: string },
  ) => Promise<NextResponse>;
}) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Authentication check
      let userId: string | undefined;
      if (options.requireAuth !== false) {
        const { auth } = await import("@clerk/nextjs/server");
        const authResult = auth();
        userId = authResult.userId || undefined;

        if (!userId) {
          throw new AuthenticationError();
        }
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimiter = RateLimiter(
          options.rateLimit.requests,
          options.rateLimit.windowMs,
        );
        const identifier =
          userId || req.headers.get("x-forwarded-for") || "unknown";
        const rateLimitResult = await rateLimiter(identifier);

        if (!rateLimitResult.allowed) {
          throw new ValidationError("Rate limit exceeded", 429);
        }
      }

      // Input validation
      let validatedData = {} as T;
      if (options.validate) {
        const validation = await validateRequest(
          options.validate.schema,
          options.validate.source,
        )(req);
        if (!validation.success) {
          throw new ValidationError(validation.error);
        }
        validatedData = validation.data;
      }

      // Execute handler
      return await options.handler(req, validatedData, { userId });
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      // Note: In production, use a proper logging service like Sentry or LogRocket
      return formatErrorResponse(
        error instanceof Error ? error : new Error("Unknown error"),
      );
    }
  };
}

// Security headers middleware
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (basic)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    );
  }

  return response;
}

// Input sanitization middleware for common attacks
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Prevent XSS
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");

    // Prevent SQL injection (additional layer to ORM)
    sanitized = sanitized.replace(/['"\\;]/g, "");

    // Prevent command injection
    sanitized = sanitized.replace(/[;&|`$(){}[\]]/g, "");

    return sanitized.trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize object keys as well
      const sanitizedKey = key.replace(/[;&|`$(){}[\]]/g, "");
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// Generic API route wrapper that applies all security measures
export function secureAPIRoute<T>(options: {
  requireAuth?: boolean;
  rateLimit?: { requests: number; windowMs: number };
  validate?: { schema: ZodSchema<T>; source: "body" | "query" };
  handler: (
    _req: NextRequest,
    _data: T,
    _context: { userId?: string },
  ) => Promise<NextResponse>;
}) {
  return createAPIRoute({
    ...options,
    handler: async (_req, data, _context) => {
      // Sanitize input data
      const sanitizedData = sanitizeInput(data);

      // Execute handler with sanitized data
      const response = await options.handler(_req, sanitizedData, _context);

      // Add security headers
      return addSecurityHeaders(response);
    },
  });
}
