import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useInterval, STANDARD_INTERVALS } from "@/lib/hooks/use-interval";
import { logger } from "@/lib/logger";
import { formatStandardTime } from "@/lib/utils/time-formatting";
import { AIMemoryOptimizationService } from "@/lib/services/performance/ai-memory-optimization-service";
import { AdvancedCacheStrategiesService } from "@/lib/services/performance/advanced-cache-strategies-service";
import { DatabaseQueryOptimizationService } from "@/lib/services/performance/database-query-optimization-service";

interface PerformanceMetrics {
  memory: {
    usage: number;
    pressure: number;
    status: "healthy" | "warning" | "critical";
  };
  cache: {
    hitRate: number;
    efficiency: number;
    performanceScore: number;
  };
  database: {
    queryTime: number;
    connectionUtilization: number;
    slowQueries: number;
  };
  recommendations: string[];
}

export function RealTimePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: {
      usage: 0,
      pressure: 0,
      status: "healthy" as "healthy" | "warning" | "critical",
    },
    cache: { hitRate: 0, efficiency: 0, performanceScore: 0 },
    database: { queryTime: 0, connectionUtilization: 0, slowQueries: 0 },
    recommendations: [],
  });

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const [memoryHealth, cacheAnalytics, dbMetrics] = await Promise.all([
        AIMemoryOptimizationService.getAIMemoryHealth(),
        AdvancedCacheStrategiesService.getCacheAnalytics(),
        DatabaseQueryOptimizationService.getDatabasePerformanceMetrics(),
      ]);

      const combinedMetrics = {
        memory: memoryHealth.success
          ? {
              usage: 0,
              pressure: memoryHealth.data
                ? (100 - memoryHealth.data.score) / 100
                : 0,
              status: memoryHealth.data?.status || "healthy",
            }
          : { usage: 0, pressure: 0, status: "healthy" as const },

        cache:
          cacheAnalytics.success && cacheAnalytics.data
            ? {
                hitRate:
                  Object.values(cacheAnalytics.data.patterns).reduce(
                    (sum: number, pattern: { hitRate: number }) => sum + pattern.hitRate,
                    0,
                  ) /
                  Math.max(
                    1,
                    Object.keys(cacheAnalytics.data.patterns).length,
                  ),
                efficiency: cacheAnalytics.data.memoryEfficiency,
                performanceScore: cacheAnalytics.data.performanceScore,
              }
            : { hitRate: 0, efficiency: 0, performanceScore: 0 },

        database:
          dbMetrics.success && dbMetrics.data
            ? {
                queryTime: dbMetrics.data.queryStats.averageTime,
                connectionUtilization:
                  (dbMetrics.data.connectionPool.active /
                    dbMetrics.data.connectionPool.max) *
                  100,
                slowQueries: dbMetrics.data.queryStats.totalQueries,
              }
            : { queryTime: 0, connectionUtilization: 0, slowQueries: 0 },

        recommendations: [
          ...(memoryHealth.success && memoryHealth.data
            ? memoryHealth.data.recommendations
            : []),
          ...(cacheAnalytics.success && cacheAnalytics.data
            ? cacheAnalytics.data.recommendations
            : []),
          ...(dbMetrics.success && dbMetrics.data
            ? dbMetrics.data.recommendations
            : []),
        ],
      };

      setMetrics(combinedMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error("Failed to fetch performance metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "RealTimePerformanceDashboard",
      });
    } finally {
      setLoading(false);
    }
  };

  const { start: startRefreshing, stop: stopRefreshing } = useInterval(fetchMetrics, {
    intervalMs: STANDARD_INTERVALS.DEFAULT_MONITORING,
    autoStart: autoRefresh,
    runImmediately: true,
    onError: (error) => {
      logger.error("Failed to fetch performance metrics", {
        error: error.message,
        component: "RealTimePerformanceDashboard",
      });
      setLoading(false);
    },
  });

  useEffect(() => {
    if (autoRefresh) {
      startRefreshing();
    } else {
      stopRefreshing();
    }
  }, [autoRefresh, startRefreshing, stopRefreshing]);

  const handleOptimize = async (service: "memory" | "cache" | "database") => {
    try {
      switch (service) {
        case "memory":
          await AIMemoryOptimizationService.optimizeAIMemory();
          break;
        case "cache":
          await AdvancedCacheStrategiesService.optimizeCachePerformance();
          break;
        case "database":
          await DatabaseQueryOptimizationService.optimizeConnectionPool();
          break;
      }
      await fetchMetrics();
    } catch (error) {
      logger.error(`Failed to optimize ${service}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        component: "RealTimePerformanceDashboard",
        service,
      });
    }
  };

  const getProgressBarColor = useCallback((
    value: number,
    thresholds: { warning: number; critical: number },
  ) => {
    if (value >= thresholds.critical) return "bg-red-500";
    if (value >= thresholds.warning) return "bg-yellow-500";
    return "bg-green-500";
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  }, []);

  const memoryEfficiency = useMemo(() => {
    return metrics.memory.pressure <= 0.5
      ? 100 - metrics.memory.pressure * 50
      : 50;
  }, [metrics.memory.pressure]);

  const databaseEfficiency = useMemo(() => {
    return metrics.database.queryTime <= 200
      ? 100 - metrics.database.queryTime / 10
      : 80;
  }, [metrics.database.queryTime]);

  const overallPerformanceScore = useMemo(() => {
    return Math.round(
      memoryEfficiency * 0.3 +
      metrics.cache.performanceScore * 0.4 +
      databaseEfficiency * 0.3,
    );
  }, [memoryEfficiency, metrics.cache.performanceScore, databaseEfficiency]);

  const memoryPressurePercent = useMemo(() => {
    return Math.round(metrics.memory.pressure * 100);
  }, [metrics.memory.pressure]);

  const cacheHitRatePercent = useMemo(() => {
    return Math.round(metrics.cache.hitRate);
  }, [metrics.cache.hitRate]);

  const cachePerformanceScore = useMemo(() => {
    return Math.round(metrics.cache.performanceScore);
  }, [metrics.cache.performanceScore]);

  const dbConnectionUtilization = useMemo(() => {
    return Math.round(metrics.database.connectionUtilization);
  }, [metrics.database.connectionUtilization]);

  const dbQueryTime = useMemo(() => {
    return Math.round(metrics.database.queryTime);
  }, [metrics.database.queryTime]);

  if (loading) {
    return (
      <main className="p-6" aria-busy="true" aria-label="Loading performance metrics">
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
        <p className="sr-only">Loading performance metrics...</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Real-Time Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1" aria-live="polite" aria-atomic="true">
            Last updated: {formatStandardTime(lastUpdate)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
              id="auto-refresh-toggle"
            />
            <span className="text-sm text-gray-700" id="auto-refresh-label">
              Auto-refresh
            </span>
          </label>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Refresh dashboard data"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Performance metrics">
        <article className="bg-white p-6 rounded-lg shadow-md border border-gray-200" aria-labelledby="ai-memory-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="ai-memory-title" className="text-lg font-semibold text-gray-900">AI Memory</h2>
            <span
              className={`text-sm font-medium ${getStatusColor(metrics.memory.status)}`}
              aria-label={`Memory status: ${metrics.memory.status}`}
            >
              {metrics.memory.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Memory Pressure</span>
                <span>{memoryPressurePercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={memoryPressurePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Memory pressure">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(memoryPressurePercent, { warning: 60, critical: 80 })}`}
                  style={{ width: `${memoryPressurePercent}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-2xl font-bold text-gray-900" aria-label={`Memory usage: ${memoryPressurePercent} percent`}>
                {memoryPressurePercent}%
              </div>
              <div className="text-sm text-gray-600">Memory Usage</div>
            </div>
          </div>

          <button
            onClick={() => handleOptimize("memory")}
            className="mt-4 w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Optimize AI memory performance"
          >
            Optimize Memory
          </button>
        </article>

        <article className="bg-white p-6 rounded-lg shadow-md border border-gray-200" aria-labelledby="cache-performance-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="cache-performance-title" className="text-lg font-semibold text-gray-900">
              Cache Performance
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Hit Rate</span>
                <span>{cacheHitRatePercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={cacheHitRatePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Cache hit rate">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(cacheHitRatePercent, { warning: 70, critical: 50 })}`}
                  style={{ width: `${cacheHitRatePercent}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-2xl font-bold text-gray-900" aria-label={`Cache performance score: ${cachePerformanceScore}`}>
                {cachePerformanceScore}
              </div>
              <div className="text-sm text-gray-600">Performance Score</div>
            </div>
          </div>

          <button
            onClick={() => handleOptimize("cache")}
            className="mt-4 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Optimize cache performance"
          >
            Optimize Cache
          </button>
        </article>

        <article className="bg-white p-6 rounded-lg shadow-md border border-gray-200" aria-labelledby="database-title">
          <div className="flex items-center justify-between mb-4">
            <h2 id="database-title" className="text-lg font-semibold text-gray-900">Database</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
              <span className="text-sm text-green-600 font-medium">
                Connected
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Connection Utilization</span>
                <span>
                  {dbConnectionUtilization}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={dbConnectionUtilization} aria-valuemin={0} aria-valuemax={100} aria-label="Database connection utilization">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(dbConnectionUtilization, { warning: 70, critical: 85 })}`}
                  style={{
                    width: `${dbConnectionUtilization}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-2xl font-bold text-gray-900" aria-label={`Average query time: ${dbQueryTime} milliseconds`}>
                {dbQueryTime}ms
              </div>
              <div className="text-sm text-gray-600">Avg Query Time</div>
            </div>
          </div>

          <button
            onClick={() => handleOptimize("database")}
            className="mt-4 w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Optimize database performance"
          >
            Optimize Database
          </button>
        </article>
      </section>

      {metrics.recommendations.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4" aria-labelledby="recommendations-title">
          <h3 id="recommendations-title" className="text-lg font-semibold text-yellow-800 mb-3">
            Performance Recommendations
          </h3>
          <ul className="space-y-2" role="list">
            {metrics.recommendations
              .slice(0, 5)
              .map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" aria-hidden="true"></div>
                  </div>
                  <span className="text-yellow-700 text-sm">
                    {recommendation}
                  </span>
                </li>
              ))}
          </ul>
          {metrics.recommendations.length > 5 && (
            <p className="text-yellow-600 text-sm mt-2" role="status">
              +{metrics.recommendations.length - 5} more recommendations
            </p>
          )}
        </section>
      )}

      <section className="bg-white rounded-lg shadow-md border border-gray-200 p-6" aria-labelledby="overall-score-title">
        <h2 id="overall-score-title" className="text-lg font-semibold text-gray-900 mb-4">
          Overall Performance Score
        </h2>
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900" aria-label={`Overall performance score: ${overallPerformanceScore} out of 100`}>
              {overallPerformanceScore}
            </div>
            <div className="text-sm text-gray-600 mt-1">Overall Score</div>
          </div>
          <div className="flex-1 space-y-2" role="list">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Memory Efficiency</span>
              <span className="text-gray-900 font-medium">
                {memoryEfficiency.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cache Performance</span>
              <span className="text-gray-900 font-medium">
                {cachePerformanceScore}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Database Efficiency</span>
              <span className="text-gray-900 font-medium">
                {databaseEfficiency.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
