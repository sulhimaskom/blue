import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UserSettingsService } from "@/lib/services/user-settings-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const uiPreferencesSchema = z.object({
  compactView: z.boolean().optional(),
  sidebarPosition: z.enum(["left", "right", "hidden"]).optional(),
  dashboardLayout: z.enum(["grid", "list", "cards"]).optional(),
  showMetrics: z.boolean().optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const settings = await UserSettingsService.getUserSettings(user!.id);

    logger.userAction("UI preferences fetched", user!.clerkId, {
      requestId: context.requestId,
      settingsId: settings.id,
    });

    return {
      uiPreferences: settings.uiPreferences,
      message: "UI preferences retrieved successfully",
    };
  },
}, {
  ttl: 600,
  tags: ["user-settings", "ui-preferences"],
  varyBy: ["userId"],
});

export const PUT = APIRouteHandler.createPOSTHandler({
  schema: uiPreferencesSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const updatedSettings = await UserSettingsService.updateUIPreferences(
      user!.id,
      data!,
      user!.clerkId,
    );

    logger.userAction("UI preferences updated", user!.clerkId, {
      requestId: context.requestId,
      settingsId: updatedSettings.id,
    });

    return {
      uiPreferences: updatedSettings.uiPreferences,
      message: "UI preferences updated successfully",
    };
  },
});
