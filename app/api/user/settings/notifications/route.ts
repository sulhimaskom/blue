import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { UserSettingsService } from "@/lib/services/user-settings-service";
import { NotificationPreferencesService } from "@/lib/services/notification-preferences-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError } from "@/lib/api-utils";

const deliveryChannelsSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  push: z.boolean().optional(),
  webhook: z.boolean().optional(),
});

const doNotDisturbSchema = z.object({
  enabled: z.boolean().optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
});

const categoryPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  overrideDnd: z.boolean().optional(),
});

const categoriesSchema = z.object({
  critical: categoryPreferencesSchema.optional(),
  important: categoryPreferencesSchema.optional(),
  informational: categoryPreferencesSchema.optional(),
});

const notificationPreferencesSchema = z.object({
  blueprintGeneration: z.boolean().optional(),
  deployment: z.boolean().optional(),
  credits: z.boolean().optional(),
  teamInvites: z.boolean().optional(),
  projectShares: z.boolean().optional(),
  blueprintShares: z.boolean().optional(),
  marketing: z.boolean().optional(),
  deliveryChannels: deliveryChannelsSchema.optional(),
  frequency: z.enum(["immediate", "batched", "hourly", "daily", "weekly"]).optional(),
  doNotDisturb: doNotDisturbSchema.optional(),
  categories: categoriesSchema.optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    const settings = await UserSettingsService.getUserSettings(user!.id);

    const deliveryChannels = await NotificationPreferencesService.getDeliveryChannels(user!.id);
    const frequency = await NotificationPreferencesService.getFrequency(user!.id);
    const doNotDisturb = await NotificationPreferencesService.getDoNotDisturb(user!.id);
    const categories = await NotificationPreferencesService.getCategories(user!.id);

    logger.userAction("Notification preferences fetched", user!.clerkId, {
      requestId: context.requestId,
      settingsId: settings.id,
    });

    return {
      notificationPreferences: {
        ...settings.notificationPreferences,
        deliveryChannels,
        frequency,
        doNotDisturb,
        categories,
      },
      message: "Notification preferences retrieved successfully",
    };
  },
}, {
  ttl: 600,
  tags: ["user-settings", "notifications"],
  varyBy: ["userId"],
});

export const PUT = APIRouteHandler.createPOSTHandler({
  schema: notificationPreferencesSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const { deliveryChannels, frequency, doNotDisturb, categories, ...basicPreferences } = data!;

    let updatedSettings = await UserSettingsService.updateNotificationPreferences(
      user!.id,
      basicPreferences,
      user!.clerkId,
    );

    if (deliveryChannels) {
      await NotificationPreferencesService.updateDeliveryChannels(
        user!.id,
        deliveryChannels,
        user!.clerkId,
      );
    }

    if (frequency) {
      await NotificationPreferencesService.updateFrequency(
        user!.id,
        frequency,
        user!.clerkId,
      );
    }

    if (doNotDisturb) {
      await NotificationPreferencesService.updateDoNotDisturb(
        user!.id,
        doNotDisturb,
        user!.clerkId,
      );
    }

    if (categories) {
      await NotificationPreferencesService.updateCategories(
        user!.id,
        categories as any,
        user!.clerkId,
      );
    }

    updatedSettings = await UserSettingsService.getUserSettings(user!.id);

    const finalDeliveryChannels = await NotificationPreferencesService.getDeliveryChannels(user!.id);
    const finalFrequency = await NotificationPreferencesService.getFrequency(user!.id);
    const finalDoNotDisturb = await NotificationPreferencesService.getDoNotDisturb(user!.id);
    const finalCategories = await NotificationPreferencesService.getCategories(user!.id);

    logger.userAction("Notification preferences updated", user!.clerkId, {
      requestId: context.requestId,
      settingsId: updatedSettings.id,
    });

    return {
      notificationPreferences: {
        ...updatedSettings.notificationPreferences,
        deliveryChannels: finalDeliveryChannels,
        frequency: finalFrequency,
        doNotDisturb: finalDoNotDisturb,
        categories: finalCategories,
      },
      message: "Notification preferences updated successfully",
    };
  },
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: z.object({
    action: z.enum(["reset"]),
  }),
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    if (data!.action === "reset") {
      const resetPreferences = await NotificationPreferencesService.resetToDefaults(
        user!.id,
        user!.clerkId,
      );

      logger.userAction("Notification preferences reset", user!.clerkId, {
        requestId: context.requestId,
      });

      return {
        notificationPreferences: resetPreferences,
        message: "Notification preferences reset to defaults successfully",
      };
    }

    throw new ValidationError("Invalid action");
  },
});
