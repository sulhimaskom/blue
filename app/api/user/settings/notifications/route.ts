import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UserSettingsService } from "@/lib/services/user-settings-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const notificationPreferencesSchema = z.object({
  blueprintGeneration: z.boolean().optional(),
  deployment: z.boolean().optional(),
  credits: z.boolean().optional(),
  teamInvites: z.boolean().optional(),
  projectShares: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const settings = await UserSettingsService.getUserSettings(user!.id);

    logger.userAction("Notification preferences fetched", user!.clerkId, {
      requestId: context.requestId,
      settingsId: settings.id,
    });

    return {
      notificationPreferences: settings.notificationPreferences,
      message: "Notification preferences retrieved successfully",
    };
  },
});

export const PUT = APIRouteHandler.createPOSTHandler({
  schema: notificationPreferencesSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const updatedSettings = await UserSettingsService.updateNotificationPreferences(
      user!.id,
      data!,
      user!.clerkId,
    );

    logger.userAction("Notification preferences updated", user!.clerkId, {
      requestId: context.requestId,
      settingsId: updatedSettings.id,
    });

    return {
      notificationPreferences: updatedSettings.notificationPreferences,
      message: "Notification preferences updated successfully",
    };
  },
});
