"use client";

import React from "react";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import {
  Edit2Icon,
  Trash2Icon,
  TestTubeIcon,
  RotateCcwIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WebhookConfiguration } from "@/lib/services/webhook-management-service";

import { WEBHOOK_EVENT_TYPES } from "@/lib/schemas/webhook-schema";

interface WebhookCardProps {
  webhook: WebhookConfiguration;
  testingWebhookId: string | null;
  showSecret: boolean;
  onTest: (_id: string) => void;
  onViewHistory: (_id: string, _name: string) => void;
  onToggleSecret: (_id: string) => void;
  onRotateSecret: (_id: string) => void;
  onEdit: (_webhook: WebhookConfiguration) => void;
  onDelete: (_id: string) => void;
}

export function WebhookCard({
  webhook,
  testingWebhookId,
  showSecret,
  onTest,
  onViewHistory,
  onToggleSecret,
  onRotateSecret,
  onEdit,
  onDelete,
}: WebhookCardProps) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                {webhook.name}
              </h3>
              <Badge variant={webhook.isActive ? "default" : "secondary"}>
                {webhook.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="break-all">
                <span className="font-medium">URL:</span> {webhook.url}
              </div>
              <div>
                <span className="font-medium">Events:</span>{" "}
                {webhook.eventTypes.length === WEBHOOK_EVENT_TYPES.length
                  ? "All events"
                  : (webhook.eventTypes.filter((et) => (WEBHOOK_EVENT_TYPES as readonly string[]).includes(et))).join(", ")}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm">
                <span>
                  <strong>Retry:</strong> {webhook.retryCount}x
                </span>
                <span>
                  <strong>Timeout:</strong> {webhook.timeoutSeconds}s
                </span>
                <span>
                  <strong>Created:</strong>{" "}
                  {formatStandardDate(new Date(webhook.createdAt))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTest(webhook.id)}
              disabled={testingWebhookId === webhook.id}
              title="Test webhook"
              aria-label={`Test webhook ${webhook.name}`}
            >
              {testingWebhookId === webhook.id ? (
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              ) : (
                <TestTubeIcon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewHistory(webhook.id, webhook.name)}
              title="View event history"
              aria-label={`View event history for ${webhook.name}`}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleSecret(webhook.id)}
              title="Show/Hide secret"
              aria-label={`Toggle secret visibility for ${webhook.name}`}
            >
              {showSecret ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRotateSecret(webhook.id)}
              title="Rotate secret"
              aria-label={`Rotate secret for ${webhook.name}`}
            >
              <RotateCcwIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(webhook)}
              title="Edit webhook"
              aria-label={`Edit webhook ${webhook.name}`}
            >
              <Edit2Icon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(webhook.id)}
              title="Delete webhook"
              aria-label={`Delete webhook ${webhook.name}`}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSecret && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret (Current)
            </label>
            <div className="font-mono text-sm text-gray-600 break-all">
              [Secret is hidden for security]
            </div>
            <p className="text-xs text-gray-500 mt-2">
              For security reasons, the actual secret is not displayed. Use the
              rotate button to generate a new secret if needed.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
