"use client";

import { useState } from "react";
import { FormSelect } from "@/components/ui/forms/form-select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface LanguageSelectorProps {
  initialLanguage?: string;
  onSave?: (_language: string) => Promise<void>;
  disabled?: boolean;
}

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ru", label: "Russian" },
];

export function LanguageSelector({ initialLanguage = "en", onSave, disabled = false }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    if (!onSave) return;

    setLoading(true);
    setMessage(null);

    try {
      await onSave(selectedLanguage);
      setMessage({ type: "success", text: "Language preference saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (_error) {
      setMessage({
        type: "error",
        text: "Failed to save language preference. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Language Preference
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Select your preferred language for the application interface.
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "success" ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-md">
        <FormSelect
          label="Language"
          options={languages}
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={disabled || loading}
          helperText="Choose the language you want to use across the platform"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={disabled || loading}
          loading={loading}
        >
          Save Language Preference
        </Button>
      </div>
    </div>
  );
}
