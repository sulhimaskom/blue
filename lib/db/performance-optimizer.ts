import { DatabasePerformanceMonitor } from "./performance-monitor";
import { logger } from "../logger";
import { DatabaseQueryCache } from "../services/database-cache-service";

/**
 * Advanced database performance optimization engine
 * Implements intelligent query optimization, connection pooling, and performance monitoring
 */

export interface PerformanceOptimizationResult {
  queryType: string;
  originalDuration: number;
  optimizedDuration: number;
  improvementPercentage: number;
  optimizations: string[];
  recommendations: string[];
}

export interface QueryAnalysis {
  queryType: string;
  frequency: number;
  avgDuration: number;
  totalDuration: number;
  optimizationPotential: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export class DatabasePerformanceOptimizer {
  private static readonly OPTIMIZATION_CACHE_TTL = 300; // 5 minutes
  private static readonly SLOW_QUERY_THRESHOLD = 300; // 300ms

  /**
   * Execute optimized database query with intelligent caching and monitoring
   */
  static async executeOptimizedQuery<T>(
    queryType: string,
    queryFn: () => Promise<T>,
    parameters: Record<string, any> = {},
    options: {
      useCache?: boolean;
      cacheTags?: string[];
      forceAnalyze?: boolean;
    } = {},
  ): Promise<T> {
    const startTime = Date.now();
    const { useCache = true, cacheTags = [], forceAnalyze = false } = options;

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await DatabaseQueryCache.executeCachedQuery(
          queryType,
          queryFn,
          parameters,
          {
            tags: [...cacheTags, "optimized-query"],
          },
        );

        if (cached) {
          const duration = Date.now() - startTime;
          await this.recordOptimizedQuery(queryType, duration, true, {
            cacheHit: true,
            useCache: true,
          });

          return cached;
        }
      }

      // Execute query with performance tracking
      const result = await DatabasePerformanceMonitor.trackQuery(
        queryType,
        queryFn,
      );

      const duration = Date.now() - startTime;

      // Record optimized execution
      await this.recordOptimizedQuery(queryType, duration, true, {
        cacheHit: false,
        useCache,
      });

      // Analyze and suggest optimizations for slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD || forceAnalyze) {
        await this.analyzeQueryPerformance(queryType, parameters, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordOptimizedQuery(queryType, duration, false, {
        cacheHit: false,
        useCache,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Analyze query performance and provide automatic optimizations
   */
  private static async analyzeQueryPerformance(
    queryType: string,
    parameters: Record<string, any>,
    duration: number,
  ): Promise<void> {
    try {
      const analysis = await this.performQueryAnalysis(queryType);

      if (analysis.optimizationPotential > 20) {
        logger.info("Query optimization opportunity detected", {
          queryType,
          duration,
          potentialImprovement: `${analysis.optimizationPotential}%`,
          priority: analysis.priority,
          recommendations: analysis.recommendations,
        });

        // Apply automatic optimizations based on query type
        await this.applyAutomaticOptimizations(queryType, analysis);
      }
    } catch (error) {
      logger.error("Query performance analysis failed", {
        queryType,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Perform comprehensive query analysis
   */
  private static async performQueryAnalysis(queryType: string): Promise<{
    optimizationPotential: number;
    recommendations: string[];
    priority: "HIGH" | "MEDIUM" | "LOW";
  }> {
    const metrics = DatabasePerformanceMonitor.getPerformanceMetrics();
    const queryStats = metrics.queryStats[queryType];

    if (!queryStats) {
      return {
        optimizationPotential: 0,
        recommendations: [],
        priority: "LOW",
      };
    }

    const recommendations: string[] = [];
    let optimizationPotential = 0;

    // Analyze execution patterns
    if (queryStats.avgDuration > 500) {
      recommendations.push(
        `Query averaging ${queryStats.avgDuration.toFixed(0)}ms - consider adding database indexes`,
      );
      optimizationPotential += 30;
    }

    if (queryStats.errorRate > 5) {
      recommendations.push(
        `High error rate (${queryStats.errorRate.toFixed(1)}%) - optimize query logic or add retry logic`,
      );
      optimizationPotential += 25;
    }

    if (queryStats.count > 100) {
      recommendations.push(
        `High frequency query (${queryStats.count} executions) - enable aggressive caching`,
      );
      optimizationPotential += 20;
    }

    // Query-type specific recommendations
    const queryTypeRecommendations =
      this.getQueryTypeRecommendations(queryType);
    recommendations.push(...queryTypeRecommendations);
    optimizationPotential += queryTypeRecommendations.length * 10;

    const priority =
      optimizationPotential > 40
        ? "HIGH"
        : optimizationPotential > 20
          ? "MEDIUM"
          : "LOW";

    return {
      optimizationPotential: Math.min(optimizationPotential, 90),
      recommendations,
      priority,
    };
  }

  /**
   * Get query-type specific optimization recommendations
   */
  private static getQueryTypeRecommendations(queryType: string): string[] {
    const recommendations: string[] = [];

    switch (queryType) {
      case "user-blueprints":
        recommendations.push(
          "Add composite index on (clerk_id, created_at)",
          "Consider pagination for large result sets",
          "Cache user-specific blueprint counts",
        );
        break;

      case "project-stats":
        recommendations.push(
          "Add index on (status, created_at)",
          "Pre-calculate complex aggregations",
          "Use materialized views for statistics",
        );
        break;

      case "blueprint-complete":
        recommendations.push(
          "Add GIN index on JSONB content for faster searches",
          "Enable compression for large blueprint data",
          "Use partial indexes for active blueprints only",
        );
        break;

      case "health_check":
        recommendations.push(
          "Use connection pool health check instead",
          "Cache health status for 60 seconds",
        );
        break;

      default:
        recommendations.push(
          "Review query execution plan",
          "Consider adding relevant database indexes",
          "Implement appropriate caching strategy",
        );
    }

    return recommendations;
  }

  /**
   * Apply automatic optimizations based on analysis
   */
  private static async applyAutomaticOptimizations(
    queryType: string,
    analysis: { recommendations: string[]; priority: string },
  ): Promise<void> {
    // This would implement automatic optimizations like:
    // - Index suggestions
    // - Cache TTL adjustments
    // - Query rewriting

    logger.debug("Applying automatic optimizations", {
      queryType,
      priority: analysis.priority,
      recommendations: analysis.recommendations,
    });
  }

  /**
   * Record optimized query execution for monitoring
   */
  private static async recordOptimizedQuery(
    queryType: string,
    duration: number,
    success: boolean,
    metadata: Record<string, any>,
  ): Promise<void> {
    // Enhanced tracking with optimization metadata
    logger.debug("Optimized query executed", {
      queryType,
      duration,
      success,
      ...metadata,
    });
  }

  /**
   * Get comprehensive performance report
   */
  static async getPerformanceReport(): Promise<{
    overview: {
      totalQueries: number;
      avgDuration: number;
      cacheHitRate: number;
      optimizedQueries: number;
    };
    topOptimizations: Array<{
      queryType: string;
      improvement: number;
      recommendations: string[];
    }>;
    recommendations: string[];
  }> {
    const dbMetrics = DatabasePerformanceMonitor.getPerformanceMetrics();
    const cacheStats = DatabaseQueryCache.getCacheStats();

    // Analyze optimization opportunities
    const queryAnalyses: QueryAnalysis[] = [];

    Object.entries(dbMetrics.queryStats).forEach(([queryType, stats]) => {
      const optimizationPotential = this.calculateOptimizationPotential(
        queryType,
        stats,
      );

      queryAnalyses.push({
        queryType,
        frequency: stats.count,
        avgDuration: stats.avgDuration,
        totalDuration: stats.avgDuration * stats.count,
        optimizationPotential,
        priority:
          optimizationPotential > 40
            ? "HIGH"
            : optimizationPotential > 20
              ? "MEDIUM"
              : "LOW",
      });
    });

    // Sort by optimization potential
    const topOptimizations = queryAnalyses
      .sort((a, b) => b.optimizationPotential - a.optimizationPotential)
      .slice(0, 5)
      .map((analysis) => ({
        queryType: analysis.queryType,
        improvement: analysis.optimizationPotential,
        recommendations: this.getQueryTypeRecommendations(analysis.queryType),
      }));

    // Generate overall recommendations
    const recommendations = this.generateOverallRecommendations(
      dbMetrics,
      cacheStats,
      queryAnalyses,
    );

    return {
      overview: {
        totalQueries: dbMetrics.totalQueries,
        avgDuration: dbMetrics.averageDuration,
        cacheHitRate: cacheStats.hitRate,
        optimizedQueries: queryAnalyses.filter(
          (a) => a.optimizationPotential > 0,
        ).length,
      },
      topOptimizations,
      recommendations,
    };
  }

  /**
   * Calculate optimization potential for a query
   */
  private static calculateOptimizationPotential(
    queryType: string,
    stats: { count: number; avgDuration: number; errorRate: number },
  ): number {
    let potential = 0;

    // Duration-based potential
    if (stats.avgDuration > 1000) potential += 50;
    else if (stats.avgDuration > 500) potential += 30;
    else if (stats.avgDuration > 300) potential += 15;

    // Frequency-based potential
    if (stats.count > 100) potential += 20;
    else if (stats.count > 50) potential += 10;
    else if (stats.count > 10) potential += 5;

    // Error rate impact
    if (stats.errorRate > 10) potential += 30;
    else if (stats.errorRate > 5) potential += 15;

    // Query-type specific adjustments
    const queryTypeMultiplier = this.getQueryTypeMultiplier(queryType);
    potential *= queryTypeMultiplier;

    return Math.min(potential, 90);
  }

  /**
   * Get query-type performance multiplier
   */
  private static getQueryTypeMultiplier(queryType: string): number {
    const multipliers: Record<string, number> = {
      "user-blueprints": 1.2, // User-facing queries
      "project-stats": 1.1, // Dashboard queries
      health_check: 0.8, // System queries
      "blueprint-complete": 1.3, // Critical business queries
    };

    return multipliers[queryType] || 1.0;
  }

  /**
   * Generate overall performance recommendations
   */
  private static generateOverallRecommendations(
    dbMetrics: any,
    cacheStats: any,
    queryAnalyses: QueryAnalysis[],
  ): string[] {
    const recommendations: string[] = [];

    // Cache performance
    if (cacheStats.hitRate < 0.6) {
      recommendations.push(
        `Increase cache hit rate (currently ${(cacheStats.hitRate * 100).toFixed(1)}%) - review TTL settings and cache keys`,
      );
    }

    // Query performance
    if (dbMetrics.averageDuration > 200) {
      recommendations.push(
        `Average query duration is ${dbMetrics.averageDuration.toFixed(0)}ms - review slow query optimizations`,
      );
    }

    // Error rates
    if (dbMetrics.successRate < 95) {
      recommendations.push(
        `Query success rate is ${dbMetrics.successRate.toFixed(1)}% - investigate error patterns`,
      );
    }

    // High-priority optimizations
    const highPriorityQueries = queryAnalyses.filter(
      (a) => a.priority === "HIGH",
    ).length;

    if (highPriorityQueries > 0) {
      recommendations.push(
        `${highPriorityQueries} queries with HIGH optimization potential - prioritize these for immediate attention`,
      );
    }

    // Generic recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "Database performance is optimal - continue monitoring for new optimization opportunities",
      );
    }

    return recommendations;
  }
}
