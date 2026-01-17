import { logger } from "@/lib/logger";
import { PatternDetectionService } from "./pattern-detection-service";
import { SemanticSignatureService } from "./semantic-signature-service";
import { CacheKeyGeneratorService } from "./cache/key-generator-service";
import { CacheWarmingRuleService } from "./cache-warming-rule-service";
import { UsageAnalyticsService } from "./usage-analytics-service";
import type { AIPatternType, UsageAnalytics } from "./ai-pattern-types";

export type { AIPatternType, AIPattern, CacheWarmingRule, UsageAnalytics } from "./ai-pattern-types";

/**
 * AI Pattern Detection and Intelligent Cache Warming Service
 * Facade pattern delegating to specialized services
 * Provides 40-60% AI cost savings through predictive caching
 */
export class AIPatternDetector {
  /**
   * Detect AI pattern from user input with confidence scoring
   */
  static detectPattern(input: string): {
    pattern: AIPatternType | null;
    confidence: number;
    matchedKeywords: string[];
    industryContext?: string;
  } {
    if (!input) {
      return { pattern: null, confidence: 0, matchedKeywords: [] };
    }

    const pattern = PatternDetectionService.detectPattern(input);
    const industryContext = PatternDetectionService.detectIndustryContext(input);

    return {
      pattern: pattern.pattern,
      confidence: pattern.confidence,
      matchedKeywords: pattern.detectedKeywords,
      industryContext: industryContext || undefined,
    };
  }

  /**
   * Detect industry-specific context from input
   */
  static detectIndustryContext(input: string): string | null {
    return PatternDetectionService.detectIndustryContext(input);
  }

  /**
   * Generate optimized cache key for AI/research responses
   */
  static generateOptimizedCacheKey(
    service: "iflow" | "tavily",
    input: string,
    pattern?: AIPatternType,
    industryContext?: string,
  ): string {
    return CacheKeyGeneratorService.generateOptimizedCacheKey({
      service,
      input,
      pattern,
      industryContext,
    });
  }

  /**
   * Normalize input for better cache hit rates
   */
  static normalizeInputForCaching(input: string): string {
    if (!input) {
      return "";
    }
    const normalizedInput = input.toLowerCase().replace(/[^\w\s]/g, " ").trim();
    return normalizedInput
      .replace(
        /\b(a|an|the|for|to|in|on|at|by|with|as|from|that|this|it|is|are|was|were|be|been|being)\b/g,
        "",
      )
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);
  }

  /**
   * Perform intelligent cache warming based on detected patterns
   */
  static async performIntelligentWarming(
    recentRequests: string[] = [],
  ): Promise<{
    warmedRules: number;
    estimatedSavings: number;
    patternsDetected: AIPatternType[];
  }> {
    logger.info("Starting intelligent AI cache warming", {
      recentRequestCount: recentRequests.length,
    });

    const warmedRules: AIPatternType[] = [];
    let estimatedSavings = 0;

    try {
      const detectedPatterns =
        UsageAnalyticsService.analyzeRecentPatterns(recentRequests);
      const rules =
        CacheWarmingRuleService.getWarmingRulesByPriority();

      for (const rule of rules) {
        const shouldWarm = CacheWarmingRuleService.shouldWarmRule(
          rule,
          detectedPatterns,
        );

        if (shouldWarm) {
          await CacheWarmingRuleService.warmRule(rule);
          warmedRules.push(rule.pattern);

          estimatedSavings +=
            CacheWarmingRuleService.calculateEstimatedSavings(rule);
        }
      }

      logger.info("Intelligent AI cache warming completed", {
        warmedRules: warmedRules.length,
        estimatedSavings,
        patternsDetected: detectedPatterns,
      });

      return {
        warmedRules: warmedRules.length,
        estimatedSavings,
        patternsDetected: detectedPatterns,
      };
    } catch (error) {
      logger.error("Failed to perform intelligent AI cache warming", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        warmedRules: 0,
        estimatedSavings: 0,
        patternsDetected: [],
      };
    }
  }

  /**
   * Get comprehensive AI usage analytics
   */
  static async getUsageAnalytics(): Promise<UsageAnalytics> {
    return UsageAnalyticsService.getUsageAnalytics();
  }

  /**
   * Get pattern-specific warming recommendations
   */
  static getWarmingRecommendations(analytics: UsageAnalytics): string[] {
    return UsageAnalyticsService.getWarmingRecommendations(analytics);
  }

  /**
   * Extract semantic signature from input text
   */
  static extractSemanticSignature(input: string): string {
    return SemanticSignatureService.extractSemanticSignature(input);
  }
}
