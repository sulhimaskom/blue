"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { NotificationPreferences, NotificationPreference } from "@/components/dashboard/notification-preferences";
import { ThemeSelector, ThemeOption } from "@/components/dashboard/theme-selector";
import { LanguageSelector } from "@/components/dashboard/language-selector";
import { TimezoneSelector } from "@/components/dashboard/timezone-selector";
import { useAuthSafe } from "@/lib/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuthSafe();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<{
    notificationPreferences: NotificationPreference;
    theme: ThemeOption;
    language: string;
    timezone: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/user/settings", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user settings");
        }

        const data = await response.json();
        if (data.success && data.data) {
          setSettings({
            notificationPreferences: data.data.settings.notificationPreferences,
            theme: data.data.settings.theme,
            language: data.data.settings.language,
            timezone: data.data.settings.timezone,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        logger.error("Failed to fetch user settings", { error: err });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isLoaded, isSignedIn]);

  const handleSaveNotificationPreferences = async (preferences: Partial<NotificationPreference>) => {
    try {
      const response = await fetch("/api/user/settings/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error("Failed to update notification preferences");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings((prev) => ({
          ...prev!,
          notificationPreferences: data.data.notificationPreferences,
        }));
      }
    } catch (err) {
      logger.error("Failed to update notification preferences", { error: err });
      throw err;
    }
  };

  const handleSaveTheme = async (theme: ThemeOption) => {
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ theme }),
      });

      if (!response.ok) {
        throw new Error("Failed to update theme preference");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings((prev) => ({
          ...prev!,
          theme: data.data.settings.theme,
        }));
      }
    } catch (err) {
      logger.error("Failed to update theme preference", { error: err });
      throw err;
    }
  };

  const handleSaveLanguage = async (language: string) => {
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ language }),
      });

      if (!response.ok) {
        throw new Error("Failed to update language preference");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings((prev) => ({
          ...prev!,
          language: data.data.settings.language,
        }));
      }
    } catch (err) {
      logger.error("Failed to update language preference", { error: err });
      throw err;
    }
  };

  const handleSaveTimezone = async (timezone: string) => {
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ timezone }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timezone preference");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings((prev) => ({
          ...prev!,
          timezone: data.data.settings.timezone,
        }));
      }
    } catch (err) {
      logger.error("Failed to update timezone preference", { error: err });
      throw err;
    }
  };

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isSignedIn) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Sign In Required
            </h1>
            <p className="text-gray-600">
              Please sign in to access your settings.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences.</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences.</p>
          </div>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return null;
  }

  const tabs = [
    {
      id: "notifications",
      label: "Notifications",
      content: (
        <NotificationPreferences
          initialPreferences={settings.notificationPreferences}
          onSave={handleSaveNotificationPreferences}
        />
      ),
    },
    {
      id: "appearance",
      label: "Appearance",
      content: (
        <div className="space-y-8">
          <ThemeSelector
            initialTheme={settings.theme}
            onSave={handleSaveTheme}
          />
          <hr className="border-gray-200" />
          <LanguageSelector
            initialLanguage={settings.language}
            onSave={handleSaveLanguage}
          />
        </div>
      ),
    },
    {
      id: "general",
      label: "General",
      content: (
        <TimezoneSelector
          initialTimezone={settings.timezone}
          onSave={handleSaveTimezone}
        />
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account preferences and personalize your experience.
          </p>
        </div>

        <SettingsPanel tabs={tabs} defaultTab="notifications" />
      </div>
    </DashboardLayout>
  );
}
