import { NextRequest } from "next/server";
import { DatabasePerformanceOptimizer } from "@/lib/db/performance-optimizer";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import {
  DatabaseQueryCache,
  type QueryCacheStats,
} from "@/lib/services/database-cache-service";
import {
  DatabasePerformanceMonitor,
  type QueryMetrics,
} from "@/lib/db/performance-monitor";
import { logger } from "@/lib/logger";
import {
  formatSuccessResponse,
  formatErrorResponse,
  withRateLimiter,
} from "@/lib/api-utils";

// Define proper types for performance metrics
interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgCacheTime: number;
  avgDbTime: number;
  hitRate: number;
  performanceImprovement: number;
  cachePatterns: unknown[];
  recommendations: string[];
  databaseCacheStats?: QueryCacheStats;
}

interface DatabasePerformanceMetrics {
  totalQueries: number;
  successRate: number;
  averageDuration: number;
  slowQueries: QueryMetrics[];
  recentErrors: QueryMetrics[];
  queryStats: Record<
    string,
    { count: number; avgDuration: number; errorRate: number }
  >;
  performanceReport?: unknown;
}

function calculatePerformanceScore(
  cacheMetrics: CacheMetrics | null,
  dbMetrics: DatabasePerformanceMetrics | null,
): number {
  let score = 100;

  if (cacheMetrics) {
    if (cacheMetrics.hitRate < 0.5) score -= 20;
    else if (cacheMetrics.hitRate < 0.7) score -= 10;
    else if (cacheMetrics.hitRate > 0.9) score += 5;

    if (cacheMetrics.performanceImprovement < 20) score -= 15;
    else if (cacheMetrics.performanceImprovement > 50) score += 5;
  }

  if (dbMetrics) {
    if (dbMetrics.successRate < 95) score -= 20;
    else if (dbMetrics.successRate < 98) score -= 10;

    if (dbMetrics.averageDuration > 500) score -= 15;
    else if (dbMetrics.averageDuration > 200) score -= 5;
    else if (dbMetrics.averageDuration < 100) score += 5;

    if (dbMetrics.slowQueries && dbMetrics.slowQueries.length > 0) {
      score -= Math.min(10, dbMetrics.slowQueries.length * 2);
    }
  }

  return Math.max(0, Math.min(100, score));
}

function generateOverallRecommendations(
  cacheMetrics: CacheMetrics | null,
  dbMetrics: DatabasePerformanceMetrics | null,
): string[] {
  const recommendations: string[] = [];

  if (cacheMetrics) {
    if (cacheMetrics.recommendations) {
      recommendations.push(...cacheMetrics.recommendations);
    }
  }

  if (dbMetrics) {
    const dbRecommendations =
      DatabasePerformanceMonitor.getPerformanceRecommendations();
    recommendations.push(...dbRecommendations);
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "System performance is optimal - all components performing well",
    );
  }

  return recommendations;
}

export async function GET(req: NextRequest) {
  return withRateLimiter(req, "standard", async () => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        try {
          const searchParams = req.nextUrl.searchParams;
          const includeCache = searchParams.get("includeCache") === "true";
          const includeDb = searchParams.get("includeDb") === "true";
          const detailed = searchParams.get("detailed") === "true";

          let cacheMetrics: any | null = null;
          if (includeCache) {
            cacheMetrics = await UnifiedCacheManager.getPerformanceMetrics();
            (cacheMetrics as any).databaseCacheStats =
              DatabaseQueryCache.getCacheStats();
          }

          let dbMetrics: DatabasePerformanceMetrics | null = null;
          if (includeDb) {
            dbMetrics = DatabasePerformanceMonitor.getPerformanceMetrics();

            if (detailed) {
              dbMetrics.performanceReport =
                await DatabasePerformanceOptimizer.getPerformanceReport();
            }
          }

          const performanceScore = calculatePerformanceScore(
            cacheMetrics,
            dbMetrics,
          );

          logger.info("Performance report generated", {
            includeCache,
            includeDb,
            detailed,
            performanceScore,
          });

          return formatSuccessResponse({
            timestamp: new Date().toISOString(),
            performanceScore,
            metrics: {
              cache: cacheMetrics,
              database: dbMetrics,
            },
            recommendations: generateOverallRecommendations(
              cacheMetrics,
              dbMetrics,
            ),
          });
        } catch (error) {
          logger.error("Performance report generation failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return formatErrorResponse(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
      {
        ttl: 60,
        tags: ["performance", "monitoring", "dashboard"],
        varyBy: [],
      },
    );
  });
}
