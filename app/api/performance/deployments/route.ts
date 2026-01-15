import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { logger } from "@/lib/logger";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context }) => {
    const summary = performanceMonitorService.getDeploymentMetricsSummary();

    logger.userAction("Deployment metrics summary fetched", "system", {
      requestId: context.requestId,
      totalDeployments: summary.totalDeployments,
    });

    return {
      summary,
    };
  },
});
