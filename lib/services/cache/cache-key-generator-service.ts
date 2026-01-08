import crypto from "crypto";

/**
 * Service responsible for generating cache keys and related key operations
 * Extracted from UnifiedCacheManager for better modularity and testability
 */
export class CacheKeyGeneratorService {
  private static readonly CACHE_PREFIX = "ai-platform:";

  /**
   * Generate a cache key based on prefix and data
   */
  static generateKey(prefix: string, data: any): string {
    const dataHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    return `${this.CACHE_PREFIX}${prefix}:${dataHash}`;
  }

  /**
   * Normalize cache data for consistent key generation
   */
  static normalizeCacheData(data: any): any {
    if (data === null || data === undefined) {
      return "";
    }

    if (typeof data === "object") {
      if (Array.isArray(data)) {
        return data.map((item) => this.normalizeCacheData(item)).sort();
      }

      const sorted = Object.keys(data)
        .sort()
        .reduce((result, key) => {
          result[key] = this.normalizeCacheData(data[key]);
          return result;
        }, {} as any);

      return sorted;
    }

    return data;
  }

  /**
   * Normalize AI model names for consistent caching
   */
  static normalizeAIModelName(model: any): string {
    if (!model || typeof model !== "string") {
      return "default";
    }
    return model.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

  /**
   * Normalize text content for cache keys
   */
  static normalizeTextForCache(text: any): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    return text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  /**
   * Normalize URLs for cache keys
   */
  static normalizeUrlForCache(url: any): string {
    if (!url || typeof url !== "string") {
      return "/";
    }

    try {
      const urlObj = new URL(url);
      return `${urlObj.pathname}${urlObj.search}`;
    } catch {
      return url.replace(/[^a-zA-Z0-9\/\-\_\.]/g, "");
    }
  }

  /**
   * Get key version for cache invalidation
   */
  static getKeyVersion(prefix: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${prefix}:v:${timestamp}:${random}`;
  }

  /**
   * Generate response cache key
   */
  static generateResponseKey(
    url: string,
    method: string = "GET",
    headers?: Record<string, string>,
  ): string {
    const keyData = {
      url: this.normalizeUrlForCache(url),
      method: method.toUpperCase(),
      headers: headers || {},
    };

    return this.generateKey("response", keyData);
  }

  /**
   * Generate ETag for cache validation
   */
  static generateETag(data: any): string {
    if (!data) {
      return '"0-0"';
    }

    const fingerprint = this.calculateContentFingerprint(data);
    const size = Buffer.byteLength(JSON.stringify(data), "utf8");
    return `"${size}-${fingerprint}"`;
  }

  /**
   * Calculate content fingerprint for ETag generation
   */
  private static calculateContentFingerprint(data: any): string {
    const normalized = this.normalizeCacheData(data);
    return crypto
      .createHash("md5")
      .update(JSON.stringify(normalized))
      .digest("hex")
      .substring(0, 8);
  }
}
