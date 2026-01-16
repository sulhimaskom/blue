/**
 * Performance Report Service - Comprehensive Performance Analytics
 *
 * Service for generating comprehensive performance reports combining cache,
 * database, and system metrics with scoring algorithms and recommendations.
 * This service centralizes all performance analysis business logic.
 */

import { DatabasePerformanceOptimizer } from "@/lib/db/performance-optimizer";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import type { QueryCacheStats } from "@/lib/services/database-cache-service";
import {
  DatabasePerformanceMonitor,
  type DatabasePerformanceMetrics,
} from "@/lib/db/performance-monitor";
import { logger } from "@/lib/logger";

export interface CacheMetrics {
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

export interface PerformanceReportOptions {
  includeCache: boolean;
  includeDb: boolean;
  detailed: boolean;
}

export interface PerformanceReport {
  timestamp: string;
  performanceScore: number;
  metrics: {
    cache: CacheMetrics | null;
    database: DatabasePerformanceMetrics | null;
  };
  recommendations: string[];
}

class PerformanceReportService {
  private static instance: PerformanceReportService;

  private constructor() {}

  static getInstance(): PerformanceReportService {
    if (!PerformanceReportService.instance) {
      PerformanceReportService.instance = new PerformanceReportService();
    }
    return PerformanceReportService.instance;
  }

  async generatePerformanceReport(
    options: PerformanceReportOptions,
  ): Promise<PerformanceReport> {
    const { includeCache, includeDb, detailed } = options;

    const cacheMetrics = includeCache
      ? await this.getCacheMetrics()
      : null;

    const dbMetrics = includeDb
      ? await this.getDatabaseMetrics(detailed)
      : null;

    const performanceScore = this.calculatePerformanceScore(
      cacheMetrics,
      dbMetrics,
    );

    const recommendations = this.generateOverallRecommendations(
      cacheMetrics,
      dbMetrics,
    );

    logger.info("Performance report generated", {
      includeCache,
      includeDb,
      detailed,
      performanceScore,
      recommendationsCount: recommendations.length,
    });

    return {
      timestamp: new Date().toISOString(),
      performanceScore,
      metrics: {
        cache: cacheMetrics,
        database: dbMetrics,
      },
      recommendations,
    };
  }

  private async getCacheMetrics(): Promise<CacheMetrics> {
    const rawCacheMetrics = await UnifiedCacheManager.getPerformanceMetrics() as {
      databaseCacheStats?: QueryCacheStats;
      [key: string]: unknown;
    };

    return {
      ...rawCacheMetrics,
      databaseCacheStats: rawCacheMetrics.databaseCacheStats,
    } as CacheMetrics;
  }

  private async getDatabaseMetrics(
    detailed: boolean,
  ): Promise<DatabasePerformanceMetrics> {
    const dbMetrics = DatabasePerformanceMonitor.getPerformanceMetrics();

    if (detailed) {
      dbMetrics.performanceReport =
        await DatabasePerformanceOptimizer.getPerformanceReport();
    }

    return dbMetrics;
  }

  private calculatePerformanceScore(
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

  private generateOverallRecommendations(
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
}

export const performanceReportService = PerformanceReportService.getInstance();
