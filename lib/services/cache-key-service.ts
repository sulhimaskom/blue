/**
 * Atomic service for cache key generation and normalization
 * Extracted from UnifiedCacheManager to follow blueprint.md Service Layer principles
 */
import crypto from "crypto";

export interface CacheKeyOptions {
  keyPrefix?: string;
  includeVersion?: boolean;
  normalizeTime?: boolean;
}

/**
 * Atomic service responsible only for cache key generation and optimization
 * Follows blueprint.md Service Layer principle: Single responsibility, no business logic in UI
 */
export class CacheKeyService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly DEFAULT_VERSION = "v1";

  /**
   * Generate optimized cache key from input parameters with smart hashing
   */
  static generateKey(
    prefix: string,
    data: any,
    options: CacheKeyOptions = {},
  ): string {
    const {
      keyPrefix = this.CACHE_PREFIX,
      includeVersion = true,
      normalizeTime = true,
    } = options;

    // Pre-process data for better cache hits
    const normalizedData = this.normalizeCacheData(data, { normalizeTime });

    // Use XXH3-style hashing for better performance (simulated with SHA256 for compatibility)
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(normalizedData))
      .digest("hex")
      .substring(0, 12); // Reduced from 16 to 12 for better key density

    // Include key version for cache invalidation strategy
    const keyVersion = includeVersion ? this.getKeyVersion(prefix) : "";

    return `${keyPrefix}${prefix}:${hash}:${keyVersion}`;
  }

  /**
   * Normalize cache data to improve hit rates
   * Enhanced with AI-specific patterns and intelligent normalization
   */
  static normalizeCacheData(
    data: any,
    options: { normalizeTime?: boolean } = {},
  ): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const normalized: any = {};
    const sortedKeys = Object.keys(data).sort();

    for (const key of sortedKeys) {
      const value = data[key];

      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      // Enhanced normalization patterns
      const lowerKey = key.toLowerCase();

      // Time-based normalization
      if (options.normalizeTime) {
        if (lowerKey.includes("timestamp") || lowerKey.includes("date")) {
          if (typeof value === "number") {
            // Normalize timestamps to 1-minute buckets
            normalized[key] = Math.floor(value / 60000) * 60000;
            continue;
          } else if (value instanceof Date) {
            normalized[key] = new Date(
              Math.floor(value.getTime() / 60000) * 60000,
            );
            continue;
          }
        }

        // Normalize pagination limits
        if (lowerKey.includes("limit") || lowerKey.includes("count")) {
          const normalizedLimit = Math.min(
            Math.max(parseInt(value) || 10, 1),
            100, // Cap at reasonable maximum
          );
          normalized[key] = normalizedLimit;
          continue;
        }
      }

      // AI model normalization for better caching
      if (lowerKey.includes("model") || lowerKey.includes("ai")) {
        normalized[key] = this.normalizeAIModelName(value);
        continue;
      }

      // Text normalization
      if (typeof value === "string" && value.length > 200) {
        normalized[key] = this.normalizeTextForCache(value);
        continue;
      }

      // URL normalization
      if (
        typeof value === "string" &&
        (value.startsWith("http") || value.startsWith("/"))
      ) {
        normalized[key] = this.normalizeUrlForCache(value);
        continue;
      }

      // Default: keep original value
      normalized[key] = value;
    }

    return normalized;
  }

  /**
   * Normalizes AI model names for better cache hits
   */
  static normalizeAIModelName(model: any): string {
    if (!model || typeof model !== "string") {
      return model;
    }

    // Handle common model pattern variations
    return model
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/gpt-?3\.?5/g, "gpt-3.5")
      .replace(/gpt-?4/g, "gpt-4")
      .replace(/claude-?3/g, "claude-3");
  }

  /**
   * Normalizes long text for better cache efficiency
   */
  static normalizeTextForCache(text: any): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    // Remove excessive whitespace and normalize line endings
    return text.replace(/\s+/g, " ").replace(/\n+/g, "\\n").trim();
  }

  /**
   * Normalizes URLs for consistent caching
   */
  static normalizeUrlForCache(url: any): string {
    if (!url || typeof url !== "string") {
      return url;
    }

    try {
      const parsed = new URL(url);

      // Remove query parameters that don't affect cache key
      const paramsToRemove = ["timestamp", "t", "_t", "cache", "nocache"];
      paramsToRemove.forEach((param) => parsed.searchParams.delete(param));

      return parsed.toString();
    } catch {
      // Not a valid URL, return as-is
      return url;
    }
  }

  /**
   * Gets key version for cache invalidation strategy
   */
  static getKeyVersion(prefix: string): string {
    // Different prefix patterns may need different versions
    // This allows for cache invalidation without changing all existing keys
    const versionMap: Record<string, string> = {
      "ai-response": "v1",
      "user-blueprint": "v1",
      "project-stats": "v2", // Updated version for new schema
      "metrics-summary": "v1",
      "health-check": "v1",
    };

    return versionMap[prefix] || this.DEFAULT_VERSION;
  }

  /**
   * Generate optimized response key for HTTP caching
   */
  static generateResponseKey(
    request: Request | any,
    varyBy: string[] = [],
  ): string {
    const url = new URL(request.url);
    const baseKey = `${url.pathname}${url.search}`;

    if (varyBy.length === 0) {
      return this.generateKey("response", baseKey);
    }

    // Include vary-by headers in key
    const varyData: any = { url: baseKey };
    for (const header of varyBy) {
      const value = request.headers?.get?.(header);
      if (value) {
        varyData[header] = value;
      }
    }

    return this.generateKey("response", varyData);
  }

  /**
   * Generate ETag for cache validation
   */
  static generateETag(data: any): string {
    const fingerprint = this.calculateContentFingerprint(data);
    return `"${fingerprint}"`;
  }

  /**
   * Calculate content fingerprint for ETag generation
   */
  static calculateContentFingerprint(data: any): string {
    const serialized = JSON.stringify(data);
    return crypto
      .createHash("sha256")
      .update(serialized)
      .digest("hex")
      .substring(0, 16);
  }
}
