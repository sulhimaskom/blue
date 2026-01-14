import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: blueprintId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const stats = await BlueprintSharingService.getShareStats(
        blueprintId,
        user!.id,
      );

      logger.userAction("Blueprint share stats fetched", user!.clerkId, {
        requestId: context.requestId,
        blueprintId,
        totalShares: stats.totalShares,
        totalViews: stats.totalViews,
      });

      return {
        stats,
        message: "Blueprint share statistics retrieved successfully",
      };
    },
  })(req);
}
