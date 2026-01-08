"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { WebhookConfiguration } from "@/lib/db/schema";
import type {
  CreateWebhookConfigRequest,
  UpdateWebhookConfigRequest,
} from "@/lib/services/webhook-configuration-service";

interface WebhookConfigurationFormProps {
  config?: WebhookConfiguration | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const availableEvents = [
  // Stripe events
  {
    category: "Stripe Payments",
    events: [
      "payment_intent.succeeded",
      "payment_intent.failed",
      "checkout.session.completed",
    ],
  },
  {
    category: "Stripe Subscriptions",
    events: [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ],
  },
  // Clerk events
  {
    category: "User Management",
    events: ["user.created", "user.updated", "user.deleted"],
  },
  {
    category: "Email Events",
    events: ["email.created", "email.updated", "email.deleted"],
  },
  // Custom events
  {
    category: "Platform Events",
    events: [
      "test.event",
      "blueprint.generated",
      "project.created",
      "payment.processed",
    ],
  },
];

export function WebhookConfigurationForm({
  config,
  onSubmit,
  onCancel,
}: WebhookConfigurationFormProps) {
  const [formData, setFormData] = useState({
    name: config?.name || "",
    url: config?.url || "",
    events: config?.events || [],
    description: config?.description || "",
    active: config?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    if (!formData.url.trim()) {
      newErrors.url = "URL is required";
    } else {
      try {
        new URL(formData.url);
        if (!["http:", "https:"].includes(new URL(formData.url).protocol)) {
          newErrors.url = "URL must use HTTP or HTTPS protocol";
        }
      } catch {
        newErrors.url = "Invalid URL format";
      }
    }

    if (formData.events.length === 0) {
      newErrors.events = "At least one event must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        name: formData.name.trim(),
        url: formData.url.trim(),
        events: formData.events,
        description: formData.description.trim() || undefined,
        active: formData.active,
        ...(config && !formData.active ? { active: false } : {}),
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save webhook configuration",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventToggle = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSelectCategoryEvents = (categoryEvents: string[]) => {
    setFormData((prev) => ({
      ...prev,
      events: [...new Set([...prev.events, ...categoryEvents])],
    }));
  };

  const handleDeselectCategoryEvents = (categoryEvents: string[]) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => !categoryEvents.includes(e)),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Basic Information</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? "border-red-300" : ""
            }`}
            placeholder="e.g., Production Webhook"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, url: e.target.value }))
            }
            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.url ? "border-red-300" : ""
            }`}
            placeholder="https://your-app.com/webhooks"
          />
          {errors.url && (
            <p className="text-red-600 text-sm mt-1">{errors.url}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description for this webhook configuration"
          />
        </div>

        {config && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, active: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-700">
              Active (webhooks will be delivered when events occur)
            </label>
          </div>
        )}
      </div>

      {/* Event Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium text-gray-900">
            Event Subscriptions *
          </h4>
          <span className="text-sm text-gray-600">
            {formData.events.length} event
            {formData.events.length !== 1 ? "s" : ""} selected
          </span>
        </div>

        {errors.events && (
          <p className="text-red-600 text-sm">{errors.events}</p>
        )}

        {availableEvents.map(({ category, events: categoryEvents }) => (
          <div key={category} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-gray-900">{category}</h5>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCategoryEvents(categoryEvents)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleDeselectCategoryEvents(categoryEvents)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {categoryEvents.map((event) => (
                <label key={event} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => handleEventToggle(event)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{event}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {submitError && (
        <Alert variant="destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{submitError}</p>
        </Alert>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : config ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
