import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ValidationError, DatabaseError, NotFoundError } from "@/lib/api-utils";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";

const deliveryChannelsSchema = z.object({
  email: z.boolean().default(true),
  inApp: z.boolean().default(true),
  push: z.boolean().default(false),
  webhook: z.boolean().default(false),
});

const frequencyEnum = z.enum(["immediate", "batched", "hourly", "daily", "weekly"]);

const doNotDisturbSchema = z.object({
  enabled: z.boolean().default(false),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default("22:00"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default("08:00"),
  timezone: z.string().default("UTC"),
});

const categoryPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  overrideDnd: z.boolean().default(false),
});

const partialCategoryPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  overrideDnd: z.boolean().optional(),
});

const categoriesSchema = z.object({
  critical: categoryPreferencesSchema.optional(),
  important: categoryPreferencesSchema.optional(),
  informational: categoryPreferencesSchema.optional(),
});

const partialCategoriesSchema = z.object({
  critical: partialCategoryPreferencesSchema.optional(),
  important: partialCategoryPreferencesSchema.optional(),
  informational: partialCategoryPreferencesSchema.optional(),
});

const updateFrequencySchema = z.object({
  frequency: frequencyEnum.optional(),
});

const fullPreferencesSchema = z.object({
  deliveryChannels: deliveryChannelsSchema.optional(),
  frequency: frequencyEnum.optional(),
  doNotDisturb: doNotDisturbSchema.optional(),
  categories: categoriesSchema.optional(),
});

export type DeliveryChannels = z.infer<typeof deliveryChannelsSchema>;
export type DoNotDisturb = z.infer<typeof doNotDisturbSchema>;
export type CategoryPreferences = z.infer<typeof categoryPreferencesSchema>;
export type Categories = z.infer<typeof categoriesSchema>;
export type NotificationFrequency = z.infer<typeof frequencyEnum>;
export type FullNotificationPreferences = z.infer<typeof fullPreferencesSchema>;
export type PartialCategoryPreferences = Partial<CategoryPreferences>;
export type PartialCategories = {
  critical?: PartialCategoryPreferences;
  important?: PartialCategoryPreferences;
  informational?: PartialCategoryPreferences;
};

const DEFAULT_DELIVERY_CHANNELS: DeliveryChannels = {
  email: true,
  inApp: true,
  push: false,
  webhook: false,
};

const DEFAULT_DO_NOT_DISTURB: DoNotDisturb = {
  enabled: false,
  startTime: "22:00",
  endTime: "08:00",
  timezone: "UTC",
};

const DEFAULT_CATEGORIES: Categories = {
  critical: {
    enabled: true,
    overrideDnd: true,
  },
  important: {
    enabled: true,
    overrideDnd: false,
  },
  informational: {
    enabled: true,
    overrideDnd: false,
  },
};

export const NOTIFICATION_CATEGORIES = [
  { id: "critical", name: "Critical", description: "System alerts and urgent notifications", color: "red" },
  { id: "important", name: "Important", description: "Business-critical updates", color: "orange" },
  { id: "informational", name: "Informational", description: "General updates and announcements", color: "blue" },
] as const;

export const NOTIFICATION_FREQUENCIES = [
  { id: "immediate", name: "Immediate", description: "Send notifications as they arrive" },
  { id: "batched", name: "Batched", description: "Send notifications in batches every 15 minutes" },
  { id: "hourly", name: "Hourly", description: "Send notifications in hourly digests" },
  { id: "daily", name: "Daily", description: "Send notifications in daily digests" },
  { id: "weekly", name: "Weekly", description: "Send notifications in weekly digests" },
] as const;

export class NotificationPreferencesService {
  static async getDeliveryChannels(userId: number): Promise<DeliveryChannels> {
    try {
      const { userSettings } = await this.getUserSettingsWithDefaults(userId);
      return userSettings.notificationPreferences?.deliveryChannels || DEFAULT_DELIVERY_CHANNELS;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to get delivery channels", { userId, error });
      throw new DatabaseError("Failed to retrieve delivery channels");
    }
  }

  static async updateDeliveryChannels(
    userId: number,
    channels: Partial<DeliveryChannels>,
    clerkId?: string,
  ): Promise<DeliveryChannels> {
    try {
      const validatedChannels = deliveryChannelsSchema.parse(channels);
      const { userSettings, database } = await this.getUserSettingsWithDefaults(userId);

      const currentChannels = userSettings.notificationPreferences?.deliveryChannels || DEFAULT_DELIVERY_CHANNELS;
      const updatedChannels = { ...currentChannels, ...validatedChannels };

      await database
        .update(userSettings)
        .set({
          notificationPreferences: {
            ...userSettings.notificationPreferences,
            deliveryChannels: updatedChannels,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      await UnifiedCacheManager.invalidateByTag("user-settings");

      logger.userAction("Notification delivery channels updated", clerkId || userId.toString(), {
        channels: updatedChannels,
      });

      return updatedChannels;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid delivery channels data");
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update delivery channels", { userId, error });
      throw new DatabaseError("Failed to update delivery channels");
    }
  }

  static async getFrequency(userId: number): Promise<string> {
    try {
      const { userSettings } = await this.getUserSettingsWithDefaults(userId);
      return userSettings.notificationPreferences?.frequency || "immediate";
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to get notification frequency", { userId, error });
      throw new DatabaseError("Failed to retrieve notification frequency");
    }
  }

  static async updateFrequency(
    userId: number,
    frequency: string,
    clerkId?: string,
  ): Promise<string> {
    try {
      const validatedFrequency = updateFrequencySchema.parse({ frequency });
      const { userSettings, database } = await this.getUserSettingsWithDefaults(userId);

      await database
        .update(userSettings)
        .set({
          notificationPreferences: {
            ...userSettings.notificationPreferences,
            frequency: validatedFrequency.frequency || frequency,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      await UnifiedCacheManager.invalidateByTag("user-settings");

      const finalFrequency = validatedFrequency.frequency || frequency;
      logger.userAction("Notification frequency updated", clerkId || userId.toString(), {
        frequency: finalFrequency,
      });

      return finalFrequency;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid frequency value");
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update notification frequency", { userId, error });
      throw new DatabaseError("Failed to update notification frequency");
    }
  }

  static async getDoNotDisturb(userId: number): Promise<DoNotDisturb> {
    try {
      const { userSettings } = await this.getUserSettingsWithDefaults(userId);
      return userSettings.notificationPreferences?.doNotDisturb || DEFAULT_DO_NOT_DISTURB;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to get do-not-disturb settings", { userId, error });
      throw new DatabaseError("Failed to retrieve do-not-disturb settings");
    }
  }

  static async updateDoNotDisturb(
    userId: number,
    settings: Partial<DoNotDisturb>,
    clerkId?: string,
  ): Promise<DoNotDisturb> {
    try {
      const validatedSettings = doNotDisturbSchema.parse(settings);
      const { userSettings, database } = await this.getUserSettingsWithDefaults(userId);

      const currentSettings = userSettings.notificationPreferences?.doNotDisturb || DEFAULT_DO_NOT_DISTURB;
      const updatedSettings = { ...currentSettings, ...validatedSettings };

      await database
        .update(userSettings)
        .set({
          notificationPreferences: {
            ...userSettings.notificationPreferences,
            doNotDisturb: updatedSettings,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      await UnifiedCacheManager.invalidateByTag("user-settings");

      logger.userAction("Do-not-disturb settings updated", clerkId || userId.toString(), {
        settings: updatedSettings,
      });

      return updatedSettings;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid do-not-disturb settings");
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update do-not-disturb settings", { userId, error });
      throw new DatabaseError("Failed to update do-not-disturb settings");
    }
  }

  static async getCategories(userId: number): Promise<Categories> {
    try {
      const { userSettings } = await this.getUserSettingsWithDefaults(userId);
      return userSettings.notificationPreferences?.categories || DEFAULT_CATEGORIES;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to get notification categories", { userId, error });
      throw new DatabaseError("Failed to retrieve notification categories");
    }
  }

  static async updateCategories(
    userId: number,
    categories: PartialCategories,
    clerkId?: string,
  ): Promise<Categories> {
    try {
      const validatedCategories = partialCategoriesSchema.parse(categories) as Partial<Categories>;
      const { userSettings, database } = await this.getUserSettingsWithDefaults(userId);

      const currentCategories = userSettings.notificationPreferences?.categories || DEFAULT_CATEGORIES;

      const mergeCategoryPreferences = (
        current: typeof categoryPreferencesSchema._type | undefined,
        update: typeof partialCategoryPreferencesSchema._type | undefined,
      ): typeof categoryPreferencesSchema._type => {
        if (!update) return current || { enabled: true, overrideDnd: false };
        if (!current) return update as typeof categoryPreferencesSchema._type;
        return { ...current, ...update };
      };

      const updatedCategories: Categories = {
        critical: mergeCategoryPreferences(currentCategories.critical, validatedCategories.critical),
        important: mergeCategoryPreferences(currentCategories.important, validatedCategories.important),
        informational: mergeCategoryPreferences(currentCategories.informational, validatedCategories.informational),
      };

      await database
        .update(userSettings)
        .set({
          notificationPreferences: {
            ...userSettings.notificationPreferences,
            categories: updatedCategories,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      await UnifiedCacheManager.invalidateByTag("user-settings");

      logger.userAction("Notification categories updated", clerkId || userId.toString(), {
        categories: updatedCategories,
      });

      return updatedCategories;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid notification categories data");
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update notification categories", { userId, error });
      throw new DatabaseError("Failed to update notification categories");
    }
  }

  static async resetToDefaults(userId: number, clerkId?: string): Promise<{
    deliveryChannels: DeliveryChannels;
    frequency: string;
    doNotDisturb: DoNotDisturb;
    categories: Categories;
  }> {
    try {
      const { userSettings, database } = await this.getUserSettingsWithDefaults(userId);

      const resetPreferences = {
        ...userSettings.notificationPreferences,
        deliveryChannels: DEFAULT_DELIVERY_CHANNELS,
        frequency: "immediate",
        doNotDisturb: DEFAULT_DO_NOT_DISTURB,
        categories: DEFAULT_CATEGORIES,
      };

      await database
        .update(userSettings)
        .set({
          notificationPreferences: resetPreferences,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));

      await Promise.all([
        UnifiedCacheManager.invalidateByTag("user-settings"),
        UnifiedCacheManager.invalidateByTag("notifications"),
      ]);

      logger.userAction("Notification preferences reset to defaults", clerkId || userId.toString(), {
        resetPreferences,
      });

      return {
        deliveryChannels: DEFAULT_DELIVERY_CHANNELS,
        frequency: "immediate",
        doNotDisturb: DEFAULT_DO_NOT_DISTURB,
        categories: DEFAULT_CATEGORIES,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to reset notification preferences", { userId, error });
      throw new DatabaseError("Failed to reset notification preferences");
    }
  }

  static isInDoNotDisturb(dndSettings: DoNotDisturb): boolean {
    if (!dndSettings.enabled) {
      return false;
    }

    try {
      const now = new Date();
      const currentTime = now.toISOString().substring(11, 16);
      const [currentHour, currentMinute] = currentTime.split(":").map(Number);

      const [startHour, startMinute] = dndSettings.startTime.split(":").map(Number);
      const [endHour, endMinute] = dndSettings.endTime.split(":").map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch (error) {
      logger.error("Failed to check do-not-disturb status", { error });
      return false;
    }
  }

  private static async getUserSettingsWithDefaults(userId: number): Promise<{
    userSettings: any;
    database: any;
  }> {
    const database = db();

    const [settings] = await database
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      throw new NotFoundError("User settings not found");
    }

    return { userSettings: settings, database };
  }
}
