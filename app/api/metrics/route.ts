import { NextRequest, NextResponse } from "next/server";
import { monitoringService } from "@/lib/monitoring";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metricName = searchParams.get("metric");
  const summary = searchParams.get("summary") === "true";
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    if (summary && metricName) {
      // Get metric summary
      const metricSummary = monitoringService.getMetricSummary(metricName);

      if (!metricSummary) {
        return NextResponse.json(
          {
            error: "Metric not found",
            metric: metricName,
          },
          { status: 404 },
        );
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

      return NextResponse.json({
        metrics: metricNames,
        summaries,
        recent: metrics.slice(0, 50), // Latest 50 metrics across all types
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch metrics",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
