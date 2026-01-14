import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { NotificationService } from "@/lib/services/notification-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const GetNotificationsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  unreadOnly: z.string().optional().transform((val) => val === "true"),
  type: z.enum(["blueprint_complete", "team_invitation", "deployment_status", "credit_warning", "blueprint_shared"]).optional(),
});

interface RouteParams {
  params: Promise<{}>;
}

export async function GET(req: NextRequest, { params: _ }: RouteParams) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);

  const validationResult = GetNotificationsQuerySchema.safeParse(query);
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

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const { page, limit, unreadOnly, type } = validationResult.data;

      const result = await NotificationService.getNotifications({
        clerkId: user!.clerkId,
        page,
        limit,
        unreadOnly,
        type: type as any,
      });

      logger.userAction("Notifications fetched", user!.clerkId, {
        requestId: context.requestId,
        count: result.notifications.length,
        unreadCount: result.pagination.unreadCount,
      });

      return {
        notifications: result.notifications,
        pagination: result.pagination,
        message: "Notifications retrieved successfully",
      };
    },
  })(req);
}