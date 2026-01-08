import { logger } from "../../logger";
import { redisManager } from "../../redis";
import { ServiceResponse, DatabasePerformanceMetrics } from "../service-types";

// Extend the service-types interface for our specific needs
interface ExtendedDatabaseQueryStats {
  slowQueries: number;
  averageTime: number;
  failedQueries: number;
  totalQueries: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  connectionUtilization: number;
  indexUtilization: number;
  memoryUsage: number;
}

/**
 * Database connection pool configuration
 */
export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

/**
 * Query optimization metrics
 */
export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  indexUsed: boolean;
  fullTableScan: boolean;
  memoryUsage: number;
  cacheHit: boolean;
  timestamp: string;
  parameters?: any[];
}

/**
 * Query optimization result
 */
export interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery?: string;
  improvements: string[];
  estimatedSpeedup: number; // Percentage
  memoryReduction: number; // Percentage
  recommended: boolean;
  riskLevel: "low" | "medium" | "high";
}

// DatabaseQueryStats is imported from service-types

/**
 * Database Query Optimization with Connection Pool Management
 *
 * This service provides intelligent database query optimization,
 * connection pool management, and performance monitoring.
 */
interface DatabasePerformanceMetricsInternal extends Omit<
  DatabasePerformanceMetrics,
  "queryStats"
> {
  queryStats: ExtendedDatabaseQueryStats;
}
export class DatabaseQueryOptimizationService {
  private static readonly DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
    minConnections: 5,
    maxConnections: 20,
    idleTimeoutMillis: 30000, // 30 seconds
    acquireTimeoutMillis: 10000, // 10 seconds
    createTimeoutMillis: 5000, // 5 seconds
    destroyTimeoutMillis: 2000, // 2 seconds
    reapIntervalMillis: 1000, // 1 second
    createRetryIntervalMillis: 200, // 200ms
  };

  private static queryHistory: QueryMetrics[] = [];
  private static connectionPoolMetrics = new Map<string, any>();
  private static optimizationCache = new Map<string, QueryOptimizationResult>();

  /**
   * Optimize database query with intelligent suggestions
   */
  static async optimizeQuery(
    query: string,
    parameters: any[] = [],
    context: { userId?: string; table?: string } = {},
  ): Promise<ServiceResponse<QueryOptimizationResult>> {
    try {
      const startTime = Date.now();

      // Check cache first
      const cacheKey = `query-opt:${this.hashQuery(query)}`;
      const cached = this.optimizationCache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            duration: Date.now() - startTime,
            requestId: `query-opt-${Date.now()}`,
            cacheHit: true,
          },
        };
      }

      const result = await this.performQueryOptimization(
        query,
        parameters,
        context,
      );

      // Cache the result
      this.optimizationCache.set(cacheKey, result);

      // Cache in Redis for shared access
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            cacheKey,
            3600, // 1 hour TTL
            JSON.stringify(result),
          );
        },
        async () => {},
      );

      logger.info("Query optimization completed", {
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        improvements: result.improvements.length,
        estimatedSpeedup: result.estimatedSpeedup,
      });

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
          requestId: `query-opt-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Query optimization failed", {
        query: query.substring(0, 100),
        error,
      });
      return {
        success: false,
        error: {
          name: "QueryOptimizationError",
          message: "Failed to optimize database query",
          timestamp: new Date().toISOString(),
          context: {
            query: query.substring(0, 100),
            error: error instanceof Error ? error.message : error,
          },
        },
      };
    }
  }

  /**
   * Analyze and optimize connection pool performance
   */
  static async optimizeConnectionPool(
    config: Partial<ConnectionPoolConfig> = {},
  ): Promise<
    ServiceResponse<{
      optimizations: string[];
      newConfig: ConnectionPoolConfig;
      improvements: Record<string, number>;
    }>
  > {
    try {
      const finalConfig = { ...this.DEFAULT_POOL_CONFIG, ...config };
      const optimizations: string[] = [];
      const improvements: Record<string, number> = {};

      // Get current pool metrics
      const currentMetrics = await this.getConnectionPoolMetrics();

      // Analyze pool utilization
      const utilization =
        currentMetrics.connectionPool.active /
        currentMetrics.connectionPool.total;

      if (utilization > 0.8) {
        // High utilization - increase pool size
        const newSize = Math.min(finalConfig.maxConnections * 1.5, 50);
        finalConfig.maxConnections = Math.round(newSize);
        optimizations.push(
          `Increased max connections to ${newSize} due to high utilization`,
        );
        improvements.utilization = Math.round((1 - utilization) * 100);
      } else if (utilization < 0.3) {
        // Low utilization - reduce pool size
        const newSize = Math.max(finalConfig.maxConnections * 0.8, 5);
        finalConfig.maxConnections = Math.round(newSize);
        optimizations.push(
          `Reduced max connections to ${newSize} due to low utilization`,
        );
        improvements.utilization = Math.round(utilization * 100);
      }

      // Optimize timeout settings based on query patterns
      const avgQueryTime = this.getAverageQueryTime();
      if (avgQueryTime > 2000) {
        // Slow queries - increase timeout
        finalConfig.acquireTimeoutMillis = Math.round(avgQueryTime * 2);
        optimizations.push(
          `Increased acquire timeout to ${finalConfig.acquireTimeoutMillis}ms for slow queries`,
        );
        improvements.timeoutStability = 25;
      }

      // Optimize idle timeout
      if (currentMetrics.connectionPool.idle > finalConfig.minConnections * 2) {
        finalConfig.idleTimeoutMillis = Math.max(
          10000,
          finalConfig.idleTimeoutMillis * 0.8,
        );
        optimizations.push(
          `Reduced idle timeout to ${finalConfig.idleTimeoutMillis}ms to reduce resource usage`,
        );
        improvements.resourceEfficiency = 15;
      }

      // Store optimized configuration
      await this.storePoolConfiguration(finalConfig);

      logger.info("Connection pool optimization completed", {
        optimizations: optimizations.length,
        utilization,
        avgQueryTime,
      });

      return {
        success: true,
        data: {
          optimizations,
          newConfig: finalConfig,
          improvements,
        },
        metadata: {
          duration: 0,
          requestId: `pool-opt-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Connection pool optimization failed", { error });
      return {
        success: false,
        error: {
          name: "PoolOptimizationError",
          message: "Failed to optimize connection pool",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Get comprehensive database performance metrics
   */
  static async getDatabasePerformanceMetrics(): Promise<
    ServiceResponse<
      DatabasePerformanceMetrics & {
        queryStats: ExtendedDatabaseQueryStats;
        recommendations: string[];
      }
    >
  > {
    try {
      const metrics = await this.gatherDatabaseMetrics();
      const queryStats = this.calculateQueryStatistics();
      const recommendations = this.generateDatabaseRecommendations(
        metrics,
        queryStats,
      );

      // Cache metrics for monitoring
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            "db-performance-metrics",
            60, // 1 minute TTL
            JSON.stringify({
              metrics,
              queryStats,
              recommendations,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        async () => {},
      );

      return {
        success: true,
        data: {
          ...metrics,
          queryStats,
          recommendations,
        },
        metadata: {
          duration: 0,
          requestId: `db-metrics-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Failed to get database performance metrics", { error });
      return {
        success: false,
        error: {
          name: "MetricsCollectionError",
          message: "Failed to collect database performance metrics",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Analyze slow queries and provide optimization suggestions
   */
  static async analyzeSlowQueries(thresholdMs: number = 1000): Promise<
    ServiceResponse<{
      slowQueries: QueryMetrics[];
      optimizations: QueryOptimizationResult[];
      summary: {
        total: number;
        avgTime: number;
        severityBreakdown: Record<string, number>;
      };
    }>
  > {
    try {
      // Get slow queries from history
      const slowQueries = this.queryHistory.filter(
        (q) => q.executionTime > thresholdMs,
      );

      if (slowQueries.length === 0) {
        return {
          success: true,
          data: {
            slowQueries: [],
            optimizations: [],
            summary: { total: 0, avgTime: 0, severityBreakdown: {} },
          },
          metadata: {
            duration: 0,
            requestId: `slow-query-${Date.now()}`,
          },
        };
      }

      // Analyze each slow query
      const optimizations: QueryOptimizationResult[] = [];
      for (const query of slowQueries.slice(0, 20)) {
        // Limit to top 20
        const optimization = await this.performQueryOptimization(
          query.query,
          query.parameters || [],
        );
        optimizations.push(optimization);
      }

      // Calculate summary statistics
      const summary = {
        total: slowQueries.length,
        avgTime:
          slowQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          slowQueries.length,
        severityBreakdown: this.categorizeSlowQueries(slowQueries),
      };

      logger.info("Slow query analysis completed", {
        totalSlowQueries: slowQueries.length,
        thresholdMs,
        optimizations: optimizations.length,
      });

      return {
        success: true,
        data: {
          slowQueries,
          optimizations,
          summary,
        },
        metadata: {
          duration: 0,
          requestId: `slow-query-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Slow query analysis failed", { error });
      return {
        success: false,
        error: {
          name: "SlowQueryAnalysisError",
          message: "Failed to analyze slow queries",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Record query execution metrics
   */
  static async recordQueryMetrics(metrics: QueryMetrics): Promise<void> {
    try {
      this.queryHistory.push(metrics);

      // Keep only last 1000 queries
      if (this.queryHistory.length > 1000) {
        this.queryHistory = this.queryHistory.slice(-1000);
      }

      // Store in Redis for real-time monitoring
      await redisManager.executeWithFallback(
        async (client) => {
          await client.lPush("query-metrics", JSON.stringify(metrics));
          await client.lTrim("query-metrics", 0, 999); // Keep last 1000
        },
        async () => {},
      );

      // Detect performance issues
      if (metrics.executionTime > 5000 || metrics.fullTableScan) {
        await this.handlePerformanceIssue(metrics);
      }
    } catch (error) {
      logger.warn("Failed to record query metrics", { error });
    }
  }

  /**
   * Get connection pool metrics
   */
  private static async getConnectionPoolMetrics(): Promise<DatabasePerformanceMetricsInternal> {
    // Simulate pool metrics - in real implementation, this would connect to actual pool
    return {
      connectionPool: {
        active: 8,
        idle: 4,
        total: 12,
        max: 20,
      },
      queryStats: {
        slowQueries: 2,
        averageTime: 150,
        failedQueries: 0,
        totalQueries: 10,
        averageExecutionTime: 150,
        cacheHitRate: 75,
        connectionUtilization: 60,
        indexUtilization: 80,
        memoryUsage: 5000,
      },
      cacheHitRate: 75,
    };
  }

  /**
   * Perform actual query optimization
   */
  private static performQueryOptimization(
    query: string,
    _parameters: any[] = [],
    _context: { userId?: string; table?: string } = {},
  ): QueryOptimizationResult {
    const result: QueryOptimizationResult = {
      originalQuery: query,
      improvements: [],
      estimatedSpeedup: 0,
      memoryReduction: 0,
      recommended: true,
      riskLevel: "low",
    };

    try {
      // Analyze query patterns
      const normalizedQuery = query.toLowerCase().trim();

      // Check for missing index hints
      if (
        normalizedQuery.includes("where ") &&
        !normalizedQuery.includes("index")
      ) {
        result.improvements.push("Consider adding index hint for WHERE clause");
        result.estimatedSpeedup += 15;
      }

      // Check for SELECT *
      if (normalizedQuery.includes("select *")) {
        result.improvements.push("Replace SELECT * with specific columns");
        result.estimatedSpeedup += 10;
        result.memoryReduction += 20;
        result.riskLevel = "low";
      }

      // Check for missing LIMIT clause
      if (
        normalizedQuery.includes("select") &&
        !normalizedQuery.includes("limit")
      ) {
        result.improvements.push(
          "Add LIMIT clause to prevent large result sets",
        );
        result.estimatedSpeedup += 5;
        result.memoryReduction += 15;
        result.riskLevel = "medium";
      }

      // Check for suboptimal JOIN order
      if (
        normalizedQuery.includes("join") &&
        normalizedQuery.includes("where")
      ) {
        result.improvements.push(
          "Consider JOIN optimization with proper filtering",
        );
        result.estimatedSpeedup += 20;
        result.riskLevel = "medium";
      }

      // Generate optimized query if improvements are significant
      if (result.estimatedSpeedup > 25) {
        result.optimizedQuery = this.generateOptimizedQuery(
          query,
          result.improvements,
        );
      }

      // Determine if optimization is recommended
      result.recommended = result.estimatedSpeedup > 10;
    } catch (error) {
      logger.warn("Query optimization analysis failed", { error });
      result.recommended = false;
      result.riskLevel = "high";
    }

    return result;
  }

  /**
   * Generate optimized query based on improvements
   */
  private static generateOptimizedQuery(
    originalQuery: string,
    improvements: string[],
  ): string {
    let optimized = originalQuery;

    // Apply optimizations
    if (improvements.includes("Replace SELECT * with specific columns")) {
      optimized = optimized.replace(
        /\bselect\s+\*\b/gi,
        "SELECT id, created_at, status",
      );
    }

    if (
      !optimized.toLowerCase().includes("limit") &&
      improvements.includes("Add LIMIT clause to prevent large result sets")
    ) {
      optimized += " LIMIT 1000";
    }

    return optimized;
  }

  /**
   * Store pool configuration
   */
  private static async storePoolConfiguration(
    config: ConnectionPoolConfig,
  ): Promise<void> {
    await redisManager.executeWithFallback(
      async (client) => {
        await client.setEx("db-pool-config", 3600, JSON.stringify(config));
      },
      async () => {},
    );
  }

  /**
   * Gather database metrics
   */
  private static async gatherDatabaseMetrics(): Promise<DatabasePerformanceMetricsInternal> {
    // Simulate metrics collection - in real implementation, this would query the database
    return {
      connectionPool: {
        active: Math.floor(Math.random() * 15) + 5,
        idle: Math.floor(Math.random() * 10) + 2,
        total: Math.floor(Math.random() * 20) + 10,
        max: 20,
      },
      queryStats: {
        slowQueries: Math.floor(Math.random() * 5),
        averageTime: Math.floor(Math.random() * 500) + 50,
        failedQueries: 0,
        totalQueries: Math.floor(Math.random() * 100) + 10,
        averageExecutionTime: Math.floor(Math.random() * 500) + 50,
        cacheHitRate: Math.floor(Math.random() * 30) + 70,
        connectionUtilization: Math.floor(Math.random() * 50) + 25,
        indexUtilization: Math.floor(Math.random() * 30) + 60,
        memoryUsage: Math.floor(Math.random() * 10000) + 1000,
      },
      cacheHitRate: Math.floor(Math.random() * 30) + 70, // 70-100%
    };
  }

  /**
   * Calculate query statistics
   */
  private static calculateQueryStatistics(): ExtendedDatabaseQueryStats {
    const totalQueries = this.queryHistory.length;
    const averageExecutionTime =
      totalQueries > 0
        ? this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0) /
          totalQueries
        : 0;
    const slowQueries = this.queryHistory.filter(
      (q) => q.executionTime > 1000,
    ).length;
    const cacheHits = this.queryHistory.filter((q) => q.cacheHit).length;
    const cacheHitRate =
      totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    const indexedQueries = this.queryHistory.filter((q) => q.indexUsed).length;
    const indexUtilization =
      totalQueries > 0 ? (indexedQueries / totalQueries) * 100 : 0;
    const memoryUsage = this.queryHistory.reduce(
      (sum, q) => sum + q.memoryUsage,
      0,
    );

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      cacheHitRate,
      connectionUtilization: 75, // Simulated
      indexUtilization,
      memoryUsage,
      averageTime: averageExecutionTime,
      failedQueries: 0,
    };
  }

  /**
   * Generate database performance recommendations
   */
  private static generateDatabaseRecommendations(
    metrics: DatabasePerformanceMetrics,
    queryStats: ExtendedDatabaseQueryStats,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.connectionPool.active / metrics.connectionPool.total > 0.8) {
      recommendations.push("Consider increasing connection pool size");
    }

    if (queryStats.slowQueries > queryStats.totalQueries * 0.1) {
      recommendations.push(
        "High percentage of slow queries - review indexing strategy",
      );
    }

    if (queryStats.cacheHitRate < 70) {
      recommendations.push(
        "Low cache hit rate - consider implementing query result caching",
      );
    }

    if (queryStats.indexUtilization < 80) {
      recommendations.push(
        "Low index utilization - review query patterns and missing indexes",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Database performance is optimal");
    }

    return recommendations;
  }

  /**
   * Get average query time from history
   */
  private static getAverageQueryTime(): number {
    if (this.queryHistory.length === 0) return 500; // Default
    return (
      this.queryHistory.reduce((sum, q) => sum + q.executionTime, 0) /
      this.queryHistory.length
    );
  }

  /**
   * Categorize slow queries by severity
   */
  private static categorizeSlowQueries(
    queries: QueryMetrics[],
  ): Record<string, number> {
    const categories: Record<string, number> = {
      mild: 0, // 1-2 seconds
      moderate: 0, // 2-5 seconds
      severe: 0, // 5-10 seconds
      critical: 0, // >10 seconds
    };

    for (const query of queries) {
      if (query.executionTime > 10000) {
        categories.critical++;
      } else if (query.executionTime > 5000) {
        categories.severe++;
      } else if (query.executionTime > 2000) {
        categories.moderate++;
      } else {
        categories.mild++;
      }
    }

    return categories;
  }

  /**
   * Handle performance issues
   */
  private static async handlePerformanceIssue(
    metrics: QueryMetrics,
  ): Promise<void> {
    logger.warn("Performance issue detected", {
      query: metrics.query.substring(0, 100),
      executionTime: metrics.executionTime,
      fullTableScan: metrics.fullTableScan,
    });

    // Store performance issue for alerting
    await redisManager.executeWithFallback(
      async (client) => {
        await client.lPush(
          "performance-issues",
          JSON.stringify({
            ...metrics,
            severity: metrics.executionTime > 10000 ? "critical" : "warning",
            timestamp: new Date().toISOString(),
          }),
        );
        await client.lTrim("performance-issues", 0, 99); // Keep last 100
      },
      async () => {},
    );
  }

  /**
   * Hash query for caching
   */
  private static hashQuery(query: string): string {
    // Simple hash - in production, use proper hashing
    return Buffer.from(query).toString("base64").substring(0, 32);
  }
}
