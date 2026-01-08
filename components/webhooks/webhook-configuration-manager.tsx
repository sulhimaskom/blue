"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  TestTube,
  RotateCcw,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useNotification } from "@/lib/hooks/use-notification";
import type {
  WebhookConfigurationInput,
  WebhookEventType,
} from "@/lib/schemas/webhook-schema";
import { WEBHOOK_EVENT_TYPES } from "@/lib/schemas/webhook-schema";

export interface WebhookConfiguration {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  retryCount: number;
  timeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  status: number;
  responseTime: number;
  error?: string;
}

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
      const response = await fetch("/api/webhooks/configure");
      const result = await response.json();

      if (result.success) {
        setWebhooks(result.data);
      } else {
        showNotification("Failed to load webhooks", "error");
      }
    } catch (error) {
      showNotification("Error loading webhooks", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingWebhook ? "PUT" : "POST";
      const url = editingWebhook
        ? `/api/webhooks/configure/${editingWebhook.id}`
        : "/api/webhooks/configure";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(
          editingWebhook
            ? "Webhook updated successfully"
            : "Webhook created successfully",
          "success",
        );
        setShowForm(false);
        setEditingWebhook(null);
        resetForm();
        loadWebhooks();
      } else {
        showNotification(result.error || "Operation failed", "error");
      }
    } catch (error) {
      showNotification("Error saving webhook", "error");
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      const response = await fetch(`/api/webhooks/configure/${webhookId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        showNotification("Webhook deleted successfully", "success");
        loadWebhooks();
      } else {
        showNotification(result.error || "Failed to delete webhook", "error");
      }
    } catch (error) {
      showNotification("Error deleting webhook", "error");
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingWebhook(webhookId);

    try {
      const response = await fetch(`/api/webhooks/test/${webhookId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "test.event",
          payload: { test: true, timestamp: new Date().toISOString() },
        }),
      });

      const result = await response.json();

      if (result.success) {
        const testResult = result.data as WebhookTestResult;
        showNotification(
          testResult.success
            ? `Test successful (${testResult.status}, ${testResult.responseTime}ms)`
            : `Test failed: ${testResult.error}`,
          testResult.success ? "success" : "error",
        );
      } else {
        showNotification(result.error || "Test failed", "error");
      }
    } catch (error) {
      showNotification("Error testing webhook", "error");
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

  const toggleEventType = (eventType: WebhookEventType) => {
    setFormData((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter((type) => type !== eventType)
        : [...prev.eventTypes, eventType],
    }));
  };

  const toggleSecret = (webhookId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
  };

  const handleRotateSecret = async (webhookId: string) => {
    if (!confirm("Are you sure? This will invalidate the current secret."))
      return;

    try {
      const response = await fetch("/api/webhooks/rotate-secret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookId }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification("Secret rotated successfully", "success");
        loadWebhooks();
      } else {
        showNotification(result.error || "Failed to rotate secret", "error");
      }
    } catch (error) {
      showNotification("Error rotating secret", "error");
    }
  };

  if (showForm) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingWebhook ? "Edit Webhook" : "Create New Webhook"}
          </h2>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingWebhook(null);
              resetForm();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Production Webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://your-domain.com/webhook"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secret {!editingWebhook && " *"}
            </label>
            <input
              type="text"
              required={!editingWebhook}
              value={formData.secret}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, secret: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                editingWebhook
                  ? "Leave empty to keep current secret"
                  : "At least 32 characters"
              }
            />
            {editingWebhook && (
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to keep the current secret, or generate a new one
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Types *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {WEBHOOK_EVENT_TYPES.map((eventType) => (
                <label
                  key={eventType}
                  className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.eventTypes.includes(eventType)}
                    onChange={() => toggleEventType(eventType)}
                    className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{eventType}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retry Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.retryCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    retryCount: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={formData.timeoutSeconds}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    timeoutSeconds: parseInt(e.target.value) || 30,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingWebhook(null);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingWebhook ? "Update" : "Create"} Webhook
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (selectedWebhook) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Event History: {selectedWebhook.webhookName}
          </h2>
          <button
            onClick={() => setSelectedWebhook(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <WebhookEventHistory webhookId={selectedWebhook.webhookId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Webhook Configurations
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading webhooks...</div>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-500 mb-4">No webhooks configured yet</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {webhook.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        webhook.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {webhook.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>URL: {webhook.url}</div>
                    <div>
                      Events:{" "}
                      {webhook.eventTypes.length === WEBHOOK_EVENT_TYPES.length
                        ? "All events"
                        : webhook.eventTypes.join(", ")}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Retry: {webhook.retryCount}x</span>
                      <span>Timeout: {webhook.timeoutSeconds}s</span>
                      <span>
                        Created:{" "}
                        {new Date(webhook.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testingWebhook === webhook.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                    title="Test webhook"
                  >
                    {testingWebhook === webhook.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setSelectedWebhook({
                        webhookId: webhook.id,
                        webhookName: webhook.name,
                      })
                    }
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="View event history"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => toggleSecret(webhook.id)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                    title="Show/Hide secret"
                  >
                    {showSecrets[webhook.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleRotateSecret(webhook.id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                    title="Rotate secret"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleEdit(webhook)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                    title="Edit webhook"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete webhook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showSecrets[webhook.id] && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secret (Current)
                  </label>
                  <div className="font-mono text-sm text-gray-600 break-all">
                    [Secret is hidden for security]
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    For security reasons, the actual secret is not displayed.
                    Use the rotate button to generate a new secret if needed.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhookEventHistory({ webhookId }: { webhookId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination] = useState({ limit: 50, offset: 0 });

  const loadEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      const response = await fetch(
        `/api/webhooks/history/${webhookId}?${params}`,
      );
      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
      }
    } catch (error) {
      // Error loading events will be handled silently
    } finally {
      setLoading(false);
    }
  }, [webhookId, pagination]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRetry = async (eventId: string) => {
    try {
      const response = await fetch("/api/webhooks/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      const result = await response.json();

      if (result.success) {
        loadEvents();
      }
    } catch (error) {
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {event.eventType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.responseStatus ? `${event.responseStatus}` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.attemptCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(event.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
