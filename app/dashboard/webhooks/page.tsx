"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useNotification } from "@/lib/hooks/use-notification";
import { DashboardHeader } from "@/components/monitoring/dashboard-layout";
import { DashboardFooter } from "@/components/monitoring/dashboard-footer";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";

const WebhookQueueMonitor = lazy(() =>
  import("@/components/monitoring/webhook-queue-monitor").then(
    (module) => ({ default: module.WebhookQueueMonitor }),
  ),
);

const WebhookConfigurationManager = lazy(() =>
  import("@/components/webhooks/webhook-configuration-manager").then(
    (module) => ({ default: module.WebhookConfigurationManager }),
  ),
);

interface WebhookStats {
  queue: {
    size: number;
    processingStats: {
      processedEventsCount: number;
    };
    deadLetterQueue: {
      size: number;
      events: Array<{
        id: string;
        serviceName: string;
        eventType: string;
        attemptCount: number;
        createdAt: string;
        processedAt: string | null;
      }>;
    };
  };
}

type TabType = "monitor" | "configure" | "history";

export default function WebhookMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [currentStats, setCurrentStats] = useState<WebhookStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("monitor");
  const { notification } = useNotification();

  const handleStatsUpdate = (stats: WebhookStats) => {
    setCurrentStats(stats);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const handleManualRefresh = () => {
    setLoading(true);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <DashboardHeader
            autoRefresh={autoRefresh}
            loading={loading}
            onToggleAutoRefresh={toggleAutoRefresh}
            onManualRefresh={handleManualRefresh}
            title="Webhooks"
            description="Configure, monitor, and manage webhook endpoints and event processing"
          />

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("monitor")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "monitor"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Monitoring
              </button>
              <button
                onClick={() => setActiveTab("configure")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "configure"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Event History
              </button>
            </nav>
          </div>

          {/* Refresh Controls and Status */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Refresh interval:</span>
                <select
                  value={refreshInterval / 1000}
                  onChange={(e) =>
                    setRefreshInterval(parseInt(e.target.value) * 1000)
                  }
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="10">10s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="120">2m</option>
                </select>
              </label>

              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Quick Status Badge */}
            {currentStats && activeTab === "monitor" && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  currentStats.queue.deadLetterQueue.size === 0
                    ? "bg-green-100 text-green-800"
                    : currentStats.queue.deadLetterQueue.size > 10
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {currentStats.queue.deadLetterQueue.size === 0
                  ? "All Healthy"
                  : currentStats.queue.deadLetterQueue.size === 1
                    ? "1 Failed Event"
                    : `${currentStats.queue.deadLetterQueue.size} Failed Events`}
              </div>
            )}
          </div>
        </div>

        {/* Notification Display */}
        {notification && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              notification.type === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center">
              <span className="font-medium">
                {notification.type === "error" ? "Error:" : "Success:"}
              </span>
              <span className="ml-2">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === "monitor" && (
            <>
              <Suspense fallback={<DashboardSkeleton />}>
                <WebhookQueueMonitor
                  enableAutoRefresh={autoRefresh}
                  refreshInterval={refreshInterval}
                  onEventsUpdate={handleStatsUpdate}
                />
              </Suspense>

              {/* Additional Information Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Webhook Processing Flow
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                      <div>
                        <strong className="text-gray-900">
                          Queue Ingestion:
                        </strong>
                        <span className="text-gray-600 ml-2">
                          Incoming webhooks are queued for reliable processing
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                      <div>
                        <strong className="text-gray-900">
                          Processing Pipeline:
                        </strong>
                        <span className="text-gray-600 ml-2">
                          Events are processed with retry logic and error
                          handling
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                      <div>
                        <strong className="text-gray-900">
                          Dead Letter Queue:
                        </strong>
                        <span className="text-gray-600 ml-2">
                          Failed events are moved to DLQ for manual intervention
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Monitoring Best Practices
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span>
                        Monitor queue size to detect processing bottlenecks
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span>
                        Watch dead letter queue for recurring failures
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span>
                        Set up alerts for high error rates or queue overflow
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      <span>
                        Test webhook endpoints regularly to ensure reliability
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="text-sm font-medium text-blue-900 mb-4">
                  Quick Actions & Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      window.open("/api/webhooks/monitor", "_blank");
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    View Raw API Data
                  </button>
                  <button
                    onClick={() => {
                      window.open("/api/health", "_blank");
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    System Health Check
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("configure");
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Add New Webhook
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = "/dashboard/circuit-breakers";
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Circuit Breaker Status
                  </button>
                </div>
              </div>

              {/* Webhook Statistics */}
              {currentStats && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Historical Statistics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentStats.queue.size}
                      </div>
                      <div className="text-sm text-gray-600">In Queue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          currentStats.queue.processingStats
                            .processedEventsCount
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        Processed Today
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {currentStats.queue.deadLetterQueue.size}
                      </div>
                      <div className="text-sm text-gray-600">Failed Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {currentStats.queue.size > 0
                          ? Math.round(
                              (currentStats.queue.processingStats
                                .processedEventsCount /
                                (currentStats.queue.size +
                                  currentStats.queue.processingStats
                                    .processedEventsCount)) *
                                100,
                            )
                          : 100}
                        %
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "configure" && (
            <Suspense fallback={<DashboardSkeleton />}>
              <WebhookConfigurationManager />
            </Suspense>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event History
              </h3>
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Select a webhook configuration to view its event history.
                </p>
                <button
                  onClick={() => setActiveTab("configure")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Manage Webhooks
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8">
          <DashboardFooter
            loading={loading}
            autoRefresh={autoRefresh}
            lastRefresh={lastRefresh}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
