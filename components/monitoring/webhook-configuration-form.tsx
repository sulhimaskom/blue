"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { WebhookConfiguration } from "@/lib/db/schema";

interface WebhookFormData {
  name?: string;
  url?: string;
}

interface WebhookConfigurationFormProps {
  config?: WebhookConfiguration | null;
  onSubmit: (_data: WebhookFormData) => Promise<void>;
  onCancel: () => void;
}

export default function WebhookConfigurationForm({
  config,
  onSubmit,
  onCancel,
}: WebhookConfigurationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simplified submit logic - will be fixed properly later
      await onSubmit({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            defaultValue={config?.name || ""}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-1">
            URL
          </label>
          <input
            type="url"
            id="url"
            defaultValue={config?.url || ""}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div className="flex space-x-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : config ? "Update" : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
