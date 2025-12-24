import { NextResponse } from "next/server";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { redisManager } from "@/lib/redis";
import { logger } from "@/lib/logger";

// Enhanced cache monitoring endpoint with advanced analytics
export async function GET() {
  try {
    // Get comprehensive cache statistics with performance metrics
    const cacheStats = await UnifiedCacheManager.getCacheStats();
    const redisMetrics = redisManager.getPerformanceMetrics();
    const redisHealth = await redisManager.healthCheck();

    // Calculate detailed efficiency metrics
    const efficiency = {
      hitRatePercent: Math.round(cacheStats.hitRate * 100),
      expectedSavings: calculateCostSavings(
        cacheStats.aiCacheStats.estimatedCostSavings,
      ),
      performanceImprovement: calculatePerformanceImprovement(
        cacheStats.hitRate,
      ),
      aiCostSavings: `$${cacheStats.aiCacheStats.estimatedCostSavings.toFixed(2)}`,
      aiHitRatePercent: Math.round(
        cacheStats.aiCacheStats.aiCacheHitRate * 100,
      ),
    };

    // Advanced performance analytics
    const performance = {
      ...cacheStats.performance,
      redisPerformance: {
        operationsPerSecond: redisMetrics.operationMetrics.throughput,
        avgResponseTime: redisMetrics.operationMetrics.avgResponseTime,
        p95ResponseTime: redisMetrics.operationMetrics.p95ResponseTime,
        p99ResponseTime: redisMetrics.operationMetrics.p99ResponseTime,
        errorRate:
          Math.round(redisMetrics.operationMetrics.errorRate * 10000) / 100, // Convert to percentage
        connectionUtilization: Math.round(
          redisMetrics.connectionMetrics.utilizationRate * 100,
        ),
      },
      cacheEfficiency: {
        memoryEfficiency: calculateMemoryEfficiency(
          cacheStats.memoryUsage,
          cacheStats.totalKeys,
        ),
        keyDistribution: calculateKeyDistribution(
          cacheStats.dataCacheKeys,
          cacheStats.responseCacheKeys,
        ),
        tagUtilization: Object.keys(cacheStats.tags).length,
      },
    };

    const monitoringData = {
      timestamp: new Date().toISOString(),
      summary: {
        status: determineOverallStatus(
          redisHealth,
          efficiency.hitRatePercent,
          performance.redisPerformance.errorRate,
        ),
        healthGrade: calculateHealthGrade(
          efficiency.hitRatePercent,
          performance.redisPerformance.errorRate,
        ),
      },
      cache: {
        storage: {
          totalKeys: cacheStats.totalKeys,
          dataCacheKeys: cacheStats.dataCacheKeys,
          responseCacheKeys: cacheStats.responseCacheKeys,
          memoryUsageBytes: cacheStats.memoryUsage,
          memoryUsageMB:
            Math.round((cacheStats.memoryUsage / 1024 / 1024) * 100) / 100,
        },
        performance: {
          hitRate: efficiency.hitRatePercent,
          avgGetTime: `${cacheStats.performance.avgGetTime.toFixed(2)}ms`,
          avgSetTime: `${cacheStats.performance.avgSetTime.toFixed(2)}ms`,
          operationsPerSecond: cacheStats.performance.operationsPerSecond,
        },
        aiCaching: {
          iflowHits: cacheStats.aiCacheStats.iflowCacheHits,
          tavilyHits: cacheStats.aiCacheStats.tavilyCacheHits,
          blueprintHits: cacheStats.aiCacheStats.blueprintCacheHits,
          aiHitRate: efficiency.aiHitRatePercent,
          costSavings: efficiency.aiCostSavings,
        },
        tags: cacheStats.tags,
      },
      infrastructure: {
        redis: {
          health: redisHealth.status,
          primaryConnection: redisHealth.details.primaryConnection,
          pooledConnections: redisHealth.details.pooledConnections,
          circuitBreakerState: redisHealth.details.circuitBreakerState.state,
          connectionMetrics: {
            active: redisMetrics.connectionMetrics.activeConnections,
            idle: redisMetrics.connectionMetrics.idleConnections,
            total: redisMetrics.connectionMetrics.totalConnections,
            utilization: performance.redisPerformance.connectionUtilization,
          },
        },
      },
      analytics: {
        efficiency,
        performance,
        recommendations: generateRecommendations(
          efficiency,
          performance,
          redisHealth,
        ),
        trends: {
          memoryTrend: "stable", // Would be enhanced with historical data
          hitRateTrend:
            efficiency.hitRatePercent > 70 ? "improving" : "needs_attention",
          performanceTrend:
            performance.redisPerformance.errorRate < 2
              ? "optimal"
              : "degrading",
        },
      },
    };

    logger.info("Enhanced cache monitoring data retrieved", {
      totalKeys: cacheStats.totalKeys,
      hitRate: efficiency.hitRatePercent,
      costSavings: efficiency.aiCostSavings,
      redisHealth: redisHealth.status,
    });

    return NextResponse.json(monitoringData);
  } catch (error) {
    logger.error("Enhanced cache monitoring failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to retrieve cache monitoring data" },
      { status: 500 },
    );
  }
}

// Enhanced helper functions for comprehensive analytics
function calculateCostSavings(estimatedSavings: number): string {
  return `$${estimatedSavings.toFixed(2)} AI cost savings`;
}

function calculatePerformanceImprovement(hitRate: number): string {
  // Based on average 40-60% response time improvement with cache
  const avgImprovement = 50; // 50% average improvement
  const actualImprovement = Math.round(hitRate * avgImprovement);
  return `${actualImprovement}% average response time improvement`;
}

function calculateMemoryEfficiency(
  memoryUsage: number,
  totalKeys: number,
): string {
  if (totalKeys === 0) return "N/A";
  const avgSize = memoryUsage / totalKeys;
  const efficiency =
    avgSize < 1024
      ? "excellent"
      : avgSize < 2048
        ? "good"
        : avgSize < 4096
          ? "fair"
          : "poor";
  return `${efficiency} (${Math.round(avgSize)} bytes/entry)`;
}

function calculateKeyDistribution(
  dataKeys: number,
  responseKeys: number,
): string {
  const total = dataKeys + responseKeys;
  if (total === 0) return "N/A";
  const dataPercentage = Math.round((dataKeys / total) * 100);
  const responsePercentage = Math.round((responseKeys / total) * 100);
  return `${dataPercentage}% data / ${responsePercentage}% response`;
}

function determineOverallStatus(
  redisHealth: any,
  hitRate: number,
  errorRate: number,
): "excellent" | "good" | "fair" | "poor" {
  if (redisHealth.status === "unhealthy" || errorRate > 5) return "poor";
  if (redisHealth.status === "degraded" || errorRate > 2 || hitRate < 30)
    return "fair";
  if (hitRate < 70 || errorRate > 1) return "good";
  return "excellent";
}

function calculateHealthGrade(
  hitRate: number,
  errorRate: number,
): "A+" | "A" | "B" | "C" | "D" | "F" {
  const score = hitRate * 0.7 + (5 - Math.min(errorRate, 5)) * 6;

  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function generateRecommendations(
  efficiency: any,
  performance: any,
  redisHealth: any,
): string[] {
  const recommendations: string[] = [];

  // Hit rate recommendations
  if (efficiency.hitRatePercent < 50) {
    recommendations.push("Consider increasing cache TTL for better hit rates");
  }
  if (efficiency.hitRatePercent > 90) {
    recommendations.push("Excellent hit rate - may reduce TTL for freshness");
  }

  // Performance recommendations
  if (performance.redisPerformance.errorRate > 2) {
    recommendations.push("High Redis error rate - check connection stability");
  }
  if (performance.redisPerformance.connectionUtilization > 80) {
    recommendations.push(
      "High connection utilization - consider increasing pool size",
    );
  }
  if (performance.redisPerformance.avgResponseTime > 100) {
    recommendations.push(
      "Slow Redis responses - check network latency consider connection optimization",
    );
  }

  // Memory recommendations
  if (performance.cacheEfficiency.memoryEfficiency.includes("poor")) {
    recommendations.push(
      "High memory per cache entry - review data serialization strategy",
    );
  }

  // AI caching recommendations
  if (efficiency.aiHitRatePercent < 60) {
    recommendations.push(
      "Low AI cache hit rate - review key generation strategy",
    );
  }

  // Health recommendations
  if (redisHealth.status !== "healthy") {
    recommendations.push(
      "Redis health degraded - check infrastructure and monitoring",
    );
  }

  return recommendations.length > 0
    ? recommendations
    : ["Performance is optimal - no immediate recommendations"];
}
