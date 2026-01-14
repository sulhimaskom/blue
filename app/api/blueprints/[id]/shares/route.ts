import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const GetBlueprintSharesSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: blueprintId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const url = new URL(req.url);
      const query = Object.fromEntries(url.searchParams);

      const validationResult = GetBlueprintSharesSchema.safeParse(query);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid query parameters",
            details: validationResult.error.errors,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const { page, limit } = validationResult.data;

      const result = await BlueprintSharingService.getBlueprintShares({
        blueprintId,
        userId: user!.id,
        page,
        limit,
      });

      logger.userAction("Blueprint shares fetched", user!.clerkId, {
        requestId: context.requestId,
        blueprintId,
        totalShares: result.pagination.total,
      });

      return {
        shares: result.shares,
        pagination: result.pagination,
        message: "Blueprint shares retrieved successfully",
      };
    },
  })(req);
}
