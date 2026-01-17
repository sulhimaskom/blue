import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { BlueprintSharingService } from "@/lib/services/blueprint-sharing-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const GetAuditLogsSchema = z.object({
  page: z.string().optional().transform((val: string | undefined) => val ? parseInt(val, 10) : undefined),
  limit: z.string().optional().transform((val: string | undefined) => val ? parseInt(val, 10) : undefined),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: blueprintId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const url = new URL(req.url);
      const query = Object.fromEntries(url.searchParams);

      const validationResult = GetAuditLogsSchema.safeParse(query);
      if (!validationResult.success) {
        throw new ValidationError("Invalid query parameters");
      }

      const { page = 1, limit = 50 } = validationResult.data;

      const result = await BlueprintSharingService.getShareAuditLogs(
        blueprintId,
        user!.id,
        page,
        limit,
      );

      logger.userAction("Blueprint share audit logs fetched", user!.clerkId, {
        requestId: context.requestId,
        blueprintId,
        totalLogs: result.pagination.total,
      });

      return {
        logs: result.logs,
        pagination: result.pagination,
        message: "Audit logs retrieved successfully",
      };
    },
  })(req);
}
