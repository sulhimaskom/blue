"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Alert } from "@/components/ui/alert";
import { BaseCard } from "@/components/ui/base-card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { WebhookConfigurationForm } from "./webhook-configuration-form";
import { WebhookTestModal } from "./webhook-test-modal";
import { WebhookEventHistory } from "./webhook-event-history";
import type { WebhookConfiguration } from "@/lib/db/schema";

interface WebhookConfigRowProps {
  config: WebhookConfiguration;
  onEdit: (config: WebhookConfiguration) => void;
  onDelete: (config: WebhookConfiguration) => void;
  onTest: (config: WebhookConfiguration) => void;
  onViewHistory: (config: WebhookConfiguration) => void;
  onRotateSecret: (config: WebhookConfiguration) => void;
}

function WebhookConfigRow({
  config,
  onEdit,
  onDelete,
  onTest,
  onViewHistory,
  onRotateSecret,
}: WebhookConfigRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${config.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(config);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const truncateUrl = (url: string) => {
    return url.length > 50 ? `${url.substring(0, 47)}...` : url;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
            <StatusIndicator status={config.active ? "healthy" : "unhealthy"} />
            <span className="text-sm text-gray-600 ml-2">
              {config.active ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            URL: {truncateUrl(config.url)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{config.events.length} events subscribed</span>
            <span>Created {formatDate(config.createdAt)}</span>
            {config.updatedAt.getTime() !== config.createdAt.getTime() && (
              <span>Updated {formatDate(config.updatedAt)}</span>
            )}
          </div>

          {config.description && (
            <p className="text-sm text-gray-600 mt-2">{config.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {config.events.map((event) => (
              <span
                key={event}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                title={event}
              >
                {event.length > 25 ? `${event.substring(0, 22)}...` : event}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 ml-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(config)}
            className="text-xs"
          >
            Test
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(config)}
              className="text-xs"
            >
              History
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRotateSecret(config)}
              className="text-xs"
            >
              Rotate Secret
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(config)}
              className="text-xs"
            >
              Edit
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebhookConfigurationList() {
  const [configs, setConfigs] = useState<WebhookConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<WebhookConfiguration | null>(null);
  const [testingConfig, setTestingConfig] =
    useState<WebhookConfiguration | null>(null);
  const [historyConfig, setHistoryConfig] =
    useState<WebhookConfiguration | null>(null);

  const fetchConfigs = async () => {
    try {
      setError(null);
      const response = await fetch("/api/webhooks/configure");
      if (!response.ok) {
        throw new Error("Failed to fetch webhook configurations");
      }
      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleCreate = async (formData: any) => {
    try {
      const response = await fetch("/api/webhooks/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create webhook configuration",
        );
      }

      setShowCreateModal(false);
      await fetchConfigs(); // Refresh list
    } catch (err) {
      throw err; // Let form component handle error display
    }
  };

  const handleEdit = async (config: WebhookConfiguration, formData: any) => {
    try {
      const response = await fetch(`/api/webhooks/configure/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to update webhook configuration",
        );
      }

      setEditingConfig(null);
      await fetchConfigs(); // Refresh list
    } catch (err) {
      throw err; // Let form component handle error display
    }
  };

  const handleDelete = async (config: WebhookConfiguration) => {
    try {
      const response = await fetch(`/api/webhooks/configure/${config.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to delete webhook configuration",
        );
      }

      await fetchConfigs(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleRotateSecret = async (config: WebhookConfiguration) => {
    if (
      !window.confirm(
        `Rotating the secret for "${config.name}" will invalidate any existing integrations using the current secret. Continue?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/webhooks/configure/${config.id}/rotate-secret`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rotate webhook secret");
      }

      const data = await response.json();
      alert(
        `Secret rotated successfully! New secret: ${data.data.secret}\n\nPlease update your integrations immediately.`,
      );
      await fetchConfigs(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <BaseCard>
        <div className="space-y-4">
          <LoadingSkeleton className="h-6 w-48" />
          <LoadingSkeleton className="h-20 w-full" />
          <LoadingSkeleton className="h-20 w-full" />
        </div>
      </BaseCard>
    );
  }

  if (error) {
    return (
      <BaseCard>
        <Alert variant="destructive">
          <p className="font-medium">Error loading webhook configurations</p>
          <p className="text-sm mt-1">{error}</p>
          <Button variant="secondary" onClick={fetchConfigs} className="mt-3">
            Try Again
          </Button>
        </Alert>
      </BaseCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Webhook Configurations
          </h2>
          <p className="text-gray-600 mt-1">
            Manage webhook endpoints for event notifications and integrations
          </p>
        </div>

        <Button variant="default" onClick={() => setShowCreateModal(true)}>
          Add Webhook
        </Button>
      </div>

      {/* Empty State */}
      {configs.length === 0 && (
        <BaseCard>
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 4.026A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No webhook configurations
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first webhook endpoint to start receiving event
              notifications
            </p>
            <Button variant="default" onClick={() => setShowCreateModal(true)}>
              Create Webhook
            </Button>
          </div>
        </BaseCard>
      )}

      {/* Configurations List */}
      {configs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {configs.length} webhook{configs.length !== 1 ? "s" : ""} configured
          </p>

          {configs.map((config) => (
            <WebhookConfigRow
              key={config.id}
              config={config}
              onEdit={setEditingConfig}
              onDelete={handleDelete}
              onTest={setTestingConfig}
              onViewHistory={setHistoryConfig}
              onRotateSecret={handleRotateSecret}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!editingConfig}
        onClose={() => {
          setShowCreateModal(false);
          setEditingConfig(null);
        }}
        title={
          editingConfig
            ? "Edit Webhook Configuration"
            : "Create Webhook Configuration"
        }
        size="lg"
      >
        <WebhookConfigurationForm
          config={editingConfig}
          onSubmit={
            editingConfig
              ? (data: any) => handleEdit(editingConfig, data)
              : handleCreate
          }
          onCancel={() => {
            setShowCreateModal(false);
            setEditingConfig(null);
          }}
        />
      </Modal>

      {/* Test Modal */}
      {testingConfig && (
        <WebhookTestModal
          config={testingConfig}
          onClose={() => setTestingConfig(null)}
        />
      )}

      {/* History Modal */}
      {historyConfig && (
        <WebhookEventHistory
          config={historyConfig}
          onClose={() => setHistoryConfig(null)}
        />
      )}
    </div>
  );
}
