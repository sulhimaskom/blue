"use client";

import React from "react";
import { FormInput } from "@/components/ui/forms/form-input";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import type {
  WebhookConfigurationInput,
  WebhookEventType,
} from "@/lib/schemas/webhook-schema";
import { WEBHOOK_EVENT_TYPES } from "@/lib/schemas/webhook-schema";

interface WebhookFormProps {
  formData: WebhookConfigurationInput;
  isEditing: boolean;
  onChange: (_newFormData: WebhookConfigurationInput) => void;
  onSubmit: (_e: React.FormEvent) => void;
  onCancel: () => void;
}

export function WebhookForm({
  formData,
  isEditing,
  onChange,
  onSubmit,
  onCancel,
}: WebhookFormProps) {
  const toggleEventType = (eventType: WebhookEventType) => {
    onChange({
      ...formData,
      eventTypes: formData.eventTypes.includes(eventType)
        ? formData.eventTypes.filter((type) => type !== eventType)
        : [...formData.eventTypes, eventType],
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {isEditing ? "Edit Webhook" : "Create New Webhook"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Close form"
        >
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Name"
            id="webhook-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            placeholder="e.g., Production Webhook"
            helperText="A descriptive name for your webhook"
          />

          <FormInput
            label="URL"
            id="webhook-url"
            type="url"
            required
            value={formData.url}
            onChange={(e) => onChange({ ...formData, url: e.target.value })}
            placeholder="https://your-domain.com/webhook"
            helperText="The endpoint URL where events will be sent"
          />
        </div>

        <FormInput
          label="Secret"
          id="webhook-secret"
          type="password"
          required={!isEditing}
          value={formData.secret}
          onChange={(e) => onChange({ ...formData, secret: e.target.value })}
          placeholder={
            isEditing
              ? "Leave empty to keep current secret"
              : "At least 32 characters"
          }
          helperText={
            isEditing
              ? "Leave empty to keep current secret, or generate a new one"
              : "HMAC secret used to verify webhook authenticity"
          }
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Event Types <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-md">
            {WEBHOOK_EVENT_TYPES.map((eventType) => (
              <label
                key={eventType}
                className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.eventTypes.includes(eventType)}
                  onChange={() => toggleEventType(eventType)}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  aria-describedby={`event-type-${eventType}-desc`}
                />
                <span
                  id={`event-type-${eventType}-desc`}
                  className="text-sm text-gray-700"
                >
                  {eventType}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormInput
            label="Retry Count"
            id="webhook-retry-count"
            type="number"
            min="0"
            max="10"
            value={formData.retryCount}
            onChange={(e) =>
              onChange({
                ...formData,
                retryCount: parseInt(e.target.value) || 0,
              })
            }
            helperText="Number of retries on failure (0-10)"
          />

          <FormInput
            label="Timeout (seconds)"
            id="webhook-timeout"
            type="number"
            min="5"
            max="300"
            value={formData.timeoutSeconds}
            onChange={(e) =>
              onChange({
                ...formData,
                timeoutSeconds: parseInt(e.target.value) || 30,
              })
            }
            helperText="Request timeout in seconds (5-300)"
          />

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="webhook-active"
              checked={formData.isActive}
              onChange={(e) =>
                onChange({ ...formData, isActive: e.target.checked })
              }
              className="text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label
              htmlFor="webhook-active"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Active
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto"
          >
            {isEditing ? "Update" : "Create"} Webhook
          </Button>
        </div>
      </form>
    </div>
  );
}
