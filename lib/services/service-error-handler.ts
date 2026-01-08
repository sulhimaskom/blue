/* eslint-disable no-unused-vars */
import { logger } from "@/lib/logger";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
} from "@/lib/api-utils";

// Re-export for service layer convenience
export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
};

/**
 * ServiceError - Enhanced error class for service layer operations
 */
// eslint-disable-next-line no-unused-vars
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly operation: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = "ServiceError";
  }

  /**
   * Create a standard ValidationError for service operations
   */
  static validation(
    message: string,
    service: string,
    operation: string,
    context?: Record<string, any>,
  ): ServiceError {
    const error = new ServiceError(
      message,
      service,
      operation,
      undefined,
      context,
    );
    // Make it compatible with ValidationError for API route handler compatibility
    Object.setPrototypeOf(error, ValidationError.prototype);
    return error as any;
  }

  /**
   * Create a standard DatabaseError for service operations
   */
  static database(
    message: string,
    service: string,
    operation: string,
    cause?: Error,
    context?: Record<string, any>,
  ): ServiceError {
    const error = new ServiceError(
      `Database error in ${service}: ${message}`,
      service,
      operation,
      cause,
      context,
    );
    // Make it compatible with DatabaseError for API route handler compatibility
    Object.setPrototypeOf(error, DatabaseError.prototype);
    return error as any;
  }

  /**
   * Create a standard AuthenticationError for service operations
   */
  static authentication(
    message: string,
    service: string,
    operation: string,
    context?: Record<string, any>,
  ): ServiceError {
    const error = new ServiceError(
      `Authentication error in ${service}: ${message}`,
      service,
      operation,
      undefined,
      context,
    );
    // Make it compatible with AuthenticationError for API route handler compatibility
    Object.setPrototypeOf(error, AuthenticationError.prototype);
    return error as any;
  }

  /**
   * Create a standard AuthorizationError for service operations
   */
  static authorization(
    message: string,
    service: string,
    operation: string,
    context?: Record<string, any>,
  ): ServiceError {
    const error = new ServiceError(
      `Authorization error in ${service}: ${message}`,
      service,
      operation,
      undefined,
      context,
    );
    // Make it compatible with AuthorizationError for API route handler compatibility
    Object.setPrototypeOf(error, AuthorizationError.prototype);
    return error as any;
  }
}

/**
 * ServiceErrorHandler - Centralized error handling for service layer
 *
 * Provides:
 * - Consistent error logging across all services
 * - Standardized error wrapping and enrichment
 * - Context-aware error reporting
 * - Integration with monitoring and alerting
 */
export class ServiceErrorHandler {
  /**
   * Handle errors in service methods with proper logging and enrichment
   */
  static handle(
    error: Error,
    serviceName: string,
    operation: string,
    context?: Record<string, any>,
  ): never {
    // If this is already a ServiceError, just add logging
    if (error instanceof ServiceError) {
      logger.error(`${error.service}:${error.operation}`, {
        serviceName: error.service,
        operation: error.operation,
        error: error.message,
        context: { ...error.context, ...context },
        originalError: error.cause,
      });
      throw error;
    }

    // Log generic errors and wrap them
    logger.error(`${serviceName}:${operation}`, {
      serviceName,
      operation,
      error: error.message,
      context,
      errorType: error.constructor.name,
      stack: error.stack,
    });

    // Determine error type based on message patterns
    if (
      error.message.includes("not found") ||
      error.message.includes("Missing required")
    ) {
      throw ServiceError.validation(
        error.message,
        serviceName,
        operation,
        context,
      );
    }

    if (
      error.message.includes("unauthorized") ||
      error.message.includes("authentication")
    ) {
      throw ServiceError.authentication(
        error.message,
        serviceName,
        operation,
        context,
      );
    }

    if (
      error.message.includes("access denied") ||
      error.message.includes("forbidden")
    ) {
      throw ServiceError.authorization(
        error.message,
        serviceName,
        operation,
        context,
      );
    }

    // Default to database error for unknown errors
    throw ServiceError.database(
      error.message,
      serviceName,
      operation,
      error,
      context,
    );
  }

  /**
   * Handle async failures in service operations
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    serviceName: string,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      ServiceErrorHandler.handle(
        error as Error,
        serviceName,
        operationName,
        context,
      );
    }
  }

  /**
   * Create a wrapper function for consistent error handling
   */
  // eslint-disable-next-line no-unused-vars
  static wrap<T extends any[], R>(
    fn: (...args: T) => R,
    serviceName: string,
    operationName: string,
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        const result = fn(...args);

        // Handle async functions
        if (result instanceof Promise) {
          return ServiceErrorHandler.handleAsync(
            () => result,
            serviceName,
            operationName,
            { argCount: args.length },
          ) as R;
        }

        return result;
      } catch (error) {
        ServiceErrorHandler.handle(error as Error, serviceName, operationName, {
          argCount: args.length,
        });
      }
    };
  }

  /**
   * Validate input and throw standardized ValidationError if invalid
   */
  // eslint-disable-next-line no-unused-vars
  static validate<T>(
    value: T,
    validator: (value: T) => boolean | string,
    serviceName: string,
    operation: string,
    fieldName: string,
    context?: Record<string, any>,
  ): asserts value is T {
    const result = validator(value);
    if (result === true) return;

    const message =
      typeof result === "string" ? result : `Invalid ${fieldName}`;
    throw ServiceError.validation(message, serviceName, operation, {
      ...context,
      fieldName,
    });
  }

  /**
   * Check authentication and throw standardized error if not authenticated
   */
  static requireAuth<T>(
    user: T | null | undefined,
    serviceName: string,
    operation: string,
    context?: Record<string, any>,
  ): asserts user is T {
    if (!user) {
      throw ServiceError.authentication(
        "Authentication required",
        serviceName,
        operation,
        context,
      );
    }
  }

  /**
   * Check authorization and throw standardized error if not authorized
   */
  static requireAuthorization(
    condition: boolean,
    reason: string,
    serviceName: string,
    operation: string,
    context?: Record<string, any>,
  ): void {
    if (!condition) {
      throw ServiceError.authorization(reason, serviceName, operation, context);
    }
  }
}
