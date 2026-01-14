"use client";

import { useState, useEffect } from "react";
import { FormSelect } from "@/components/ui/forms/form-select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface TimezoneSelectorProps {
  initialTimezone?: string;
  onSave?: (_timezone: string) => Promise<void>;
  disabled?: boolean;
}

const commonTimezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (Eastern Time)" },
  { value: "America/Chicago", label: "America/Chicago (Central Time)" },
  { value: "America/Denver", label: "America/Denver (Mountain Time)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific Time)" },
  { value: "Europe/London", label: "Europe/London (Greenwich Mean Time)" },
  { value: "Europe/Paris", label: "Europe/Paris (Central European Time)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (Central European Time)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (Japan Standard Time)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (China Standard Time)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (Gulf Standard Time)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (Australian Eastern Time)" },
];

export function TimezoneSelector({ initialTimezone = "UTC", onSave, disabled = false }: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(initialTimezone);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (userTimezone && !initialTimezone) {
      setSelectedTimezone(userTimezone);
    }
  }, [initialTimezone]);

  const handleSave = async () => {
    if (!onSave) return;

    setLoading(true);
    setMessage(null);

    try {
      await onSave(selectedTimezone);
      setMessage({ type: "success", text: "Timezone preference saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to save timezone preference. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Timezone Preference
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Select your preferred timezone for displaying dates and times throughout the platform.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-md">
        <FormSelect
          label="Timezone"
          options={commonTimezones}
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          disabled={disabled || loading}
          helperText="Choose the timezone for displaying dates and times"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={disabled || loading}
          loading={loading}
        >
          Save Timezone Preference
        </Button>
      </div>
    </div>
  );
}
