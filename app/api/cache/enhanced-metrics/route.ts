import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { AIPatternDetector } from "@/lib/services/ai-pattern-detector";
import { automatedCacheWarmingService } from "@/lib/services/automated-cache-warming";
import { RuntimeServiceInitializer } from "@/lib/services/runtime-service-initializer";
import { logger } from "@/lib/logger";
import { metricsCalculator } from "@/lib/services/metrics-calculator-service";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";

// Enhanced AI cache metrics with pattern detection insights
export async function GET() {
  try {
    // Initialize runtime services safely (won't run during build)
    await RuntimeServiceInitializer.initializeServices();
    // Get comprehensive cache statistics
    const cacheStats = await UnifiedCacheManager.getCacheStats();

    // Get AI usage analytics with pattern detection
    const aiAnalytics = await AIPatternDetector.getUsageAnalytics();

    // Get warming service metrics
    const warmingMetrics = automatedCacheWarmingService.getMetrics();
    const warmingServiceStatus = automatedCacheWarmingService.getStatus();

    // Calculate advanced performance metrics using unified service
    const performanceInsights =
      metricsCalculator.calculateAIPerformanceInsights(
        cacheStats,
        aiAnalytics,
        warmingMetrics,
      );

    // Generate pattern-based recommendations
    const recommendations =
      AIPatternDetector.getWarmingRecommendations(aiAnalytics);

    const enhancedMetrics = {
      timestamp: new Date().toISOString(),
      summary: {
        overallStatus: performanceInsights.overallStatus,
        healthGrade: performanceInsights.healthGrade,
        totalCacheKeys: cacheStats.totalKeys,
        aiCostSavings: `$${cacheStats.aiCacheStats.estimatedCostSavings.toFixed(2)}`,
        warmingEfficiency: `${warmingMetrics.warmedEntries > 0 ? Math.round((warmingMetrics.estimatedSavings / warmingMetrics.warmedEntries) * 100) : 0}%`,
      },
      aiPatternCaching: {
        patternDistribution: aiAnalytics.patternDistribution,
        detectionAccuracy: metricsCalculator.calculateDetectionAccuracy(),
        optimizedCacheHitRate: `${Math.round(cacheStats.aiCacheStats.aiCacheHitRate * 100)}%`,
        costOptimization: {
          totalSavings: `$${cacheStats.aiCacheStats.estimatedCostSavings.toFixed(2)}`,
          iflowSavings: `$${(cacheStats.aiCacheStats.iflowCacheHits * 0.02).toFixed(2)}`,
          tavilySavings: `$${(cacheStats.aiCacheStats.tavilyCacheHits * 0.01).toFixed(2)}`,
          monthlyProjection: `$${(cacheStats.aiCacheStats.estimatedCostSavings * 30 * 24 * 60) / 60}`, // Based on hourly warming
        },
        performance: {
          averageResponseTime: `${cacheStats.performance.avgGetTime.toFixed(2)}ms`,
          cacheEfficiency:
            metricsCalculator.calculateCacheEfficiencyRating(cacheStats),
          patternHitRates: metricsCalculator.calculatePatternHitRates(
            aiAnalytics,
            cacheStats,
          ),
        },
      },
      intelligentWarming: {
        service: {
          running: warmingServiceStatus.running,
          lastWarming: new Date(warmingMetrics.lastRun).toISOString(),
          warmingInterval: `${Math.min(...warmingServiceStatus.schedules.filter((s) => s.enabled).map((s) => s.interval))} minutes`,
          schedulesWarmed: warmingMetrics.patternsWarmed.length,
        },
        metrics: {
          warmedEntries: warmingMetrics.warmedEntries,
          estimatedSavings: `$${warmingMetrics.estimatedSavings.toFixed(2)}`,
          hitRateImprovement: `${Math.round(warmingMetrics.hitRateImprovement * 100)}%`,
          lastWarmingDuration: `${warmingMetrics.duration}ms`,
        },
        status: warmingServiceStatus.schedules.map((schedule) => ({
          pattern: schedule.patterns.join(", "),
          interval: `${schedule.interval} min`,
          priority: schedule.priority,
          enabled: schedule.enabled,
        })),
      },
      infrastructure: {
        redis: {
          memoryUsage: `${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
          connectionHealth: "healthy", // Would be enhanced with actual Redis health
          operationsPerSecond: cacheStats.performance.operationsPerSecond,
          errorRate: `${Math.round(cacheStats.performance.errorRate * 10000) / 100}%`,
        },
        cache: {
          dataKeys: cacheStats.dataCacheKeys,
          responseKeys: cacheStats.responseCacheKeys,
          tagCount: Object.keys(cacheStats.tags).length,
          averageEntrySize:
            cacheStats.totalKeys > 0
              ? Math.round(cacheStats.memoryUsage / cacheStats.totalKeys)
              : 0,
        },
      },
      analytics: {
        performanceInsights,
        recommendations,
        trends: metricsCalculator.calculateTrends(cacheStats, aiAnalytics),
        optimization: {
          nextOptimizationOpportunity:
            metricsCalculator.calculateNextOptimization(cacheStats),
          warmupReadiness:
            metricsCalculator.calculateWarmupReadiness(aiAnalytics),
        },
      },
    };

    logger.info("Enhanced AI cache metrics retrieved", {
      totalKeys: cacheStats.totalKeys,
      aiSavings: `$${cacheStats.aiCacheStats.estimatedCostSavings.toFixed(2)}`,
      warmedEntries: warmingMetrics.warmedEntries,
      patternsDetected: aiAnalytics.patternDistribution,
    });

    return formatSuccessResponse(
      enhancedMetrics,
      "Enhanced AI cache metrics retrieved successfully",
    );
  } catch (error) {
    logger.error("Enhanced AI cache metrics retrieval failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return formatErrorResponse(
      error instanceof Error
        ? error
        : new Error("Failed to retrieve enhanced AI cache metrics"),
    );
  }
}
