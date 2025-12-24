import { NextResponse } from "next/server";
import { monitoringService } from "@/lib/monitoring";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ValidationError } from "@/lib/api-utils";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { DatabasePerformanceMonitor } from "@/lib/db/performance-monitor";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  handler: async ({ req }) => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        const { searchParams } = new URL(req.url);
        const metricName = searchParams.get("metric");
        const summary = searchParams.get("summary") === "true";
        const limit = parseInt(searchParams.get("limit") || "100");

        if (summary && metricName) {
          // Get metric summary
          const metricSummary = monitoringService.getMetricSummary(metricName);

          if (!metricSummary) {
            throw new ValidationError("Metric not found", 404);
          }

          return NextResponse.json({
            metric: metricName,
            summary: metricSummary,
            timestamp: new Date().toISOString(),
          });
        } else if (metricName) {
          // Get specific metric data
          const metrics = monitoringService.getMetrics(metricName, limit);

          return NextResponse.json({
            metric: metricName,
            data: metrics,
            count: metrics.length,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Get all available metrics with latest data
          const metrics = monitoringService.getMetrics(undefined, limit);
          const metricNames = [...new Set(metrics.map((m) => m.name))];

          const summaries: Record<string, any> = {};
          for (const name of metricNames) {
            summaries[name] = monitoringService.getMetricSummary(name);
          }

          // Add circuit breaker metrics to the response
          const circuitBreakerMetrics = circuitBreakerRegistry.getAllMetrics();
          const circuitBreakerSummaries: Record<string, any> = {};

          for (const [name, metrics] of Object.entries(circuitBreakerMetrics)) {
            circuitBreakerSummaries[name] = {
              state: metrics.state,
              successRate:
                metrics.totalCalls > 0
                  ? Math.round(
                      (metrics.totalSuccesses / metrics.totalCalls) * 100,
                    )
                  : 100,
              availability:
                metrics.state === "CLOSED" || metrics.state === "HALF_OPEN",
              totalCalls: metrics.totalCalls,
              failureCount: metrics.failureCount,
              lastFailureTime: metrics.lastFailureTime
                ? new Date(metrics.lastFailureTime).toISOString()
                : null,
              lastSuccessTime: metrics.lastSuccessTime
                ? new Date(metrics.lastSuccessTime).toISOString()
                : null,
            };
          }

          // Add database performance metrics
          const dbPerformanceMetrics =
            DatabasePerformanceMonitor.getPerformanceMetrics();
          const dbRecommendations =
            DatabasePerformanceMonitor.getPerformanceRecommendations();
          const realTimeIndicators =
            await DatabasePerformanceMonitor.getRealTimePerformanceIndicators();

          return NextResponse.json({
            metrics: metricNames,
            summaries,
            circuitBreakers: {
              states: circuitBreakerMetrics,
              summaries: circuitBreakerSummaries,
              healthScore: (() => {
                const openCircuits = circuitBreakerRegistry.getOpenCircuits();
                const totalCircuits = Object.keys(circuitBreakerMetrics).length;
                const healthyCircuits = totalCircuits - openCircuits.length;
                return totalCircuits > 0
                  ? Math.round((healthyCircuits / totalCircuits) * 100)
                  : 100;
              })(),
            },
            database: {
              performance: dbPerformanceMetrics,
              recommendations: dbRecommendations,
              realTime: realTimeIndicators,
            },
            recent: metrics.slice(0, 50), // Latest 50 metrics across all types
            timestamp: new Date().toISOString(),
          });
        }
      },
      {
        ttl: 10, // Cache for 10 seconds - metrics change frequently
        tags: ["metrics", "performance-data"],
        varyBy: [], // Metrics are the same for all users
      },
    );
  },
});
