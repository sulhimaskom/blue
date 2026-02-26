import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { NotificationPreferencesService } from "@/lib/services/notification-preferences-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NOTIFICATION_CATEGORIES } from "@/lib/constants/notification-categories";

const updateCategoriesSchema = z.object({
  critical: z.object({
    enabled: z.boolean().optional(),
    overrideDnd: z.boolean().optional(),
  }).optional(),
  important: z.object({
    enabled: z.boolean().optional(),
    overrideDnd: z.boolean().optional(),
  }).optional(),
  informational: z.object({
    enabled: z.boolean().optional(),
    overrideDnd: z.boolean().optional(),
  }).optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    logger.userAction("Notification categories fetched", user!.clerkId, {
      requestId: context.requestId,
    });

    return {
      categories: NOTIFICATION_CATEGORIES,
      message: "Notification categories retrieved successfully",
    };
  },
}, {
  ttl: 3600,
  tags: ["user-settings", "notifications"],
  varyBy: [],
});

export const PUT = APIRouteHandler.createPOSTHandler<z.infer<typeof updateCategoriesSchema>>({
  schema: updateCategoriesSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const updatedCategories = await NotificationPreferencesService.updateCategories(
      user!.id,
      data!,
      user!.clerkId,
    );

    logger.userAction("Notification categories updated", user!.clerkId, {
      requestId: context.requestId,
      categories: updatedCategories,
    });

    return {
      categories: updatedCategories,
      message: "Notification categories updated successfully",
    };
  },
});
