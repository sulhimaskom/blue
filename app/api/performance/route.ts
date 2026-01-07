import { NextRequest, NextResponse } from "next/server";
import { DatabasePerformanceOptimizer } from "@/lib/db/performance-optimizer";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import {
  DatabaseQueryCache,
  type QueryCacheStats,
} from "@/lib/services/database-cache-service";
import {
  DatabasePerformanceMonitor,
  type QueryMetrics,
} from "@/lib/db/performance-monitor";
import { logger } from "@/lib/logger";

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

async function handlePerformanceReport(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const includeCache = searchParams.get("includeCache") === "true";
  const includeDb = searchParams.get("includeDb") === "true";
  const detailed = searchParams.get("detailed") === "true";

  // Get cache performance metrics
  let cacheMetrics: CacheMetrics | null = null;
  if (includeCache) {
    cacheMetrics = await UnifiedCacheManager.getPerformanceMetrics();
    cacheMetrics.databaseCacheStats = DatabaseQueryCache.getCacheStats();
  }

  // Get database performance metrics
  let dbMetrics: DatabasePerformanceMetrics | null = null;
  if (includeDb) {
    dbMetrics = DatabasePerformanceMonitor.getPerformanceMetrics();

    if (detailed) {
      dbMetrics.performanceReport =
        await DatabasePerformanceOptimizer.getPerformanceReport();
    }
  }

  // Calculate overall performance score
  const performanceScore = calculatePerformanceScore(cacheMetrics, dbMetrics);

  logger.info("Performance report generated", {
    includeCache,
    includeDb,
    detailed,
    performanceScore,
  });

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    performanceScore,
    metrics: {
      cache: cacheMetrics,
      database: dbMetrics,
    },
    recommendations: generateOverallRecommendations(cacheMetrics, dbMetrics),
  });
}

function calculatePerformanceScore(
  cacheMetrics: CacheMetrics | null,
  dbMetrics: DatabasePerformanceMetrics | null,
): number {
  let score = 100;

  // Cache performance impact
  if (cacheMetrics) {
    if (cacheMetrics.hitRate < 0.5) score -= 20;
    else if (cacheMetrics.hitRate < 0.7) score -= 10;
    else if (cacheMetrics.hitRate > 0.9) score += 5;

    if (cacheMetrics.performanceImprovement < 20) score -= 15;
    else if (cacheMetrics.performanceImprovement > 50) score += 5;
  }

  // Database performance impact
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
    // Add cache-related recommendations
    if (cacheMetrics.recommendations) {
      recommendations.push(...cacheMetrics.recommendations);
    }
  }

  if (dbMetrics) {
    // Add database-related recommendations
    const dbRecommendations =
      DatabasePerformanceMonitor.getPerformanceRecommendations();
    recommendations.push(...dbRecommendations);
  }

  // Add overall system recommendations
  if (recommendations.length === 0) {
    recommendations.push(
      "System performance is optimal - all components performing well",
    );
  }

  return recommendations;
}

export async function GET(req: NextRequest) {
  return handlePerformanceReport(req);
}
