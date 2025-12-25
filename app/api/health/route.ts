import { NextRequest, NextResponse } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { monitoringService } from "@/lib/monitoring";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";

export async function GET(req: NextRequest) {
  return APIRouteHandler.createSimpleCachedGETHandler(
    async (req: NextRequest) => {
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

      return {
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
    },
    {
      ttl: 45, // Optimized: Balanced 45 seconds allows quicker health status detection
      tags: ["health-check", "system-status", "dashboard"],
      varyBy: [], // Health checks are the same for all users
      initializeServices: true, // Enable runtime service initialization
      getStatus: (data) => {
        // Return appropriate HTTP status based on health
        return data.status === "healthy"
          ? 200
          : data.status === "degraded"
            ? 200
            : 503;
      },
    },
  )(req);
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
