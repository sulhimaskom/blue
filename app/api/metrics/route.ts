import { monitoringService } from "@/lib/monitoring";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ValidationError } from "@/lib/api-utils";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false,
  handler: async ({ req }) => {
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

      return {
        metric: metricName,
        summary: metricSummary,
        timestamp: new Date().toISOString(),
      };
    } else if (metricName) {
      // Get specific metric data
      const metrics = monitoringService.getMetrics(metricName, limit);

      return {
        metric: metricName,
        data: metrics,
        count: metrics.length,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Get all available metrics with latest data
      const metrics = monitoringService.getMetrics(undefined, limit);
      const metricNames = [...new Set(metrics.map((m) => m.name))];

      const summaries: Record<string, any> = {};
      for (const name of metricNames) {
        summaries[name] = monitoringService.getMetricSummary(name);
      }

      return {
        metrics: metricNames,
        summaries,
        recent: metrics.slice(0, 50), // Latest 50 metrics across all types
        timestamp: new Date().toISOString(),
      };
    }
  },
});
