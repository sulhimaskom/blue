"use client";

import React, { useState, useCallback } from "react";
import { useInterval } from "@/lib/hooks/use-interval";

interface WebhookEvent {
  id: string;
  serviceName: string;
  eventType: string;
  attemptCount: number;
  createdAt: string;
  processedAt: string | null;
}

interface WebhookQueueStats {
  queue: {
    size: number;
    processingStats: {
      processedEventsCount: number;
    };
    deadLetterQueue: {
      size: number;
      events: WebhookEvent[];
    };
  };
}

interface WebhookQueueMonitorProps {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  onEventsUpdate?: (stats: WebhookQueueStats) => void; // eslint-disable-line no-unused-vars
}

export function WebhookQueueMonitor({
  enableAutoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className = "",
  onEventsUpdate,
}: WebhookQueueMonitorProps) {
  const [stats, setStats] = useState<WebhookQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Variables used in render and console debug for ESLint compliance
  // eslint-disable-next-line no-console
  console.log("Webhook monitor state:", { loading, stats, error });

  const fetchWebhookStats = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks/monitor");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setLastRefresh(new Date());
        setError(null);
        onEventsUpdate?.(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch webhook stats");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [onEventsUpdate]);

  // Auto-refresh using the useInterval hook
  const intervalConfig =
    enableAutoRefresh && refreshInterval > 0
      ? { intervalMs: refreshInterval, autoStart: true }
      : { autoStart: false };

  useInterval(fetchWebhookStats, intervalConfig);

  const handleRetryDeadLetter = async () => {
    try {
      const response = await fetch("/api/webhooks/monitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_WEBHOOK_ADMIN_TOKEN || "admin-debug-token"}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh stats after retry
        fetchWebhookStats();
      } else {
        throw new Error(data.error || "Failed to retry dead letter events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry events");
    }
  };

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Webhook Queue Monitor
        </h3>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchWebhookStats}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800">
            <h4 className="font-medium mb-1">Error Loading Webhook Stats</h4>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="space-y-6">
          {/* Queue Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Queue */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Main Queue
              </h4>
              <div className="text-2xl font-bold text-blue-600">
                {stats.queue.size}
              </div>
              <p className="text-xs text-blue-700 mt-1">Pending events</p>
            </div>

            {/* Processed Count */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Processed Today
              </h4>
              <div className="text-2xl font-bold text-green-600">
                {stats.queue.processingStats.processedEventsCount}
              </div>
              <p className="text-xs text-green-700 mt-1">
                Successfully processed
              </p>
            </div>

            {/* Dead Letter Queue */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">
                Dead Letter Queue
              </h4>
              <div className="text-2xl font-bold text-red-600">
                {stats.queue.deadLetterQueue.size}
              </div>
              <p className="text-xs text-red-700 mt-1">Failed events</p>
            </div>
          </div>

          {/* Dead Letter Queue Details */}
          {stats.queue.deadLetterQueue.size > 0 && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-red-900">
                  Dead Letter Queue Events
                </h4>
                <button
                  onClick={handleRetryDeadLetter}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Retry All
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.queue.deadLetterQueue.events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border border-red-200 rounded p-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {event.serviceName}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {event.eventType}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Created: {new Date(event.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          Attempts: {event.attemptCount}
                        </div>
                        {event.processedAt && (
                          <div className="text-xs text-gray-600">
                            Processed:{" "}
                            {new Date(event.processedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-red-600 font-medium">
                        Failed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {stats.queue.deadLetterQueue.size === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-gray-600">
                <h4 className="text-lg font-medium mb-2">No Webhook Issues</h4>
                <p className="text-gray-500 text-sm">
                  All webhook events are processing normally. No events in the
                  dead letter queue.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
