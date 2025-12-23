import { NextRequest, NextResponse } from "next/server";
import { monitoringService } from "@/lib/monitoring";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get("detailed") === "true";

  try {
    // Get basic system health
    const systemHealth = await monitoringService.getSystemHealth();

    // Add application-specific checks
    const appChecks = {
      nextjs: {
        service: "nextjs",
        status: "healthy" as const,
        responseTime: 0,
        metadata: {
          version: process.env.npm_package_version || "1.0.0",
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        },
      },

      auth: {
        service: "auth",
        status: process.env.CLERK_SECRET_KEY
          ? ("healthy" as const)
          : ("degraded" as const),
        responseTime: 0,
        metadata: {
          configured: !!process.env.CLERK_SECRET_KEY,
          provider: "clerk",
        },
      },

      payments: {
        service: "payments",
        status: process.env.STRIPE_SECRET_KEY
          ? ("healthy" as const)
          : ("degraded" as const),
        responseTime: 0,
        metadata: {
          configured: !!process.env.STRIPE_SECRET_KEY,
          provider: "stripe",
        },
      },
    };

    const allChecks = [...systemHealth.checks, ...Object.values(appChecks)];

    // Determine overall status
    const statuses = allChecks.map((check) => check.status);
    let overallStatus: "healthy" | "degraded" | "unhealthy";

    if (statuses.every((status) => status === "healthy")) {
      overallStatus = "healthy";
    } else if (statuses.some((status) => status === "unhealthy")) {
      overallStatus = "unhealthy";
    } else {
      overallStatus = "degraded";
    }

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
              status !== "healthy" && "error" in rest ? rest.error : undefined,
          })),
    };

    // Return appropriate HTTP status
    const httpStatus =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
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
