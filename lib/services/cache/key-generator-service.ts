import crypto from "crypto";
import { NextRequest } from "next/server";
import { SemanticSignatureService } from "../semantic-signature-service";
import type { AIPatternType } from "../ai-pattern-types";

export interface ETagGenerationOptions {
  algorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512';
  includeMetadata?: boolean;
  customSalt?: string;
}

export interface OptimizedCacheKeyOptions {
  service: "iflow" | "tavily";
  input: string;
  pattern?: AIPatternType;
  industryContext?: string;
}

/**
 * Service for generating cache keys with consistent patterns
 * 
 * Consolidated from two previous implementations:
 * - cache/key-generator-service.ts: Comprehensive caching features
 * - cache-key-generator-service.ts: AI/research specific keys with semantic fingerprint
 */
export class CacheKeyGeneratorService {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly STOPWORDS = /\b(a|an|the|for|to|in|on|at|by|with|as|from|that|this|it|is|are|was|were|be|been|being)\b/g;

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
   * Generate optimized cache key for AI/research responses
   * Merged from cache-key-generator-service.ts
   */
  static generateOptimizedCacheKey(options: OptimizedCacheKeyOptions): string {
    const { service, input, pattern, industryContext } = options;
    const normalizedInput = this.normalizeInputForCaching(input);
    const patternPrefix = pattern ? `${pattern}:` : "";
    const industryPrefix = industryContext ? `${industryContext}:` : "";
    const servicePrefix = service === "iflow" ? "ai" : "research";

    const semanticComponents = [
      servicePrefix,
      industryPrefix,
      patternPrefix,
      normalizedInput,
      SemanticSignatureService.extractSemanticSignature(input),
    ].filter(Boolean);

    const semanticHash = crypto
      .createHash("sha256")
      .update(semanticComponents.join(":"))
      .digest("hex")
      .substring(0, 16);

    return `${servicePrefix}-${industryPrefix}${patternPrefix}${semanticHash}`;
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

      if (lowerKey.includes("timestamp") || lowerKey.includes("date")) {
        if (typeof value === "number") {
          normalized[key] = Math.floor(value / 60000) * 60000;
        } else if (value instanceof Date) {
          normalized[key] = new Date(
            Math.floor(value.getTime() / 60000) * 60000,
          ).toISOString();
        }
      }
      else if (lowerKey.includes("limit") || lowerKey.includes("count")) {
        const normalizedLimit = Math.min(
          Math.max(parseInt(String(value)) || 10, 1),
          1000,
        );
        normalized[key] = normalizedLimit;
      }
      else if (lowerKey.includes("model") || lowerKey.includes("ai")) {
        normalized[key] = this.normalizeAIModelName(value);
      }
      else if (typeof value === "string" && value.length > 100) {
        normalized[key] = this.normalizeTextForCache(value);
      }
      else if (lowerKey.includes("url") && typeof value === "string") {
        normalized[key] = this.normalizeUrlForCache(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Normalize input for better cache hit rates
   * Merged and enhanced from cache-key-generator-service.ts
   */
  private static normalizeInputForCaching(input: string): string {
    if (!input) {
      return "";
    }
    return input
      .toLowerCase()
      .replace(this.STOPWORDS, "")
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .trim()
      .substring(0, 200);
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
   * Enhanced with stopword removal from cache-key-generator-service.ts
   */
  private static normalizeTextForCache(text: unknown): string {
    if (typeof text !== "string") {
      return JSON.stringify(text);
    }

    return text
      .toLowerCase()
      .replace(this.STOPWORDS, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);
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
