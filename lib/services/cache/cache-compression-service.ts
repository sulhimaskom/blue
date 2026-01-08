import { logger } from "../../logger";

/**
 * Service responsible for cache data compression and decompression operations
 * Extracted from UnifiedCacheManager for better modularity and testability
 */
export class CacheCompressionService {
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private static readonly COMPRESSION_ENABLED = true;

  /**
   * Compress response data if it meets compression criteria
   */
  static async compressResponseData(data: any): Promise<any> {
    try {
      if (!this.COMPRESSION_ENABLED) {
        return data;
      }

      const dataSize = Buffer.byteLength(JSON.stringify(data), "utf8");

      if (dataSize < this.COMPRESSION_THRESHOLD) {
        return data;
      }

      const compressed = this.compressObject(data);

      logger.debug("Data compressed", {
        originalSize: dataSize,
        compressedSize: Buffer.byteLength(JSON.stringify(compressed), "utf8"),
        compressionRatio:
          (
            ((dataSize -
              Buffer.byteLength(JSON.stringify(compressed), "utf8")) /
              dataSize) *
            100
          ).toFixed(2) + "%",
      });

      return {
        ...compressed,
        _compressed: true,
        _originalSize: dataSize,
      };
    } catch (error) {
      logger.warn("Compression failed, using original data", { error });
      return data;
    }
  }

  /**
   * Compress an object using simple compression algorithm
   */
  static compressObject(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.compressObject(item));
    }

    const compressed: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.length > 50) {
        // Simple string compression - can be enhanced with proper compression library
        compressed[key] = value.replace(/\s+/g, " ").trim();
      } else {
        compressed[key] = value;
      }
    }

    return compressed;
  }

  /**
   * Decompress response data if it was compressed
   */
  static async decompressResponseData(data: any): Promise<any> {
    try {
      if (!data || typeof data !== "object" || !data._compressed) {
        return data;
      }

      logger.debug("Decompressing cached data", {
        compressedSize: Buffer.byteLength(JSON.stringify(data), "utf8"),
        originalSize: data._originalSize,
      });

      // Remove compression metadata
      // eslint-disable-next-line no-unused-vars
      const { _compressed, _originalSize, ...originalData } = data;
      return originalData;
    } catch (error) {
      logger.warn("Decompression failed, returning original data", { error });
      return data;
    }
  }

  /**
   * Check if data should be compressed based on size and type
   */
  static shouldCompress(data: any): boolean {
    if (!this.COMPRESSION_ENABLED) {
      return false;
    }

    if (typeof data !== "object" || data === null) {
      return false;
    }

    const dataSize = Buffer.byteLength(JSON.stringify(data), "utf8");
    return dataSize >= this.COMPRESSION_THRESHOLD;
  }

  /**
   * Calculate compression ratio for metrics
   */
  static calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Get compression statistics
   */
  static getCompressionInfo() {
    return {
      enabled: this.COMPRESSION_ENABLED,
      threshold: this.COMPRESSION_THRESHOLD,
      algorithm: "simple-space-optimization",
    };
  }
}
