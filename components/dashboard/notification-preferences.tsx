"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface NotificationPreference {
  blueprintGeneration: boolean;
  deployment: boolean;
  credits: boolean;
  teamInvites: boolean;
  projectShares: boolean;
  marketing: boolean;
}

export interface NotificationPreferencesProps {
  initialPreferences?: NotificationPreference;
  onSave?: (_preferences: Partial<NotificationPreference>) => Promise<void>;
  disabled?: boolean;
}

export function NotificationPreferences({
  initialPreferences,
  onSave,
  disabled = false,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference>({
    blueprintGeneration: true,
    deployment: true,
    credits: true,
    teamInvites: true,
    projectShares: true,
    marketing: false,
    ...initialPreferences,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleToggle = (key: keyof NotificationPreference) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!onSave) return;

    setLoading(true);
    setMessage(null);

    try {
      await onSave(preferences);
      setMessage({ type: "success", text: "Notification preferences saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (_error) {
      setMessage({
        type: "error",
        text: "Failed to save notification preferences. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const preferenceItems = [
    { key: "blueprintGeneration" as const, label: "Blueprint Generation", description: "Receive notifications when blueprints are generated" },
    { key: "deployment" as const, label: "Deployment Updates", description: "Get notified about deployment status changes" },
    { key: "credits" as const, label: "Credit Alerts", description: "Receive alerts about credit usage and low balance" },
    { key: "teamInvites" as const, label: "Team Invitations", description: "Get notified when invited to join a team" },
    { key: "projectShares" as const, label: "Project Shares", description: "Receive notifications when projects are shared with you" },
    { key: "marketing" as const, label: "Marketing Emails", description: "Receive marketing updates and product announcements" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Notification Preferences
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Manage how you receive notifications across the platform.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {preferenceItems.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(item.key)}
              disabled={disabled || loading}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                preferences[item.key] ? "bg-blue-600" : "bg-gray-200",
                (disabled || loading) && "opacity-50 cursor-not-allowed"
              )}
              role="switch"
              aria-checked={preferences[item.key]}
              aria-label={`Toggle ${item.label}`}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  preferences[item.key] ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={disabled || loading}
          loading={loading}
        >
          Save Notification Preferences
        </Button>
      </div>
    </div>
  );
}
