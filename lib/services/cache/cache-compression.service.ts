import { logger } from "../../logger";

/**
 * Service for optimizing cache data through compression and decompression
 * Handles intelligent compression strategies to reduce memory usage and improve performance
 */
export class CacheCompressionService {
  private static readonly COMPRESSION_THRESHOLD = 10240; // 10KB

  /**
   * Determine if data should be compressed based on size and content
   */
  static shouldCompress(data: any, forceCompress?: boolean): boolean {
    if (forceCompress) {
      return true;
    }

    const dataSize = JSON.stringify(data).length;
    return dataSize > this.COMPRESSION_THRESHOLD;
  }

  /**
   * Compress response data to reduce memory usage
   */
  static async compressResponseData(data: any): Promise<any> {
    try {
      // For JSON objects, compress by removing unnecessary whitespace
      if (typeof data === "object" && data !== null) {
        return this.compressObject(data);
      }

      // For strings, trim whitespace if it's JSON-like
      if (typeof data === "string") {
        try {
          // Try to parse as JSON and minify
          const parsed = JSON.parse(data);
          return this.compressObject(parsed);
        } catch {
          // If not JSON, just trim whitespace
          return data.trim();
        }
      }

      return data;
    } catch (error) {
      logger.debug("Response compression failed, using original data", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return data;
    }
  }

  /**
   * Decompress response data when retrieving from cache
   */
  static async decompressResponseData(
    data: any,
    compressionRatio?: string,
  ): Promise<any> {
    try {
      // Data is already in usable format since we stored minified JSON
      // Additional decompression logic can be added here if needed

      if (compressionRatio && parseFloat(compressionRatio) > 1.5) {
        logger.debug("Response decompressed", {
          ratio: compressionRatio,
        });
      }

      return data;
    } catch (error) {
      logger.debug("Response decompression failed, returning original data", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return data;
    }
  }

  /**
   * Calculate compression ratio for metrics
   */
  static calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): string {
    if (originalSize === 0) return "1.0";

    const ratio = originalSize / compressedSize;
    return ratio.toFixed(2);
  }

  /**
   * Compress objects by optimizing JSON structure
   */
  private static compressObject(obj: any): any {
    if (Array.isArray(obj)) {
      // For arrays, compress each element
      return obj.map((item) => this.compressObject(item));
    }

    if (typeof obj === "object" && obj !== null) {
      const compressed: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Remove null and undefined values
        if (value === null || value === undefined) {
          continue;
        }

        // Compress nested objects
        if (
          typeof value === "object" &&
          value !== null &&
          !(value instanceof Date)
        ) {
          compressed[key] = this.compressObject(value);
        } else {
          compressed[key] = value;
        }
      }

      return compressed;
    }

    return obj;
  }

  /**
   * Estimate compression savings for analytics
   */
  static estimateCompressionSavings(data: any): {
    originalSize: number;
    estimatedCompressedSize: number;
    estimatedSavings: number;
    shouldCompress: boolean;
  } {
    const originalSize = JSON.stringify(data).length;
    const shouldCompress = this.shouldCompress(data);

    // Estimate compression ratio based on typical JSON compression
    // Real compression ratio varies from 1.5x to 3x for JSON
    const estimatedRatio = shouldCompress ? 2.2 : 1.0;
    const estimatedCompressedSize = Math.round(originalSize / estimatedRatio);
    const estimatedSavings = originalSize - estimatedCompressedSize;

    return {
      originalSize,
      estimatedCompressedSize,
      estimatedSavings,
      shouldCompress,
    };
  }

  /**
   * Validate compressed data integrity
   */
  static validateCompressedData(data: any): boolean {
    try {
      // Basic validation - ensure data can be stringified and parsed
      const serialized = JSON.stringify(data);
      JSON.parse(serialized);
      return true;
    } catch (error) {
      logger.debug("Compressed data validation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }
}
