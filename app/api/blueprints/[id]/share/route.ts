import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ShareBlueprintSchema = z.object({
  emails: z.array(z.string().email()).optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  permission: z.enum(["read_only", "edit"]),
  expiresInDays: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: blueprintId } = await params;

  return APIRouteHandler.createPOSTHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    schema: ShareBlueprintSchema,
    handler: async ({ context, user, data }) => {
      const { emails, teamIds, permission, expiresInDays } = data!;

      const result = await BlueprintSharingService.shareBlueprint({
        blueprintId,
        sharedBy: user!.id,
        emails,
        teamIds,
        permission,
        expiresInDays,
      });

      logger.userAction("Blueprint shared", user!.clerkId, {
        requestId: context.requestId,
        blueprintId,
        sharesCreated: result.sharedWithCount,
        permission,
      });

      return {
        shares: result.shares,
        sharedWithCount: result.sharedWithCount,
        message: result.message,
      };
    },
  })(req);
}
