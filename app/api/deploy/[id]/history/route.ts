import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ req }) => {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const page = parseInt(searchParams.page || "1", 10);
      const pageSize = parseInt(searchParams.pageSize || "20", 10);
      const status = searchParams.status as "pending" | "deployed" | "failed" | "deleted" | undefined;
      const environment = searchParams.environment as "production" | "staging" | "preview" | undefined;

      const result = await DeploymentHistoryService.getDeploymentHistory(
        id,
        page,
        pageSize,
        { status, environment }
      );

      return {
        ...result,
        message: "Deployment history retrieved successfully",
      };
    },
  })(req);
}
