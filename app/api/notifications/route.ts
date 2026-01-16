import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ValidationError } from "@/lib/api-utils";
import { NotificationService, NOTIFICATION_TYPES } from "@/lib/services/notification-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const GetNotificationsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  unreadOnly: z.string().optional().transform((val) => val === "true"),
  type: z.enum([...NOTIFICATION_TYPES]).optional(),
});

interface RouteParams {
  params: Promise<{}>;
}

export async function GET(req: NextRequest, { params: _ }: RouteParams) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);

  const validationResult = GetNotificationsQuerySchema.safeParse(query);
  if (!validationResult.success) {
    throw new ValidationError("Invalid query parameters");
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
        type,
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