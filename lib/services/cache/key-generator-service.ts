import crypto from "crypto";
import { NextRequest } from "next/server";


/**
 * Service for generating cache keys with consistent patterns
 */
export class CacheKeyGeneratorService {
  private static readonly CACHE_PREFIX = "ai-platform:";

  /**
   * Generate standardized cache key
   */
  static generateKey(prefix: string, data: unknown): string {
    const normalizedData = this.normalizeCacheData(data);
    const dataString = JSON.stringify(normalizedData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");
    const keyVersion = this.getKeyVersion(prefix);

    return `${this.CACHE_PREFIX}${prefix}:${keyVersion}:${hash}`;
  }

  /**
   * Generate response-specific cache key
   */
  static generateResponseKey(
    request: NextRequest,
    varyBy: string[] = [],
  ): string {
    const url = request.url;
    const method = request.method;

    // Add varying headers to key
    const varyData: Record<string, unknown> = { url, method };
    for (const header of varyBy) {
      const value = request.headers.get(header);
      if (value) varyData[header] = value;
    }

    const dataString = JSON.stringify(varyData);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");

    return `${this.CACHE_PREFIX}response:${hash}`;
  }

  /**
   * Generate ETag for cache validation
   */
  static generateETag(data: unknown, options: ETagGenerationOptions = {}): string {
    const algorithm = options.algorithm || 'md5';
    const hash = crypto.createHash(algorithm);
    
    if (options.includeMetadata) {
      const metadata = {
        timestamp: Date.now(),
        ...(options.customSalt && { salt: options.customSalt })
      };
      hash.update(JSON.stringify({ data, metadata }));
    } else {
      hash.update(JSON.stringify(data));
    }
    
    return hash.digest("hex");
  }

  /**
   * Calculate content fingerprint for cache validation
   */
  static calculateContentFingerprint(data: unknown): string {
    const contentString =
      typeof data === "string" ? data : JSON.stringify(data);
    const hash = crypto
      .createHash("sha256")
      .update(contentString)
      .digest("hex");
    return `fp:${hash.substring(0, 16)}`;
  }

  /**
   * Normalize cache data for consistent keys
   */
  private static normalizeCacheData(data: unknown): unknown {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const normalized: Record<string, unknown> = {};
    const sortedKeys = Object.keys(data as Record<string, unknown>).sort();

    for (const key of sortedKeys) {
      let value = (data as Record<string, unknown>)[key];

      if (value === undefined) {
        continue;
      }

      const lowerKey = key.toLowerCase();

      // Normalize timestamps to minute precision
      if (lowerKey.includes("timestamp") || lowerKey.includes("date")) {
        if (typeof value === "number") {
          normalized[key] = Math.floor(value / 60000) * 60000;
        } else if (value instanceof Date) {
          normalized[key] = new Date(
            Math.floor(value.getTime() / 60000) * 60000,
          ).toISOString();
        }
      }
      // Normalize limits and counts
      else if (lowerKey.includes("limit") || lowerKey.includes("count")) {
        const normalizedLimit = Math.min(
          Math.max(parseInt(String(value)) || 10, 1),
          1000,
        );
        normalized[key] = normalizedLimit;
      }
      // Normalize AI model names
      else if (lowerKey.includes("model") || lowerKey.includes("ai")) {
        normalized[key] = this.normalizeAIModelName(value);
      }
      // Normalize text content
      else if (typeof value === "string" && value.length > 100) {
        normalized[key] = this.normalizeTextForCache(value);
      }
      // Normalize URLs
      else if (lowerKey.includes("url") && typeof value === "string") {
        normalized[key] = this.normalizeUrlForCache(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Normalize AI model names for consistency
   */
  private static normalizeAIModelName(model: unknown): string {
    if (typeof model !== "string") {
      return JSON.stringify(model);
    }

    const normalized = model
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    return normalized;
  }

  /**
   * Normalize text content for caching
   */
  private static normalizeTextForCache(text: unknown): string {
    if (typeof text !== "string") {
      return JSON.stringify(text);
    }

    // Normalize whitespace and case for cache keys
    return text.trim().toLowerCase().replace(/\s+/g, " ").substring(0, 200); // Limit length for cache keys
  }

  /**
   * Normalize URLs for caching
   */
  private static normalizeUrlForCache(url: unknown): string {
    if (typeof url !== "string") {
      return JSON.stringify(url);
    }

    try {
      const urlObj = new URL(url);
      // Remove query parameters that don't affect caching
      const paramsToDelete = ["timestamp", "_t", "cache", "v"];
      paramsToDelete.forEach((param) => urlObj.searchParams.delete(param));

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Get key version for cache invalidation
   */
  private static getKeyVersion(prefix: string): string {
    // Simple versioning strategy - can be enhanced
    const versions: Record<string, string> = {
      "ai-response": "v1",
      "api-response": "v1",
      blueprint: "v1",
      "user-data": "v1",
      metrics: "v1",
    };

    return versions[prefix] || "v1";
  }
}
