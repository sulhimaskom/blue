import { NextResponse } from "next/server";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

/**
 * Standard API error response structure
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    type:
      | "VALIDATION"
      | "AUTHENTICATION"
      | "AUTHORIZATION"
      | "DATABASE"
      | "EXTERNAL_SERVICE"
      | "INTERNAL_SERVER";
    message: string;
    requestId?: string;
    service?: string;
    operation?: string;
    metadata?: Record<string, any>;
    retryable: boolean;
    timestamp: string;
  };
}

/**
 * Standard API success response structure
 */
export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
  metadata?: {
    service?: string;
    operation?: string;
    processingTime?: number;
  };
}

/**
 * Error classifications for standardized client handling
 */
// eslint-disable-next-line no-unused-vars
export enum ErrorType {
  VALIDATION = "VALIDATION", // eslint-disable-line no-unused-vars
  AUTHENTICATION = "AUTHENTICATION", // eslint-disable-line no-unused-vars
  AUTHORIZATION = "AUTHORIZATION", // eslint-disable-line no-unused-vars
  DATABASE = "DATABASE", // eslint-disable-line no-unused-vars
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE", // eslint-disable-line no-unused-vars
  INTERNAL_SERVER = "INTERNAL_SERVER", // eslint-disable-line no-unused-vars
}

/**
 * Error codes for precise client-side handling
 */
// eslint-disable-next-line no-unused-vars
export enum ErrorCode {
  // Validation errors (4xx)
  INVALID_INPUT = "INVALID_INPUT", // eslint-disable-line no-unused-vars
  MISSING_FIELD = "MISSING_FIELD", // eslint-disable-line no-unused-vars
  INVALID_FORMAT = "INVALID_FORMAT", // eslint-disable-line no-unused-vars
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION", // eslint-disable-line no-unused-vars

  // Authentication errors (401)
  UNAUTHORIZED = "UNAUTHORIZED", // eslint-disable-line no-unused-vars
  INVALID_TOKEN = "INVALID_TOKEN", // eslint-disable-line no-unused-vars
  TOKEN_EXPIRED = "TOKEN_EXPIRED", // eslint-disable-line no-unused-vars

  // Authorization errors (403)
  FORBIDDEN = "FORBIDDEN", // eslint-disable-line no-unused-vars
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS", // eslint-disable-line no-unused-vars

  // Database errors (500)
  DATABASE_CONNECTION = "DATABASE_CONNECTION", // eslint-disable-line no-unused-vars
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT", // eslint-disable-line no-unused-vars
  DATABASE_CONSTRAINT = "DATABASE_CONSTRAINT", // eslint-disable-line no-unused-vars
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND", // eslint-disable-line no-unused-vars

  // External service errors
  GITHUB_API_ERROR = "GITHUB_API_ERROR", // eslint-disable-line no-unused-vars
  STRIPE_ERROR = "STRIPE_ERROR", // eslint-disable-line no-unused-vars
  CLERK_ERROR = "CLERK_ERROR", // eslint-disable-line no-unused-vars
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR", // eslint-disable-line no-unused-vars

  // Internal server errors
  INTERNAL_ERROR = "INTERNAL_ERROR", // eslint-disable-line no-unused-vars
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE", // eslint-disable-line no-unused-vars
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR", // eslint-disable-line no-unused-vars
}

/**
 * APIResponseFormatter - Centralized response formatting for all API endpoints
 *
 * Provides:
 * - Consistent error response structure across all endpoints
 * - Standardized error classification and codes
 * - Enhanced client-side error handling capabilities
 * - Production monitoring and debugging support
 */
export class APIResponseFormatter {
  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: Error,
    requestId?: string,
    service?: string,
    operation?: string,
    metadata?: Record<string, any>,
  ): Response {
    const errorResponse = this.buildErrorResponse(
      error,
      requestId,
      service,
      operation,
      metadata,
    );

    // Log error for monitoring
    logger.error("API Error Response", {
      requestId,
      service,
      operation,
      errorCode: errorResponse.error.code,
      errorType: errorResponse.error.type,
      message: errorResponse.error.message,
      originalError: error.message,
      stack: error.stack,
    });

    const statusCode = this.getStatusCodeForError(error);
    return NextResponse.json(errorResponse, { status: statusCode });
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse<T>(
    data: T,
    requestId?: string,
    service?: string,
    operation?: string,
    processingTime?: number,
  ): Response {
    const response: APISuccessResponse<T> = {
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
      metadata: {
        service,
        operation,
        processingTime,
      },
    };

    return NextResponse.json(response, { status: 200 });
  }

  /**
   * Build standardized error response structure
   */
  private static buildErrorResponse(
    error: Error,
    requestId?: string,
    service?: string,
    operation?: string,
    metadata?: Record<string, any>,
  ): APIErrorResponse {
    const { type, code, retryable } = this.classifyError(error);

    return {
      success: false,
      error: {
        code,
        type,
        message: error.message,
        requestId,
        service,
        operation,
        metadata,
        retryable,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Classify error type and determine error code
   */
  private static classifyError(error: Error): {
    type: ErrorType;
    code: ErrorCode;
    retryable: boolean;
  } {
    // Validation errors
    if (error instanceof ValidationError) {
      return {
        type: ErrorType.VALIDATION,
        code: this.getValidationErrorCode(error),
        retryable: false,
      };
    }

    // Authentication errors
    if (error instanceof AuthenticationError) {
      return {
        type: ErrorType.AUTHENTICATION,
        code: this.getAuthenticationErrorCode(error),
        retryable: false,
      };
    }

    // Authorization errors
    if (error instanceof AuthorizationError) {
      return {
        type: ErrorType.AUTHORIZATION,
        code: ErrorCode.FORBIDDEN,
        retryable: false,
      };
    }

    // Database errors
    if (error instanceof DatabaseError) {
      return {
        type: ErrorType.DATABASE,
        code: this.getDatabaseErrorCode(error),
        retryable: this.isDatabaseErrorRetryable(error),
      };
    }

    // External service errors (check error message patterns)
    if (this.isExternalServiceError(error)) {
      const { code } = this.getExternalServiceErrorCode(error);
      return {
        type: ErrorType.EXTERNAL_SERVICE,
        code,
        retryable: true, // External service errors are often retryable
      };
    }

    // Default to internal server error
    return {
      type: ErrorType.INTERNAL_SERVER,
      code: ErrorCode.INTERNAL_ERROR,
      retryable: false,
    };
  }

  /**
   * Determine HTTP status code for error
   */
  private static getStatusCodeForError(error: Error): number {
    // Validation errors - 400 Bad Request
    if (error instanceof ValidationError) {
      return 400;
    }

    // Authentication errors - 401 Unauthorized
    if (error instanceof AuthenticationError) {
      return 401;
    }

    // Authorization errors - 403 Forbidden
    if (error instanceof AuthorizationError) {
      return 403;
    }

    // Database "not found" errors - 404 Not Found
    if (error instanceof DatabaseError && this.isNotFoundError(error)) {
      return 404;
    }

    // Database errors - 500 Internal Server Error
    if (error instanceof DatabaseError) {
      return 500;
    }

    // External service timeouts - 503 Service Unavailable
    if (this.isTimeoutError(error)) {
      return 503;
    }

    // Default to 500 Internal Server Error
    return 500;
  }

  /**
   * Get specific validation error code
   */
  private static getValidationErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("required") || message.includes("missing")) {
      return ErrorCode.MISSING_FIELD;
    }
    if (message.includes("format") || message.includes("invalid")) {
      return ErrorCode.INVALID_FORMAT;
    }
    if (message.includes("constraint") || message.includes("limit")) {
      return ErrorCode.CONSTRAINT_VIOLATION;
    }

    return ErrorCode.INVALID_INPUT;
  }

  /**
   * Get specific authentication error code
   */
  private static getAuthenticationErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("expired") || message.includes("token")) {
      return ErrorCode.TOKEN_EXPIRED;
    }
    if (message.includes("invalid") || message.includes("format")) {
      return ErrorCode.INVALID_TOKEN;
    }

    return ErrorCode.UNAUTHORIZED;
  }

  /**
   * Get specific database error code
   */
  private static getDatabaseErrorCode(error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("connection")) {
      return ErrorCode.DATABASE_TIMEOUT;
    }
    if (message.includes("constraint") || message.includes("duplicate")) {
      return ErrorCode.DATABASE_CONSTRAINT;
    }
    if (message.includes("not found") || message.includes("doesn't exist")) {
      return ErrorCode.RECORD_NOT_FOUND;
    }

    return ErrorCode.DATABASE_CONNECTION;
  }

  /**
   * Get external service error code
   */
  private static getExternalServiceErrorCode(error: Error): {
    code: ErrorCode;
  } {
    const message = error.message.toLowerCase();

    if (message.includes("github")) {
      return { code: ErrorCode.GITHUB_API_ERROR };
    }
    if (message.includes("stripe")) {
      return { code: ErrorCode.STRIPE_ERROR };
    }
    if (message.includes("clerk")) {
      return { code: ErrorCode.CLERK_ERROR };
    }
    if (message.includes("ai") || message.includes("model")) {
      return { code: ErrorCode.AI_SERVICE_ERROR };
    }

    return { code: ErrorCode.INTERNAL_ERROR };
  }

  /**
   * Check if error is from external service
   */
  private static isExternalServiceError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("github") ||
      message.includes("stripe") ||
      message.includes("clerk") ||
      message.includes("ai") ||
      message.includes("model") ||
      message.includes("tavily") ||
      message.includes("iflow")
    );
  }

  /**
   * Check if database error is a not found error
   */
  private static isNotFoundError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("not found") ||
      message.includes("doesn't exist") ||
      message.includes("no rows")
    );
  }

  /**
   * Check if error is a timeout error
   */
  private static isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("deadline")
    );
  }

  /**
   * Check if database error is retryable
   */
  private static isDatabaseErrorRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("deadlock")
    );
  }

  /**
   * Helper method to wrap async operations with error formatting
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    requestId?: string,
    service?: string,
    operationName?: string,
  ): Promise<Response> {
    try {
      const startTime = Date.now();
      const result = await operation();
      const processingTime = Date.now() - startTime;

      return this.createSuccessResponse(
        result,
        requestId,
        service,
        operationName,
        processingTime,
      );
    } catch (error) {
      return this.createErrorResponse(
        error as Error,
        requestId,
        service,
        operationName,
      );
    }
  }

  /**
   * Helper method to validate and handle input
   */
  static validateInput<T>(
    _input: unknown,
    validator: (_input: unknown) => T, // eslint-disable-line no-unused-vars
  ): T {
    try {
      return validator(_input);
    } catch (error) {
      throw new ValidationError(`Invalid input: ${(error as Error).message}`);
    }
  }
}

// Convenience function for consistent response creation
export function createAPIError(message: string, type?: ErrorType): Error {
  // Create appropriate error class based on type
  switch (type) {
    case ErrorType.VALIDATION:
      return new ValidationError(message);
    case ErrorType.AUTHENTICATION:
      return new AuthenticationError(message);
    case ErrorType.AUTHORIZATION:
      return new AuthorizationError(message);
    case ErrorType.DATABASE:
      return new DatabaseError(message);
    default:
      return new Error(message);
  }
}
