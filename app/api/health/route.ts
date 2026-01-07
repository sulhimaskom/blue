import { NextRequest, NextResponse } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { monitoringService } from "@/lib/monitoring";
import { APIMetricsService } from "@/lib/services/api-metrics-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  return APIRouteHandler.createSimpleCachedGETHandler(
    async (req: NextRequest) => {
      const { searchParams } = new URL(req.url);
      const detailed = searchParams.get("detailed") === "true";

      try {
        // Get basic system health with error handling
        let systemHealth;
        try {
          systemHealth = await monitoringService.getSystemHealth();
        } catch (error) {
          logger.warn("System health check failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          systemHealth = {
            checks: [
              {
                service: "system",
                status: "degraded" as const,
                error:
                  error instanceof Error
                    ? error.message
                    : "System health check failed",
              },
            ],
            status: "degraded" as const,
            uptime: 0,
          };
        }

        // Application health checks via service with error handling
        let appChecks;
        try {
          appChecks = APIMetricsService.getApplicationHealthChecks();
        } catch (error) {
          logger.warn("Application health checks failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          appChecks = {
            "api-metrics": {
              service: "api-metrics",
              status: "degraded" as const,
              error:
                error instanceof Error
                  ? error.message
                  : "Application health checks failed",
            },
          };
        }

        const allChecks = [...systemHealth.checks, ...Object.values(appChecks)];

        // Determine overall status using service logic
        const overallStatus = APIMetricsService.calculateOverallSystemStatus({
          checks: allChecks,
        });

        // Get database cache statistics with error handling
        let dbCacheHealth;
        try {
          const dbCacheStats = DatabaseQueryCache.getCacheStats();
          dbCacheHealth = {
            service: "database-query-cache",
            status: dbCacheStats.hitRate > 0.3 ? "healthy" : "degraded",
            metrics: {
              hitRate: Math.round(dbCacheStats.hitRate * 100),
              totalQueries: dbCacheStats.totalQueries,
              avgQueryTime: Math.round(dbCacheStats.avgQueryTime),
            },
          };
        } catch (error) {
          logger.warn("Database cache stats failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          dbCacheHealth = {
            service: "database-query-cache",
            status: "degraded" as const,
            error:
              error instanceof Error
                ? error.message
                : "Database cache stats unavailable",
          };
        }

        const allEnhancedChecks = [...allChecks, dbCacheHealth];

        const result = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: systemHealth?.uptime || 0,
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

        return result;
      } catch (globalError) {
        logger.error("Health endpoint global error", {
          error:
            globalError instanceof Error
              ? globalError.message
              : "Unknown error",
        });
        return {
          status: "degraded",
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development",
          checks: [
            {
              service: "health-endpoint",
              status: "degraded" as const,
              error:
                globalError instanceof Error
                  ? globalError.message
                  : "Health check failed",
            },
          ],
        };
      }
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
    logger.warn("HEAD health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new NextResponse(null, { status: 200 }); // Return 200 instead of 503 to allow service degradation
  }
}
