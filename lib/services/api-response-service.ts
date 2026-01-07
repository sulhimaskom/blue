/**
 * API Response Standardization Service
 *
 * Provides unified response patterns for all API endpoints
 * Eliminates code duplication and ensures consistent API contracts
 *
 * Service Layer Benefits:
 * - Atomic Modularity: Single responsibility for response formatting
 * - DRY Principle: Zero duplicate response logic
 * - Consistency: Standardized error handling and logging
 * - Type Safety: Full TypeScript interfaces for all response types
 */

import { NextResponse } from "next/server";
import { logger, createRequestContext } from "@/lib/logger";
import { IdGenerators } from "@/lib/utils/id-generator";

// Response type interfaces
export interface StandardAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  generatedAt: string;
  responseTime: string;
  cacheHitRate?: number;
}

export interface ErrorResponseOptions {
  status: number;
  errorCode?: string;
  context?: Record<string, any>;
}

export interface SuccessResponseOptions<T = any> {
  data?: T;
  ttl?: number;
  tags?: string[];
  additionalMetadata?: Record<string, any>;
}

/**
 * Unified API Response Service
 * Centralizes all response formatting and error handling logic
 */
export class APIResponseService {
  /**
   * Create standardized success response
   */
  static createSuccessResponse<T>(
    requestId: string,
    startTime: number,
    options: SuccessResponseOptions<T> = {},
  ): StandardAPIResponse<T> {
    const { data, additionalMetadata } = options;
    const responseTime = Date.now() - startTime;

    const response: StandardAPIResponse<T> = {
      success: true,
      data,
      requestId,
      metadata: {
        generatedAt: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        ...additionalMetadata,
      },
    };

    logger.info("API response generated successfully", {
      requestId,
      responseTime: `${responseTime}ms`,
      hasData: !!data,
    });

    return response;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    requestId: string,
    startTime: number,
    error: Error | string,
    options: ErrorResponseOptions = { status: 500 },
  ): NextResponse<StandardAPIResponse<never>> {
    const { status, errorCode, context } = options;
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : error;

    const response: StandardAPIResponse<never> = {
      success: false,
      error: errorMessage,
      requestId,
      metadata: {
        generatedAt: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
      },
    };

    logger.error("API request failed", {
      requestId,
      error: errorMessage,
      statusCode: status,
      errorCode,
      responseTime: `${responseTime}ms`,
      context,
    });

    return NextResponse.json(response, { status });
  }

  /**
   * Create cached response with hit rate tracking
   */
  static createCachedResponse<T>(
    requestId: string,
    startTime: number,
    data: T,
    cacheHitRate: number,
    options: SuccessResponseOptions<T> = {},
  ): StandardAPIResponse<T> {
    const response = this.createSuccessResponse(requestId, startTime, {
      ...options,
      data,
    });

    response.metadata.cacheHitRate = cacheHitRate;

    logger.info("Cached API response generated", {
      requestId,
      responseTime: response.metadata.responseTime,
      cacheHitRate: `${cacheHitRate}%`,
    });

    return response;
  }

  /**
   * Create performance optimization response format
   */
  static createPerformanceResponse(
    requestId: string,
    startTime: number,
    optimizationData: Record<string, any>,
    cacheHitRate?: number,
  ): StandardAPIResponse {
    const response = this.createSuccessResponse(requestId, startTime, {
      data: optimizationData,
    });

    if (cacheHitRate !== undefined) {
      response.metadata.cacheHitRate = cacheHitRate;
    }

    // Performance-specific logging
    logger.info("Performance optimization metrics generated", {
      requestId,
      responseTime: response.metadata.responseTime,
      metricsCount: Object.keys(optimizationData).length,
      cacheHitRate: cacheHitRate ? `${cacheHitRate}%` : "N/A",
    });

    return response;
  }

  /**
   * Wrap API execution with standardized error handling
   */
  static async executeWithStandardHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      requestId?: string;
      context?: Record<string, any>;
    } = {},
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    requestId: string;
    responseTime: string;
  }> {
    const requestId = options.requestId || IdGenerators.REQUEST();
    const startTime = Date.now();

    try {
      logger.info(`Starting ${operationName}`, {
        requestId,
        ...options.context,
      });

      const data = await operation();
      const responseTime = Date.now() - startTime;

      logger.info(`${operationName} completed successfully`, {
        requestId,
        responseTime: `${responseTime}ms`,
      });

      return {
        success: true,
        data,
        requestId,
        responseTime: `${responseTime}ms`,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`${operationName} failed`, {
        requestId,
        error: errorMessage,
        responseTime: `${responseTime}ms`,
        context: options.context,
      });

      return {
        success: false,
        error: errorMessage,
        requestId,
        responseTime: `${responseTime}ms`,
      };
    }
  }

  /**
   * Generate request context for API calls
   */
  static generateRequestContext(): {
    requestId: string;
    startTime: number;
    context: ReturnType<typeof createRequestContext>;
  } {
    return {
      requestId: IdGenerators.REQUEST(),
      startTime: Date.now(),
      context: createRequestContext(),
    };
  }

  /**
   * Validate request parameters for performance endpoints
   */
  static validatePerformanceParams(searchParams: URLSearchParams): {
    detailed?: boolean;
    optimize?: boolean;
    valid: boolean;
    error?: string;
  } {
    const detailed = searchParams.get("detailed") === "true";
    const optimize = searchParams.get("optimize") === "true";

    // Add any performance-specific validation here
    if (detailed && searchParams.has("format")) {
      return {
        detailed,
        optimize,
        valid: false,
        error: "Format parameter not allowed with detailed flag",
      };
    }

    return { detailed, optimize, valid: true };
  }
}
