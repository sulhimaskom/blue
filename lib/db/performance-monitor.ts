import { db } from "./index";
import { logger } from "../logger";
import { sql } from "drizzle-orm";
import { Timing } from "../utils/time-measurement";

/**
 * Database performance monitoring and query optimization service
 * Provides real-time performance metrics and optimization recommendations
 */

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowCount?: number;
}

export interface SlowQueryAlert {
  query: string;
  avgDuration: number;
  callCount: number;
  totalDuration: number;
  recommendations: string[];
}

export interface DatabasePerformanceMetrics {
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

export class DatabasePerformanceMonitor {
  private static queryHistory: QueryMetrics[] = [];
  private static readonly MAX_HISTORY_SIZE = 1000;
  private static readonly SLOW_QUERY_THRESHOLD = 500; // ms

  /**
   * Track query execution for performance monitoring
   */
  static async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let success = true;
    let error: string | undefined;

    try {
      result = await queryFn();

      // Estimate row count if possible
      logger.debug("Query executed successfully", {
        queryName,
        duration: `${Timing.perf(startTime)}ms`,
      });

      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : "Unknown error";

      logger.warn("Query execution failed", {
        queryName,
        duration: `${Timing.perf(startTime)}ms`,
        error,
      });

      throw err;
    } finally {
      // Store metrics
      this.recordQueryMetrics({
        query: queryName,
        duration: Timing.perf(startTime),
        timestamp: new Date(),
        success,
        error,
      });
    }
  }

  /**
   * Record query metrics for analysis
   */
  private static recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryHistory.push(metrics);

    // Maintain history size
    if (this.queryHistory.length > this.MAX_HISTORY_SIZE) {
      this.queryHistory = this.queryHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    // Alert on slow queries
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      logger.warn("Slow query detected", {
        query: metrics.query,
        duration: `${metrics.duration}ms`,
        threshold: `${this.SLOW_QUERY_THRESHOLD}ms`,
      });
    }
  }

  /**
   * Get performance metrics for analysis
   */
  static getPerformanceMetrics(): DatabasePerformanceMetrics {
    const totalQueries = this.queryHistory.length;
    const successfulQueries = this.queryHistory.filter((q) => q.success).length;
    const successRate =
      totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 100;
    const averageDuration =
      totalQueries > 0
        ? this.queryHistory.reduce((sum, q) => sum + q.duration, 0) /
          totalQueries
        : 0;

    const slowQueries = this.queryHistory.filter(
      (q) => q.duration > this.SLOW_QUERY_THRESHOLD,
    );
    const recentErrors = this.queryHistory
      .filter(
        (q) => !q.success && Timing.now() - q.timestamp.getTime() < 300000,
      ) // Last 5 minutes
      .slice(-10);

    // Query statistics by name
    const queryStats: Record<
      string,
      { count: number; avgDuration: number; errorRate: number }
    > = {};
    const queryGroups: Record<string, QueryMetrics[]> = {};

    this.queryHistory.forEach((query) => {
      if (!queryGroups[query.query]) {
        queryGroups[query.query] = [];
      }
      queryGroups[query.query].push(query);
    });

    Object.entries(queryGroups).forEach(([name, queries]) => {
      const count = queries.length;
      const avgDuration =
        queries.reduce((sum, q) => sum + q.duration, 0) / count;
      const errorRate =
        (queries.filter((q) => !q.success).length / count) * 100;

      queryStats[name] = { count, avgDuration, errorRate };
    });

    return {
      totalQueries,
      successRate,
      averageDuration,
      slowQueries,
      recentErrors,
      queryStats,
    };
  }

  /**
   * Get database performance recommendations
   */
  static getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getPerformanceMetrics();

    // Success rate recommendations
    if (metrics.successRate < 95) {
      recommendations.push(
        `Query success rate is ${metrics.successRate.toFixed(1)}% - investigate error patterns`,
      );
    }

    // Average duration recommendations
    if (metrics.averageDuration > 200) {
      recommendations.push(
        `Average query duration is ${metrics.averageDuration.toFixed(0)}ms - consider query optimization`,
      );
    }

    // Slow query recommendations
    if (metrics.slowQueries.length > 0) {
      const slowestQueries = metrics.slowQueries
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3);

      recommendations.push(
        `Found ${metrics.slowQueries.length} slow queries. Slowest: ${slowestQueries[0]?.query} (${slowestQueries[0]?.duration}ms)`,
      );
    }

    // Error pattern recommendations
    if (metrics.recentErrors.length > 5) {
      recommendations.push(
        `High error rate detected - ${metrics.recentErrors.length} errors in last 5 minutes`,
      );
    }

    // Query-specific recommendations
    Object.entries(metrics.queryStats).forEach(([query, stats]) => {
      if (stats.avgDuration > 1000) {
        recommendations.push(
          `Query "${query}" averaging ${stats.avgDuration.toFixed(0)}ms - needs optimization`,
        );
      }
      if (stats.errorRate > 10) {
        recommendations.push(
          `Query "${query}" has ${stats.errorRate.toFixed(1)}% error rate - investigate failures`,
        );
      }
    });

    if (recommendations.length === 0) {
      recommendations.push(
        "Database performance is optimal - no optimizations needed",
      );
    }

    return recommendations;
  }

  /**
   * Clear query history for fresh monitoring
   */
  static clearMetrics(): void {
    this.queryHistory = [];
    logger.info("Database performance metrics cleared");
  }

  /**
   * Get real-time database performance indicators
   */
  static async getRealTimePerformanceIndicators(): Promise<{
    connectionHealth: boolean;
    queryLatency: number;
    throughput: number;
    errorRate: number;
    recommendations: string[];
  }> {
    try {
      const startTime = Timing.now();

      // Test query latency
      await this.trackQuery("health_check", async () => {
        const database = db();
        return database.execute(sql`SELECT 1 as health_check`);
      });

      const queryLatency = Timing.perf(startTime);
      const metrics = this.getPerformanceMetrics();
      const throughput =
        metrics.totalQueries > 0
          ? metrics.totalQueries /
            (this.queryHistory.length > 0
              ? (Timing.now() - this.queryHistory[0]!.timestamp.getTime()) /
                1000
              : 1)
          : 0;

      return {
        connectionHealth: queryLatency < 5000,
        queryLatency,
        throughput,
        errorRate: 100 - metrics.successRate,
        recommendations: this.getPerformanceRecommendations(),
      };
    } catch (error) {
      logger.error("Failed to get performance indicators", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        connectionHealth: false,
        queryLatency: -1,
        throughput: 0,
        errorRate: 100,
        recommendations: [
          "Database connection failed - check connection string and server status",
        ],
      };
    }
  }
}
