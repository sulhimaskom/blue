import { SemanticSignatureService } from "./semantic-signature-service";
import type { AIPatternType } from "./ai-pattern-types";
import crypto from "crypto";

/**
 * Cache Key Generator Service
 * Generates optimized cache keys with semantic fingerprinting
 */
export class CacheKeyGeneratorService {
  /**
   * Generate optimized cache key for AI/research responses
   */
  static generateOptimizedCacheKey(
    service: "iflow" | "tavily",
    input: string,
    pattern?: AIPatternType,
    industryContext?: string,
  ): string {
    const normalizedInput =
      CacheKeyGeneratorService.normalizeInputForCaching(input);
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
   * Normalize input for better cache hit rates
   */
  private static normalizeInputForCaching(input: string): string {
    if (!input) {
      return "";
    }
    return input
      .toLowerCase()
      .replace(
        /\b(a|an|the|for|to|in|on|at|by|with|as|from|that|this|it|is|are|was|were|be|been|being)\b/g,
        "",
      )
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .trim()
      .substring(0, 200);
  }
}
