/**
 * Advanced Response Compression Middleware Integration
 *
 * Integrates intelligent response compression with Next.js middleware.
 * Applies compression to all API routes with performance monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import responseCompressor from "@/lib/middleware/response-compression";
import { logger } from "@/lib/logger";
import { CircuitBreaker } from "@/lib/circuit-breaker";

// Circuit breaker for compression to prevent cascading failures
const compressionCircuit = new CircuitBreaker("response-compression", {
  failureThreshold: 5,
  timeoutMs: 5000,
  resetTimeout: 10000,
  monitoringPeriod: 60000,
  successThreshold: 3,
});

/**
 * Middleware wrapper for response compression
 */
export async function withCompression(
  // eslint-disable-next-line no-unused-vars
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  req: NextRequest,
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    // Check if client supports compression
    const acceptEncoding = req.headers.get("accept-encoding") || "";
    const supportsCompression = /\b(gzip|deflate|br)\b/.test(acceptEncoding);

    if (!supportsCompression) {
      logger.debug("Client does not support compression", {
        requestId,
        acceptEncoding,
      });
      return await handler(req);
    }

    // Check compression circuit breaker
    if (!compressionCircuit.isAvailable()) {
      const metrics = compressionCircuit.getMetrics();
      logger.warn("Compression circuit breaker open - bypassing compression", {
        requestId,
        circuitState: metrics.state,
      });
      return await handler(req);
    }

    // Execute the original handler
    const response = await compressionCircuit.execute(
      async () => await handler(req),
    );

    // Apply compression if response is successful
    if (response.ok && response.body) {
      const compressedResponse = await responseCompressor.compressResponse(
        response,
        req,
      );

      // Log performance metrics
      const duration = Date.now() - startTime;
      const metrics = responseCompressor.getPerformanceMetrics();

      logger.info("Compression middleware completed", {
        requestId,
        duration: `${duration}ms`,
        wasCompressed:
          compressedResponse.headers.get("content-encoding") !== null,
        compressionMetrics: metrics,
      });

      return compressedResponse;
    }

    return response;
  } catch (error) {
    // Log compression failure and return original response
    const duration = Date.now() - startTime;
    logger.error("Compression middleware failed", {
      requestId,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Try to execute original handler without compression
    try {
      return await handler(req);
    } catch (handlerError) {
      logger.error("Both compression and handler failed", {
        requestId,
        compressionError:
          error instanceof Error ? error.message : "Unknown error",
        handlerError:
          handlerError instanceof Error
            ? handlerError.message
            : "Unknown error",
      });

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
}

/**
 * Get compression statistics for monitoring
 */
export function getCompressionStats() {
  return {
    compressor: responseCompressor.getStats(),
    circuit: {
      metrics: compressionCircuit.getMetrics(),
      isAvailable: compressionCircuit.isAvailable(),
    },
    metrics: responseCompressor.getPerformanceMetrics(),
  };
}

/**
 * Reset compression statistics
 */
export function resetCompressionStats() {
  responseCompressor.resetStats();
  compressionCircuit.reset();
}
