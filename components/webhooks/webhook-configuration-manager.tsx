"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils/time-formatting";
import { useNotification } from "@/lib/hooks/use-notification";
import type { WebhookConfigurationInput, WebhookEventType } from "@/lib/schemas/webhook-schema";
import {
  WebhookManagementService,
  type WebhookConfiguration,
  type WebhookEvent,
} from "@/lib/services/webhook-management-service";
import { WebhookForm } from "./webhook-form";
import { WebhookList } from "./webhook-list";
import { XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

interface WebhookEventManager {
  webhookId: string;
  webhookName: string;
}

export function WebhookConfigurationManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] =
    useState<WebhookConfiguration | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [selectedWebhook, setSelectedWebhook] =
    useState<WebhookEventManager | null>(null);
  const { showNotification } = useNotification();

  const webhookService = WebhookManagementService.getInstance();

  const [formData, setFormData] = useState<WebhookConfigurationInput>({
    name: "",
    url: "",
    secret: "",
    eventTypes: [],
    isActive: true,
    retryCount: 3,
    timeoutSeconds: 30,
  });

  const loadWebhooks = useCallback(async () => {
    try {
      const data = await webhookService.loadWebhooks();
      setWebhooks(data);
    } catch (_error) {
      showNotification("Failed to load webhooks", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification, webhookService]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWebhook) {
        await webhookService.updateWebhook(editingWebhook.id, formData);
        showNotification("Webhook updated successfully", "success");
      } else {
        await webhookService.createWebhook(formData);
        showNotification("Webhook created successfully", "success");
      }

      setShowForm(false);
      setEditingWebhook(null);
      resetForm();
      loadWebhooks();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Operation failed",
        "error",
      );
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      await webhookService.deleteWebhook(webhookId);
      showNotification("Webhook deleted successfully", "success");
      loadWebhooks();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to delete webhook",
        "error",
      );
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingWebhook(webhookId);

    try {
      const result = await webhookService.testWebhook(webhookId);
      showNotification(
        result.success
          ? `Test successful (${result.status}, ${result.responseTime}ms)`
          : `Test failed: ${result.error}`,
        result.success ? "success" : "error",
      );
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Error testing webhook",
        "error",
      );
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleEdit = (webhook: WebhookConfiguration) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: "", // Don't pre-fill secret for security
      eventTypes: webhook.eventTypes as WebhookEventType[],
      isActive: webhook.isActive,
      retryCount: webhook.retryCount,
      timeoutSeconds: webhook.timeoutSeconds,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      secret: "",
      eventTypes: [],
      isActive: true,
      retryCount: 3,
      timeoutSeconds: 30,
    });
  };

  const toggleSecret = (webhookId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
  };

  const handleRotateSecret = async (webhookId: string) => {
    if (!confirm("Are you sure? This will invalidate current secret."))
      return;

    try {
      await webhookService.rotateSecret(webhookId);
      showNotification("Secret rotated successfully", "success");
      loadWebhooks();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to rotate secret",
        "error",
      );
    }
  };

  // Show form view
  if (showForm) {
    return (
      <WebhookForm
        formData={formData}
        isEditing={!!editingWebhook}
        onChange={setFormData}
        onSubmit={handleSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingWebhook(null);
          resetForm();
        }}
      />
    );
  }

  // Show event history view
  if (selectedWebhook) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Event History: {selectedWebhook.webhookName}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedWebhook(null)}
            aria-label="Close event history"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>

        <WebhookEventHistory webhookId={selectedWebhook.webhookId} />
      </div>
    );
  }

  // Show list view
  return (
    <WebhookList
      webhooks={webhooks}
      loading={loading}
      testingWebhookId={testingWebhook}
      showSecrets={showSecrets}
      onTest={handleTest}
      onViewHistory={(id, name) => setSelectedWebhook({ webhookId: id, webhookName: name })}
      onToggleSecret={toggleSecret}
      onRotateSecret={handleRotateSecret}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAddWebhook={() => setShowForm(true)}
    />
  );
}

function WebhookEventHistory({ webhookId }: { webhookId: string }) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination] = useState({ limit: 50, offset: 0 });

  const webhookService = WebhookManagementService.getInstance();

  const loadEvents = useCallback(async () => {
    try {
      const data = await webhookService.loadWebhookEvents(webhookId, pagination);
      setEvents(data);
    } catch (_error) {
      // Error loading events will be handled silently
    } finally {
      setLoading(false);
    }
  }, [webhookId, pagination, webhookService]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRetry = async (eventId: string) => {
    try {
      await webhookService.retryEvent(eventId);
      loadEvents();
    } catch (_error) {
      // Error retrying event will be handled silently
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "retrying":
        return "text-yellow-600 bg-yellow-100";
      case "pending":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading event history...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No events found for this webhook</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event Type
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {event.eventType}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.responseStatus ? `${event.responseStatus}` : "-"}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.attemptCount}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(new Date(event.createdAt))}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {event.status === "failed" && (
                    <button
                      onClick={() => handleRetry(event.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
