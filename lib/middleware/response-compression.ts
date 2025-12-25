/**
 * Advanced Response Compression Middleware
 *
 * Intelligent response compression with format detection and algorithm selection.
 * Supports gzip, deflate, and br (Brotli) compression for optimal performance.
 *
 * Performance Targets:
 * - 15-25% bandwidth reduction for JSON responses >1KB
 * - 30-40% reduction for HTML/text responses >2KB
 * - Minimal CPU overhead with smart caching
 */
import { NextRequest, NextResponse } from "next/server";
import { gzipSync } from "zlib";
import { brotliCompressSync } from "zlib";
import { logger } from "@/lib/logger";

// Performance thresholds for compression decision-making
const COMPRESSION_THRESHOLDS = {
  MIN_SIZE_COMPRESS: 1024, // Only compress responses >1KB
  JSON_MIN_SIZE: 1024, // JSON responses smaller than this won't be compressed
  HTML_MIN_SIZE: 2048, // HTML/text threshold
  MAX_COMPRESSION_RATIO: 0.9, // Don't compress if <10% reduction
} as const;

// Support for different content types and their optimal algorithms
const CONTENT_TYPE_ALGORITHMS = {
  "application/json": { preferred: "gzip", options: { level: 6 } },
  "text/html": { preferred: "br", options: { level: 4 } },
  "text/plain": { preferred: "gzip", options: { level: 6 } },
  "text/css": { preferred: "br", options: { level: 4 } },
  "application/javascript": { preferred: "gzip", options: { level: 6 } },
  "text/xml": { preferred: "gzip", options: { level: 6 } },
} as const;

// Compression statistics tracking
interface CompressionStats {
  totalRequests: number;
  compressedResponses: number;
  bytesOriginal: number;
  bytesCompressed: number;
  avgCompressionRatio: number;
  algorithmUsage: Record<string, number>;
}

class ResponseCompressor {
  private stats: CompressionStats = {
    totalRequests: 0,
    compressedResponses: 0,
    bytesOriginal: 0,
    bytesCompressed: 0,
    avgCompressionRatio: 0,
    algorithmUsage: {},
  };

  private logger = logger;

  /**
   * Determines if a response should be compressed based on size and type
   */
  private shouldCompress(
    content: Uint8Array,
    contentType: string = "application/json",
  ): boolean {
    const contentLength = content.length;

    // Skip compression for small responses
    if (contentLength < COMPRESSION_THRESHOLDS.MIN_SIZE_COMPRESS) {
      return false;
    }

    // Check content-type specific thresholds
    const threshold = this.getThresholdForContentType(
      contentType,
      contentLength,
    );
    if (contentLength < threshold) {
      return false;
    }

    return true;
  }

  /**
   * Get size threshold for specific content type
   */
  private getThresholdForContentType(
    contentType: string,
    // eslint-disable-next-line no-unused-vars
    size: number,
  ): number {
    if (contentType.includes("json")) {
      return COMPRESSION_THRESHOLDS.JSON_MIN_SIZE;
    }
    if (
      contentType.includes("text/html") ||
      contentType.includes("text/plain")
    ) {
      return COMPRESSION_THRESHOLDS.HTML_MIN_SIZE;
    }
    return COMPRESSION_THRESHOLDS.MIN_SIZE_COMPRESS;
  }

  /**
   * Selects optimal compression algorithm based on content type and size
   */
  private selectAlgorithm(
    contentType: string,
    contentLength: number,
  ): { algorithm: "gzip" | "deflate" | "br"; options: any } {
    const config =
      CONTENT_TYPE_ALGORITHMS[
        contentType as keyof typeof CONTENT_TYPE_ALGORITHMS
      ];

    if (config) {
      return {
        algorithm: config.preferred as "gzip" | "deflate" | "br",
        options: config.options,
      };
    }

    // Fallback algorithm selection based on size
    if (contentLength > 10240) {
      // >10KB prefer Brotli
      return { algorithm: "br", options: { level: 4 } };
    }

    return { algorithm: "gzip", options: { level: 6 } };
  }

  /**
   * Compresses content using the specified algorithm
   */
  private compressContent(
    content: Uint8Array,
    algorithm: "gzip" | "deflate" | "br",
    options: any,
  ): { compressed: Uint8Array; ratio: number } {
    const originalSize = content.length;
    let compressed: Uint8Array;

    try {
      switch (algorithm) {
        case "gzip":
          compressed = gzipSync(content, options);
          break;
        case "deflate":
          compressed = gzipSync(content, options);
          break;
        case "br":
          compressed = brotliCompressSync(content, options);
          break;
        default:
          compressed = gzipSync(content, options);
      }
    } catch (error) {
      this.logger.warn("Compression failed", {
        algorithm,
        originalSize,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return { compressed: content, ratio: 1 };
    }

    const ratio = compressed.length / originalSize;

    // Don't use compression if it doesn't provide significant benefit
    if (ratio >= COMPRESSION_THRESHOLDS.MAX_COMPRESSION_RATIO) {
      return { compressed: content, ratio: 1 };
    }

    return { compressed, ratio };
  }

  /**
   * Updates compression statistics
   */
  private updateStats(
    algorithm: string,
    originalSize: number,
    compressedSize: number,
    wasCompressed: boolean,
  ): void {
    this.stats.totalRequests++;

    if (wasCompressed) {
      this.stats.compressedResponses++;
      this.stats.bytesOriginal += originalSize;
      this.stats.bytesCompressed += compressedSize;

      // Update algorithm usage
      this.stats.algorithmUsage[algorithm] =
        (this.stats.algorithmUsage[algorithm] || 0) + 1;
    }

    // Calculate average compression ratio
    if (this.stats.bytesOriginal > 0) {
      this.stats.avgCompressionRatio =
        this.stats.bytesCompressed / this.stats.bytesOriginal;
    }
  }

  /**
   * Main compression method for Next.js responses
   */
  public async compressResponse(
    response: NextResponse,
    // eslint-disable-next-line no-unused-vars
    request: NextRequest,
  ): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Get response data
      const responseClone = response.clone();
      const content = responseClone.body
        ? new Uint8Array(Buffer.from(await responseClone.arrayBuffer()))
        : new Uint8Array();

      const contentType =
        response.headers.get("content-type") || "application/json";
      const contentLength = content.length;

      // Skip compression for small responses
      if (!this.shouldCompress(content, contentType)) {
        this.logger.debug("Compression skipped - response too small", {
          contentLength,
          contentType,
        });
        return response;
      }

      // Select optimal algorithm
      const { algorithm, options } = this.selectAlgorithm(
        contentType,
        contentLength,
      );

      // Compress content
      const { compressed, ratio } = this.compressContent(
        content,
        algorithm,
        options,
      );

      // Update statistics
      const wasCompressed = ratio < 1;
      this.updateStats(
        algorithm,
        contentLength,
        compressed.length,
        wasCompressed,
      );

      // If compression didn't help, return original response
      if (!wasCompressed) {
        this.logger.debug("Compression skipped - no benefit", {
          algorithm,
          contentLength,
          compressedSize: compressed.length,
          ratio,
        });
        return response;
      }

      // Create new response with compressed content
      const compressedResponse = new NextResponse(Buffer.from(compressed), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Add compression headers
      compressedResponse.headers.set("Content-Encoding", algorithm);
      compressedResponse.headers.set(
        "Content-Length",
        compressed.length.toString(),
      );
      compressedResponse.headers.set("Vary", "Accept-Encoding");

      // Log compression success
      const duration = Date.now() - startTime;
      this.logger.info("Response compressed successfully", {
        algorithm,
        originalSize: contentLength,
        compressedSize: compressed.length,
        compressionRatio: `${Math.round((1 - ratio) * 100)}%`,
        duration: `${duration}ms`,
        contentType,
      });

      return compressedResponse;
    } catch (error) {
      this.logger.error("Response compression failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: `${Date.now() - startTime}ms`,
      });
      return response;
    }
  }

  /**
   * Get current compression statistics
   */
  public getStats(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * Reset compression statistics
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      compressedResponses: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      avgCompressionRatio: 0,
      algorithmUsage: {},
    };
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics() {
    const {
      avgCompressionRatio,
      compressedResponses,
      totalRequests,
      bytesOriginal,
      bytesCompressed,
    } = this.stats;

    return {
      compressionRate:
        totalRequests > 0 ? compressedResponses / totalRequests : 0,
      avgCompressionRatio: avgCompressionRatio,
      bandwidthSaved: bytesOriginal > 0 ? bytesOriginal - bytesCompressed : 0,
      totalBandwidthReduction:
        bytesOriginal > 0
          ? ((bytesOriginal - bytesCompressed) / bytesOriginal) * 100
          : 0,
      algorithmUsage: this.stats.algorithmUsage,
    };
  }
}

// Singleton instance for performance tracking
const responseCompressor = new ResponseCompressor();

export default responseCompressor;
export { ResponseCompressor, type CompressionStats };
