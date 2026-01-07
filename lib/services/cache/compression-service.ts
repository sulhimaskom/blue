import { logger } from "../../logger";

/**
 * Service for compressing and decompressing cached data
 */
export class CacheCompressionService {
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  /**
   * Compress response data if beneficial
   */
  static async compressResponseData(data: any): Promise<any> {
    try {
      const dataString = JSON.stringify(data);

      // Only compress if larger than threshold
      if (dataString.length < this.COMPRESSION_THRESHOLD) {
        return data;
      }

      const compressed = await this.compressObject(data);
      const compressionRatio = (
        ((dataString.length - JSON.stringify(compressed).length) /
          dataString.length) *
        100
      ).toFixed(1);

      logger.debug("Data compressed", {
        originalSize: dataString.length,
        compressedSize: JSON.stringify(compressed).length,
        compressionRatio: `${compressionRatio}%`,
      });

      return compressed;
    } catch (error) {
      logger.error("Compression failed", {
        error: error instanceof Error ? error.message : error,
      });
      return data; // Return uncompressed on failure
    }
  }

  /**
   * Decompress response data
   */
  static async decompressResponseData(
    data: any,
    isCompressed: boolean = false,
  ): Promise<any> {
    try {
      if (!isCompressed || !data.compressed) {
        return data;
      }

      const decompressed = JSON.parse(data.compressed);

      logger.debug("Data decompressed", {
        compressedSize: JSON.stringify(data).length,
        originalSize: JSON.stringify(decompressed).length,
      });

      return decompressed;
    } catch (error) {
      logger.error("Decompression failed", {
        error: error instanceof Error ? error.message : error,
      });
      return data; // Return original on failure
    }
  }

  /**
   * Compress an object using simple compression
   */
  private static compressObject(obj: any): any {
    const dataString = JSON.stringify(obj);

    // Simple compression using run-length encoding for repeated characters
    const compressed = this.runLengthEncode(dataString);

    return {
      compressed,
      originalSize: dataString.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Simple run-length encoding for compression
   */
  private static runLengthEncode(str: string): string {
    if (!str) return str;

    let encoded = "";
    let count = 1;
    let prevChar = str[0];

    for (let i = 1; i < str.length; i++) {
      const char = str[i];

      if (char === prevChar && count < 9) {
        count++;
      } else {
        if (count > 3) {
          encoded += `#${count}${prevChar}`;
        } else {
          encoded += prevChar.repeat(count);
        }
        count = 1;
        prevChar = char;
      }
    }

    // Handle the last run
    if (count > 3) {
      encoded += `#${count}${prevChar}`;
    } else {
      encoded += prevChar.repeat(count);
    }

    return encoded;
  }

  /**
   * Check if compression is beneficial for this data
   */
  static shouldCompress(data: any): boolean {
    try {
      const dataString = JSON.stringify(data);
      return dataString.length >= this.COMPRESSION_THRESHOLD;
    } catch {
      return false;
    }
  }

  /**
   * Estimate compression ratio
   */
  static estimateCompressionRatio(data: any): number {
    try {
      const dataString = JSON.stringify(data);
      const compressed = this.runLengthEncode(dataString);

      return Math.max(0, (1 - compressed.length / dataString.length) * 100);
    } catch {
      return 0;
    }
  }
}
