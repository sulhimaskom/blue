import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateSharePermissionSchema = z.object({
  permission: z.enum(["view", "edit", "fork", "admin"]),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id: shareId } = await params;

  return APIRouteHandler.createPUTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: UpdateSharePermissionSchema,
    handler: async ({ context, user, data }) => {
      const { permission } = data!;

      const result = await BlueprintSharingService.updateSharePermission(
        shareId,
        user!.id,
        permission,
      );

      logger.userAction("Blueprint share permission updated", user!.clerkId, {
        requestId: context.requestId,
        shareId,
        newPermission: permission,
      });

      return {
        message: result.message,
        share: result.share,
      };
    },
  })(req);
}
