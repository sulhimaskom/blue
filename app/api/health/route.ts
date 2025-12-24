import { NextResponse } from "next/server";
import { monitoringService } from "@/lib/monitoring";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { APIMetricsService } from "@/lib/services/api-metrics-service";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  handler: async ({ req }) => {
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

        const response = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: systemHealth.uptime,
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development",
          checks: detailed
            ? allChecks
            : allChecks.map(({ service, status, ...rest }) => ({
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
        ttl: 15, // Cache for 15 seconds - health data changes frequently
        tags: ["health-check", "system-status"],
        varyBy: [], // Health checks are the same for all users
      },
    );
  },
});

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
