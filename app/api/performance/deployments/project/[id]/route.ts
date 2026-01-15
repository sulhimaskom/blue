import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      await ProjectDataService.verifyProjectOwnership(id, user!.clerkId);

      const projectMetrics = performanceMonitorService.getDeploymentMetricsByProject(id);

      logger.userAction("Project deployment metrics fetched", user!.clerkId, {
        requestId: context.requestId,
        projectId: id,
        metricsCount: projectMetrics.length,
      });

      return {
        projectId: id,
        deploymentMetrics: projectMetrics,
        totalDeployments: projectMetrics.length,
      };
    },
  })(_req);
}
