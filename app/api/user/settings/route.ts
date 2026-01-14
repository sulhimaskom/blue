import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UserSettingsService, updateSettingsSchema, type UpdateSettingsInput } from "@/lib/services/user-settings-service";
import { RateLimiters } from "@/lib/rate-limit-config";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const settings = await UserSettingsService.getOrCreateUserSettings(user!.id);

    logger.userAction("User settings fetched", user!.clerkId, {
      requestId: context.requestId,
      settingsId: settings.id,
    });

    return {
      settings,
      message: "Settings retrieved successfully",
    };
  },
});

export const PUT = APIRouteHandler.createPOSTHandler<UpdateSettingsInput>({
  schema: updateSettingsSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const updatedSettings = await UserSettingsService.updateUserSettings(
      user!.id,
      data!,
      user!.clerkId,
    );

    logger.userAction("User settings updated", user!.clerkId, {
      requestId: context.requestId,
      settingsId: updatedSettings.id,
    });

    return {
      settings: updatedSettings,
      message: "Settings updated successfully",
    };
  },
});

export const PATCH = APIRouteHandler.createPOSTHandler<UpdateSettingsInput>({
  schema: updateSettingsSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const updatedSettings = await UserSettingsService.updateUserSettings(
      user!.id,
      data!,
      user!.clerkId,
    );

    logger.userAction("User settings partially updated", user!.clerkId, {
      requestId: context.requestId,
      settingsId: updatedSettings.id,
    });

    return {
      settings: updatedSettings,
      message: "Settings partially updated successfully",
    };
  },
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: z.object({
    reset: z.boolean().default(true),
  }),
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user }) => {
    const resetSettings = await UserSettingsService.resetUserSettings(user!.id, user!.clerkId);

    logger.userAction("User settings reset", user!.clerkId, {
      requestId: context.requestId,
      settingsId: resetSettings.id,
    });

    return {
      settings: resetSettings,
      message: "Settings reset to defaults successfully",
    };
  },
});
