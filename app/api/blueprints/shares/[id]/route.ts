import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: shareId } = await params;

  return APIRouteHandler.createDELETEHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user }) => {
      const result = await BlueprintSharingService.revokeShare(
        shareId,
        user!.id,
      );

      logger.userAction("Blueprint share revoked", user!.clerkId, {
        requestId: context.requestId,
        shareId,
      });

      return {
        message: result.message,
      };
    },
  })(req);
}
