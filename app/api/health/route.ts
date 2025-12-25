import { NextResponse, NextRequest } from "next/server";
import { monitoringService } from "@/lib/monitoring";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import { RuntimeServiceInitializer } from "@/lib/services/runtime-service-initializer";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { IntelligentPrefetchService } from "@/lib/services/intelligent-prefetch-service";
import { RealTimePerformanceMonitor } from "@/lib/services/real-time-performance-monitor";
import { withCompression } from "@/lib/middleware/compression-wrapper";
// Error monitoring imports for future use
// import {
//   captureApiError,
//   createMonitoredError,
// } from "@/lib/services/error-monitoring-service";

export async function GET(req: NextRequest) {
  return withCompression(async () => {
    // Initialize runtime services safely (won't run during build)
    await RuntimeServiceInitializer.initializeServices();

    // Initialize intelligent prefetch service for performance optimization
    await IntelligentPrefetchService.initialize();

    // Initialize real-time performance monitoring
    await RealTimePerformanceMonitor.initialize();

    return UnifiedCacheManager.withCache(
      req,
      async () => {
        const { searchParams } = new URL(req.url);
        const detailed = searchParams.get("detailed") === "true";

        // Get basic system health
        const systemHealth = await monitoringService.getSystemHealth();

        // Application health checks via service (eliminates code duplication)
        const appChecks = APIMetricsService.getApplicationHealthChecks();

        const allChecks = [...systemHealth.checks, ...Object.values(appChecks)];

        // Determine overall status using service logic
        const overallStatus = APIMetricsService.calculateOverallSystemStatus({
          checks: allChecks,
        });

        // Get database cache statistics
        const dbCacheStats = DatabaseQueryCache.getCacheStats();
        const dbCacheHealth = {
          service: "database-query-cache",
          status: dbCacheStats.hitRate > 0.3 ? "healthy" : "degraded",
          metrics: {
            hitRate: Math.round(dbCacheStats.hitRate * 100),
            totalQueries: dbCacheStats.totalQueries,
            avgQueryTime: Math.round(dbCacheStats.avgQueryTime),
          },
        };

        const allEnhancedChecks = [...allChecks, dbCacheHealth];

        const response = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: systemHealth.uptime,
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development",
          checks: detailed
            ? allEnhancedChecks
            : allEnhancedChecks.map(({ service, status, ...rest }) => ({
                service,
                status,
                error:
                  status !== "healthy" && "error" in rest
                    ? rest.error
                    : undefined,
              })),
        };

        // Return appropriate HTTP status
        const httpStatus =
          overallStatus === "healthy"
            ? 200
            : overallStatus === "degraded"
              ? 200
              : 503;

        return NextResponse.json(response, { status: httpStatus });
      },
      {
        ttl: 45, // Optimized: Cache for 45 seconds - smart caching for health status that changes gradually
        tags: ["health-check", "system-status"],
        varyBy: [], // Health checks are the same for all users
      },
    );
  }, req);
}

// Health check for load balancers (minimal response)
export async function HEAD() {
  try {
    const health = await monitoringService.getSystemHealth();
    return new NextResponse(null, {
      status: health.status === "healthy" ? 200 : 503,
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
