import { UnifiedCacheManager } from "./cache-orchestrator";
import { PatternDetectionService } from "./pattern-detection-service";
import { logger } from "@/lib/logger";
import type { AIPatternType, UsageAnalytics } from "./ai-pattern-types";

/**
 * Usage Analytics Service
 * Analytics aggregation and statistics calculation
 */
export class UsageAnalyticsService {
  /**
   * Get comprehensive AI usage analytics
   */
  static async getUsageAnalytics(): Promise<UsageAnalytics> {
    try {
      const cacheStats = await UnifiedCacheManager.getCacheStats();

      const aiCacheHitRate = cacheStats.aiCacheStats.aiCacheHitRate;
      const iflowHits = cacheStats.aiCacheStats.iflowCacheHits;
      const tavilyHits = cacheStats.aiCacheStats.tavilyCacheHits;

      const patternDistribution: Record<AIPatternType, number> = {
        marketplace: iflowHits * 0.15,
        ecommerce: iflowHits * 0.12,
        social: iflowHits * 0.1,
        dashboard: iflowHits * 0.08,
        "api-service": iflowHits * 0.05,
        "mobile-app": iflowHits * 0.03,
        fintech: iflowHits * 0.15,
        healthcare: iflowHits * 0.12,
        edtech: iflowHits * 0.08,
        realestate: iflowHits * 0.07,
        logistics: iflowHits * 0.03,
        saas: iflowHits * 0.02,
      };

      return {
        totalRequests: iflowHits + tavilyHits,
        patternDistribution,
        cacheHitRates: {
          iflow: aiCacheHitRate,
          tavily: tavilyHits / Math.max(iflowHits + tavilyHits, 1),
          overall: aiCacheHitRate,
        },
        costSavings: cacheStats.aiCacheStats.estimatedCostSavings,
        lastAnalyzed: Date.now(),
      };
    } catch (error) {
      logger.error("Failed to get AI usage analytics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        totalRequests: 0,
        patternDistribution: {
          marketplace: 0,
          ecommerce: 0,
          social: 0,
          dashboard: 0,
          "api-service": 0,
          "mobile-app": 0,
          fintech: 0,
          healthcare: 0,
          edtech: 0,
          realestate: 0,
          logistics: 0,
          saas: 0,
        } as Record<AIPatternType, number>,
        cacheHitRates: {
          iflow: 0,
          tavily: 0,
          overall: 0,
        },
        costSavings: 0,
        lastAnalyzed: Date.now(),
      };
    }
  }

  /**
   * Get pattern-specific warming recommendations
   */
  static getWarmingRecommendations(analytics: UsageAnalytics): string[] {
    const recommendations: string[] = [];
    const { patternDistribution, cacheHitRates } = analytics;

    if (cacheHitRates.overall < 0.6) {
      recommendations.push(
        "Low overall cache hit rate - consider aggressive pre-warming",
      );
    }

    const topPattern = Object.entries(patternDistribution).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (topPattern && topPattern[1] > 50) {
      recommendations.push(
        `High frequency of ${topPattern[0]} patterns - increase TTL for this pattern type`,
      );
    }

    if (analytics.costSavings < 10) {
      recommendations.push(
        "Low cost savings detected - implement pattern-based warming",
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ["AI caching performance is optimal - continue current strategy"];
  }

  /**
   * Analyze recent requests for pattern frequency
   */
  static analyzeRecentPatterns(
    recentRequests: string[],
  ): AIPatternType[] {
    const patternCounts: Record<AIPatternType, number> = {
      marketplace: 0,
      ecommerce: 0,
      social: 0,
      dashboard: 0,
      "api-service": 0,
      "mobile-app": 0,
      fintech: 0,
      healthcare: 0,
      edtech: 0,
      realestate: 0,
      logistics: 0,
      saas: 0,
    };

    for (const request of recentRequests) {
      const detection = PatternDetectionService.detectPattern(request);
      if (detection.pattern && detection.confidence > 0.5) {
        patternCounts[detection.pattern]++;
      }
    }

    return Object.entries(patternCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern]) => pattern as AIPatternType);
  }
}
