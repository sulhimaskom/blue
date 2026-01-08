import { NextRequest } from "next/server";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { redisManager } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { metricsCalculator } from "@/lib/services/metrics-calculator-service";
import {
  formatSuccessResponse,
  formatErrorResponse,
  withRateLimiter,
} from "@/lib/api-utils";

// Enhanced cache monitoring endpoint with advanced analytics and response caching
export async function GET(req: NextRequest) {
  return withRateLimiter(req, "standard", async () => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        try {
          // Get comprehensive cache statistics with performance metrics
          const cacheStats = await UnifiedCacheManager.getCacheStats();
          const redisMetrics = redisManager.getPerformanceMetrics();
          const redisHealth = await redisManager.healthCheck();

          // Calculate detailed efficiency metrics using unified service
          const efficiency =
            metricsCalculator.calculateCachePerformance(cacheStats);

          // Advanced performance analytics using unified service
          const performance = {
            ...cacheStats.performance,
            redisPerformance:
              metricsCalculator.calculateRedisPerformance(redisMetrics),
            cacheEfficiency:
              metricsCalculator.calculateCacheEfficiency(cacheStats),
          };

          const monitoringData = {
            timestamp: new Date().toISOString(),
            summary: {
              status: metricsCalculator.determineOverallStatus(
                redisHealth,
                efficiency.hitRatePercent,
                performance.redisPerformance.errorRate,
              ),
              healthGrade: metricsCalculator.calculateHealthGrade(
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
                  Math.round((cacheStats.memoryUsage / 1024 / 1024) * 100) /
                  100,
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
                circuitBreakerState:
                  redisHealth.details.circuitBreakerState.state,
                connectionMetrics: {
                  active: redisMetrics.connectionMetrics.activeConnections,
                  idle: redisMetrics.connectionMetrics.idleConnections,
                  total: redisMetrics.connectionMetrics.totalConnections,
                  utilization:
                    performance.redisPerformance.connectionUtilization,
                },
              },
            },
            analytics: {
              efficiency,
              performance,
              recommendations: metricsCalculator.generateRecommendations(
                efficiency,
                performance,
                redisHealth,
              ),
              trends: {
                memoryTrend: "stable", // Would be enhanced with historical data
                hitRateTrend:
                  efficiency.hitRatePercent > 70
                    ? "improving"
                    : "needs_attention",
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

          return formatSuccessResponse(
            monitoringData,
            "Cache monitoring data retrieved successfully",
          );
        } catch (error) {
          logger.error("Enhanced cache monitoring failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });

          return formatErrorResponse(
            error instanceof Error
              ? error
              : new Error("Failed to retrieve cache monitoring data"),
          );
        }
      },
      {
        ttl: 30, // 30 seconds response caching for cache metrics
        tags: ["cache-metrics", "monitoring"],
        varyBy: [], // Same for all users - no user-specific data
      },
    );
  });
}
