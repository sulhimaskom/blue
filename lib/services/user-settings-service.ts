import { z } from "zod";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ValidationError, DatabaseError, NotFoundError } from "@/lib/api-utils";

const notificationPreferencesSchema = z.object({
  blueprintGeneration: z.boolean().optional(),
  deployment: z.boolean().optional(),
  credits: z.boolean().optional(),
  teamInvites: z.boolean().optional(),
  projectShares: z.boolean().optional(),
  blueprintShares: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

const uiPreferencesSchema = z.object({
  compactView: z.boolean().optional(),
  sidebarPosition: z.enum(["left", "right", "hidden"]).optional(),
  dashboardLayout: z.enum(["grid", "list", "cards"]).optional(),
  showMetrics: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  notificationPreferences: notificationPreferencesSchema.optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  defaultProjectVisibility: z.enum(["private", "team", "public"]).optional(),
  defaultBlueprintPricingPackage: z.enum(["basic", "standard", "premium", "enterprise"]).optional(),
  uiPreferences: uiPreferencesSchema.optional(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UIPreferences = z.infer<typeof uiPreferencesSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

interface UserSettingsResponse {
  id: string;
  userId: number;
  notificationPreferences: NotificationPreferences;
  theme: string;
  language: string;
  timezone: string;
  defaultProjectVisibility: string;
  defaultBlueprintPricingPackage: string;
  uiPreferences: UIPreferences;
  createdAt: Date;
  updatedAt: Date | null;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  blueprintGeneration: true,
  deployment: true,
  credits: true,
  teamInvites: true,
  projectShares: true,
  blueprintShares: true,
  marketing: false,
};

const DEFAULT_UI_PREFERENCES: UIPreferences = {
  compactView: false,
  sidebarPosition: "left",
  dashboardLayout: "cards",
  showMetrics: true,
};

export class UserSettingsService {
  static async getOrCreateUserSettings(userId: number): Promise<UserSettingsResponse> {
    try {
      const database = db();

      const [existingSettings] = await database
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .limit(1);

      if (existingSettings) {
        return {
          id: existingSettings.id,
          userId: existingSettings.userId,
          notificationPreferences: existingSettings.notificationPreferences as NotificationPreferences,
          theme: existingSettings.theme,
          language: existingSettings.language,
          timezone: existingSettings.timezone,
          defaultProjectVisibility: existingSettings.defaultProjectVisibility,
          defaultBlueprintPricingPackage: existingSettings.defaultBlueprintPricingPackage,
          uiPreferences: existingSettings.uiPreferences as UIPreferences,
          createdAt: existingSettings.createdAt,
          updatedAt: existingSettings.updatedAt,
        };
      }

      const [newSettings] = await database
        .insert(userSettings)
        .values({
          userId,
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          theme: "system",
          language: "en",
          timezone: "UTC",
          defaultProjectVisibility: "private",
          defaultBlueprintPricingPackage: "standard",
          uiPreferences: DEFAULT_UI_PREFERENCES,
        })
        .returning();

      logger.userAction("User settings created", userId.toString(), {
        settingsId: newSettings.id,
      });

      return {
        id: newSettings.id,
        userId: newSettings.userId,
        notificationPreferences: newSettings.notificationPreferences as NotificationPreferences,
        theme: newSettings.theme,
        language: newSettings.language,
        timezone: newSettings.timezone,
        defaultProjectVisibility: newSettings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: newSettings.defaultBlueprintPricingPackage,
        uiPreferences: newSettings.uiPreferences as UIPreferences,
        createdAt: newSettings.createdAt,
        updatedAt: newSettings.updatedAt,
      };
    } catch (error) {
      logger.error("Failed to get or create user settings", { userId, error });
      throw new DatabaseError("Failed to retrieve user settings");
    }
  }

  static async getUserSettings(userId: number): Promise<UserSettingsResponse> {
    try {
      const database = db();

      const [settings] = await database
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .limit(1);

      if (!settings) {
        throw new NotFoundError("User settings not found");
      }

      return {
        id: settings.id,
        userId: settings.userId,
        notificationPreferences: settings.notificationPreferences as NotificationPreferences,
        theme: settings.theme,
        language: settings.language,
        timezone: settings.timezone,
        defaultProjectVisibility: settings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: settings.defaultBlueprintPricingPackage,
        uiPreferences: settings.uiPreferences as UIPreferences,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to get user settings", { userId, error });
      throw new DatabaseError("Failed to retrieve user settings");
    }
  }

  static async updateUserSettings(
    userId: number,
    updates: UpdateSettingsInput,
    clerkId?: string,
  ): Promise<UserSettingsResponse> {
    try {
      const validatedUpdates = updateSettingsSchema.parse(updates);

      const database = db();

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (validatedUpdates.notificationPreferences) {
        updateData.notificationPreferences = validatedUpdates.notificationPreferences;
      }
      if (validatedUpdates.theme) {
        updateData.theme = validatedUpdates.theme;
      }
      if (validatedUpdates.language) {
        updateData.language = validatedUpdates.language;
      }
      if (validatedUpdates.timezone) {
        updateData.timezone = validatedUpdates.timezone;
      }
      if (validatedUpdates.defaultProjectVisibility) {
        updateData.defaultProjectVisibility = validatedUpdates.defaultProjectVisibility;
      }
      if (validatedUpdates.defaultBlueprintPricingPackage) {
        updateData.defaultBlueprintPricingPackage = validatedUpdates.defaultBlueprintPricingPackage;
      }
      if (validatedUpdates.uiPreferences) {
        updateData.uiPreferences = validatedUpdates.uiPreferences;
      }

      const [updatedSettings] = await database
        .update(userSettings)
        .set(updateData)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .returning();

      if (!updatedSettings) {
        throw new NotFoundError("User settings not found");
      }

      logger.userAction("User settings updated", clerkId || userId.toString(), {
        settingsId: updatedSettings.id,
        updates: validatedUpdates,
      });

      return {
        id: updatedSettings.id,
        userId: updatedSettings.userId,
        notificationPreferences: updatedSettings.notificationPreferences as NotificationPreferences,
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        timezone: updatedSettings.timezone,
        defaultProjectVisibility: updatedSettings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: updatedSettings.defaultBlueprintPricingPackage,
        uiPreferences: updatedSettings.uiPreferences as UIPreferences,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("Invalid settings data");
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update user settings", { userId, error });
      throw new DatabaseError("Failed to update user settings");
    }
  }

  static async updateNotificationPreferences(
    userId: number,
    preferences: Partial<NotificationPreferences>,
    clerkId?: string,
  ): Promise<UserSettingsResponse> {
    try {
      const database = db();

      const [settings] = await database
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .limit(1);

      if (!settings) {
        throw new NotFoundError("User settings not found");
      }

      const currentPreferences = settings.notificationPreferences as NotificationPreferences;
      const updatedPreferences = { ...currentPreferences, ...preferences };

      const [updatedSettings] = await database
        .update(userSettings)
        .set({
          notificationPreferences: updatedPreferences,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();

      logger.userAction("Notification preferences updated", clerkId || userId.toString(), {
        settingsId: updatedSettings.id,
        preferences: updatedPreferences,
      });

      return {
        id: updatedSettings.id,
        userId: updatedSettings.userId,
        notificationPreferences: updatedSettings.notificationPreferences as NotificationPreferences,
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        timezone: updatedSettings.timezone,
        defaultProjectVisibility: updatedSettings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: updatedSettings.defaultBlueprintPricingPackage,
        uiPreferences: updatedSettings.uiPreferences as UIPreferences,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update notification preferences", { userId, error });
      throw new DatabaseError("Failed to update notification preferences");
    }
  }

  static async updateUIPreferences(
    userId: number,
    preferences: Partial<UIPreferences>,
    clerkId?: string,
  ): Promise<UserSettingsResponse> {
    try {
      const database = db();

      const [settings] = await database
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .limit(1);

      if (!settings) {
        throw new NotFoundError("User settings not found");
      }

      const currentPreferences = settings.uiPreferences as UIPreferences;
      const updatedPreferences = { ...currentPreferences, ...preferences };

      const [updatedSettings] = await database
        .update(userSettings)
        .set({
          uiPreferences: updatedPreferences,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();

      logger.userAction("UI preferences updated", clerkId || userId.toString(), {
        settingsId: updatedSettings.id,
        preferences: updatedPreferences,
      });

      return {
        id: updatedSettings.id,
        userId: updatedSettings.userId,
        notificationPreferences: updatedSettings.notificationPreferences as NotificationPreferences,
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        timezone: updatedSettings.timezone,
        defaultProjectVisibility: updatedSettings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: updatedSettings.defaultBlueprintPricingPackage,
        uiPreferences: updatedSettings.uiPreferences as UIPreferences,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to update UI preferences", { userId, error });
      throw new DatabaseError("Failed to update UI preferences");
    }
  }

  static async resetUserSettings(userId: number, clerkId?: string): Promise<UserSettingsResponse> {
    try {
      const database = db();

      const [updatedSettings] = await database
        .update(userSettings)
        .set({
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          theme: "system",
          language: "en",
          timezone: "UTC",
          defaultProjectVisibility: "private",
          defaultBlueprintPricingPackage: "standard",
          uiPreferences: DEFAULT_UI_PREFERENCES,
          updatedAt: new Date(),
        })
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)))
        .returning();

      if (!updatedSettings) {
        throw new NotFoundError("User settings not found");
      }

      logger.userAction("User settings reset", clerkId || userId.toString(), {
        settingsId: updatedSettings.id,
      });

      return {
        id: updatedSettings.id,
        userId: updatedSettings.userId,
        notificationPreferences: updatedSettings.notificationPreferences as NotificationPreferences,
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        timezone: updatedSettings.timezone,
        defaultProjectVisibility: updatedSettings.defaultProjectVisibility,
        defaultBlueprintPricingPackage: updatedSettings.defaultBlueprintPricingPackage,
        uiPreferences: updatedSettings.uiPreferences as UIPreferences,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error("Failed to reset user settings", { userId, error });
      throw new DatabaseError("Failed to reset user settings");
    }
  }
}
