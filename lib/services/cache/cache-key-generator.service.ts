import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Service for generating and managing cache keys with intelligent normalization
 * Handles key generation, normalization, and ETag creation for optimal cache hit rates
 */
export class CacheKeyGeneratorService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly RESPONSE_PREFIX = "response:";

  /**
   * Generate optimized cache key from input parameters with smart hashing
   */
  static generateKey(prefix: string, data: any): string {
    // Pre-process data for better cache hits
    const normalizedData = this.normalizeCacheData(data);

    // Use XXH3-style hashing for better performance (simulated with SHA256 for compatibility)
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(normalizedData))
      .digest("hex")
      .substring(0, 12); // Reduced from 16 to 12 for better key density

    // Include key version for cache invalidation strategy
    const keyVersion = this.getKeyVersion(prefix);

    return `${this.CACHE_PREFIX}${prefix}:${hash}:${keyVersion}`;
  }

  /**
   * Generate cache key for HTTP responses
   */
  static generateResponseKey(req: NextRequest, varyBy: string[] = []): string {
    const url = new URL(req.url);
    const keyComponents = [
      url.pathname,
      url.search,
      ...varyBy.map((header) => `${header}:${req.headers.get(header) || ""}`),
    ];

    const keyString = keyComponents.join("|");
    const hash = crypto
      .createHash("sha256")
      .update(keyString)
      .digest("hex")
      .substring(0, 16);

    return `${this.RESPONSE_PREFIX}${hash}`;
  }

  /**
   * Generate optimized ETag with content fingerprinting for better cache hit rates
   */
  static generateETag(data: any): string {
    const content = JSON.stringify(data);
    const size = content.length;
    const contentFingerprint = this.calculateContentFingerprint(data);

    // Enhanced ETag with fingerprint and size for better cache optimization
    return `"${contentFingerprint}-${Math.floor(size / 1024)}kb"`;
  }

  /**
   * Get key version for cache invalidation strategy
   */
  static getKeyVersion(prefix: string): string {
    const versionMap: Record<string, string> = {
      "iflow-completion": "v1",
      "tavily-research": "v1",
      "blueprint-draft": "v2",
      "market-analysis": "v1",
      "cache-warmup": "v3",
      "blueprint-skeleton": "v2",
      "tech-stack": "v1",
      "feature-templates": "v1",
    };

    return versionMap[prefix] || "v1";
  }

  /**
   * Normalize cache data to improve hit rates
   * Enhanced with AI-specific patterns and intelligent normalization
   */
  private static normalizeCacheData(data: any): any {
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
      if (lowerKey.includes("timestamp") || lowerKey.includes("date")) {
        // Round timestamps to nearest minute for better cache hits
        if (typeof value === "number") {
          normalized[key] = Math.floor(value / 60000) * 60000;
        } else if (value instanceof Date) {
          normalized[key] = new Date(
            Math.floor(value.getTime() / 60000) * 60000,
          );
        } else {
          normalized[key] = value;
        }
      }
      // Pagination and limits normalization
      else if (lowerKey.includes("limit") || lowerKey.includes("count")) {
        // Normalize common limit values to standard ranges
        const normalizedLimit = Math.min(
          Math.max(parseInt(value) || 10, 1),
          100,
        );
        // Round to common pagination sizes
        normalized[key] =
          normalizedLimit <= 10
            ? 10
            : normalizedLimit <= 25
              ? 25
              : normalizedLimit <= 50
                ? 50
                : 100;
      }
      // AI-specific parameters
      else if (lowerKey.includes("model") || lowerKey.includes("ai")) {
        // Normalize AI model names for better cache hits
        normalized[key] = this.normalizeAIModelName(value);
      }
      // Search queries and text normalization
      else if (
        lowerKey.includes("query") ||
        lowerKey.includes("search") ||
        lowerKey.includes("prompt")
      ) {
        // Normalize text for better cache hits
        normalized[key] = this.normalizeTextForCache(value);
      }
      // URL and endpoint normalization
      else if (lowerKey.includes("url") || lowerKey.includes("endpoint")) {
        normalized[key] = this.normalizeUrlForCache(value);
      }
      // Numeric ranges normalization
      else if (lowerKey.includes("page")) {
        normalized[key] = Math.max(parseInt(value) || 1, 1);
      }
      // Boolean normalization
      else if (typeof value === "boolean") {
        normalized[key] = value;
      }
      // Array normalization - sort for consistency
      else if (Array.isArray(value)) {
        normalized[key] = value.sort();
      }
      // Default case - preserve value
      else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Normalize AI model names for better cache hits
   */
  private static normalizeAIModelName(model: any): string {
    if (!model || typeof model !== "string") {
      return model;
    }

    const normalized = model.toLowerCase().trim();

    // Map common model variations to canonical names
    const modelMappings: Record<string, string> = {
      "gpt-4": "gpt-4",
      gpt4: "gpt-4",
      "gpt-3.5-turbo": "gpt-3.5-turbo",
      "gpt3.5": "gpt-3.5-turbo",
      "claude-3": "claude-3",
      claude3: "claude-3",
      "iflow-gpt4": "iflow-gpt-4",
      "iflow-gpt-4": "iflow-gpt-4",
    };

    return modelMappings[normalized] || normalized;
  }

  /**
   * Normalize text for cache optimization
   */
  private static normalizeTextForCache(text: any): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    // Trim whitespace and normalize spacing
    let normalized = text.trim().replace(/\s+/g, " ");

    // Convert to lowercase if it's a search query or simple text
    if (normalized.length < 100) {
      normalized = normalized.toLowerCase();
    }

    // Remove very common stop words for search queries
    if (normalized.includes(" ")) {
      const stopWords = new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
      ]);
      normalized = normalized
        .split(" ")
        .filter((word) => !stopWords.has(word))
        .join(" ")
        .trim();
    }

    return normalized;
  }

  /**
   * Normalize URLs for cache consistency
   */
  private static normalizeUrlForCache(url: any): string {
    if (!url || typeof url !== "string") {
      return url;
    }

    try {
      const urlObj = new URL(url);
      // Sort query parameters for consistency
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();

      Array.from(params.keys())
        .sort()
        .forEach((key) => {
          sortedParams.set(key, params.get(key) || "");
        });

      urlObj.search = sortedParams.toString();
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Calculate content fingerprint for ETag optimization
   * Uses selective content hashing for improved performance
   */
  private static calculateContentFingerprint(data: any): string {
    try {
      // For objects, use key structure and sample values for fingerprinting
      if (typeof data === "object" && data !== null) {
        const keys = Object.keys(data).sort();
        const timestamp = data.timestamp || data.createdAt;
        const type = data.type || typeof data;

        // Create lightweight fingerprint from structure and timestamp
        const structure = `${keys.join(",")}-${type}-${timestamp || ""}`;

        return crypto
          .createHash("sha1") // Faster than MD5 for this use case
          .update(structure)
          .digest("hex")
          .substring(0, 8); // Shorter hash for efficiency
      } else {
        // For primitives, use quick content fingerprinting
        return crypto
          .createHash("sha1")
          .update(String(data))
          .digest("hex")
          .substring(0, 8);
      }
    } catch (error) {
      // Fallback to full MD5 hash if fingerprinting fails
      return crypto
        .createHash("md5")
        .update(JSON.stringify(data))
        .digest("hex")
        .substring(0, 12);
    }
  }
}
