"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BaseCard } from "@/components/ui/base-card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Alert } from "@/components/ui/alert";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { WebhookConfiguration } from "@/lib/db/schema";
import type { WebhookEventWithConfig } from "@/lib/services/webhook-configuration-service";

interface WebhookEventHistoryProps {
  config: WebhookConfiguration;
  onClose: () => void;
}

export function WebhookEventHistory({
  config,
  onClose,
}: WebhookEventHistoryProps) {
  const [events, setEvents] = useState<WebhookEventWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(
        `/api/webhooks/history?configId=${config.id}&limit=50`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch webhook event history");
      }

      const data = await response.json();
      setEvents(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [config.id]);

  const handleRetry = async (eventId: string) => {
    setRetryingEventId(eventId);

    try {
      const response = await fetch(`/api/webhooks/${eventId}/retry`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Retry failed");
      }

      // Refresh events after successful retry
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRetryingEventId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "healthy";
      case "failed":
        return "unhealthy";
      case "retrying":
        return "degraded";
      default:
        return "unknown";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Delivered";
      case "failed":
        return "Failed";
      case "retrying":
        return "Retrying";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Event History: {config.name}
        </h3>
        <p className="text-sm text-gray-600">
          Recent webhook deliveries and retry attempts
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {events.length} recent event{events.length !== 1 ? "s" : ""}
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchEvents}>
            Refresh
          </Button>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <BaseCard key={i}>
              <div className="space-y-3">
                <LoadingSkeleton className="h-4 w-48" />
                <LoadingSkeleton className="h-3 w-32" />
                <LoadingSkeleton className="h-3 w-full" />
              </div>
            </BaseCard>
          ))}
        </div>
      )}

      {/* Events List */}
      {!loading && events.length === 0 && (
        <BaseCard>
          <div className="text-center py-8">
            <p className="text-gray-600">No webhook events found</p>
            <p className="text-sm text-gray-500 mt-1">
              Events will appear here once webhooks are delivered
            </p>
          </div>
        </BaseCard>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-4">
          {events.map((event) => (
            <BaseCard key={event.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusIndicator
                      status={getStatusColor(event.status)}
                      size="sm"
                    />
                    <span className="font-medium text-sm">
                      {getStatusText(event.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Attempt {event.attemptCount}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Event:</span>{" "}
                      {event.eventType}
                    </div>

                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {formatDate(event.createdAt)}
                    </div>

                    {event.deliveredAt && (
                      <div>
                        <span className="font-medium">Delivered:</span>{" "}
                        {formatDate(event.deliveredAt)}
                      </div>
                    )}

                    {event.failedAt && (
                      <div>
                        <span className="font-medium">Failed:</span>{" "}
                        {formatDate(event.failedAt)}
                      </div>
                    )}

                    {event.responseStatus && (
                      <div>
                        <span className="font-medium">HTTP Status:</span>{" "}
                        {event.responseStatus}
                      </div>
                    )}

                    {event.responseBody && (
                      <div>
                        <span className="font-medium">Response:</span>
                        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                          {event.responseBody}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-6">
                  {event.status === "failed" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetry(event.id)}
                      disabled={retryingEventId === event.id}
                      className="text-xs"
                    >
                      {retryingEventId === event.id ? "Retrying..." : "Retry"}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(event.payload, null, 2),
                      );
                    }}
                    className="text-xs"
                  >
                    Copy Payload
                  </Button>
                </div>
              </div>
            </BaseCard>
          ))}
        </div>
      )}
    </div>
  );
}
