import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

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

// Rate limiting check (simple in-memory, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function RateLimiter(maxRequests: number, windowMs: number) {
  return (identifier: string): { allowed: boolean; resetTime?: number } => {
    const now = Date.now();
    const key = identifier;
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true };
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
