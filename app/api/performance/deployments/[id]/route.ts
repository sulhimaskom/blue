import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { NotFoundError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context }) => {
      const deploymentMetric = performanceMonitorService.getDeploymentMetric(id);

      if (!deploymentMetric) {
        throw new NotFoundError(`Deployment metric not found for deployment ID: ${id}`);
      }

      logger.userAction("Deployment metric fetched", "system", {
        requestId: context.requestId,
        deploymentId: id,
      });

      return {
        deploymentMetric,
      };
    },
  })(_req);
}
