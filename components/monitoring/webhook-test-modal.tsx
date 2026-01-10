"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { BaseCard } from "@/components/ui/base-card";
import { Alert } from "@/components/ui/alert";
import type { WebhookConfiguration } from "@/lib/db/schema";
import { DatabaseError } from "@/lib/api-utils";

interface WebhookTestModalProps {
  config: WebhookConfiguration;
  onClose: () => void;
}

export function WebhookTestModal({ config, onClose }: WebhookTestModalProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>("test.event");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableEvents = [
    // Stripe events
    "payment_intent.succeeded",
    "payment_intent.failed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.completed",
    // Clerk events
    "user.created",
    "user.updated",
    "user.deleted",
    "email.created",
    "email.updated",
    "email.deleted",
    // Custom events
    "test.event",
    "blueprint.generated",
    "project.created",
    "payment.processed",
  ];

  const handleTest = async () => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/webhooks/configure/${config.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: selectedEvent }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new DatabaseError(data.error || "Test failed");
      }

      setTestResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Test Webhook: {config.name}
        </h3>
        <p className="text-sm text-gray-600">Configuration: {config.url}</p>
      </div>

      {/* Event Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Event Type to Test
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {availableEvents.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>

      {/* Test Button */}
      <div className="flex justify-between items-center">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleTest} disabled={isTesting}>
          {isTesting ? "Testing..." : "Send Test"}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <p className="font-medium">Test Failed</p>
          <p className="text-sm mt-1">{error}</p>
        </Alert>
      )}

      {/* Test Results */}
      {testResult && (
        <BaseCard>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Test Results
          </h4>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Status:
                </span>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      testResult.success
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {testResult.success ? "Success" : "Failed"}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-500">
                  Latency:
                </span>
                <p className="text-sm">{testResult.latency}ms</p>
              </div>

              {testResult.responseStatus && (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    HTTP Status:
                  </span>
                  <p className="text-sm">{testResult.responseStatus}</p>
                </div>
              )}
            </div>

            {testResult.responseBody && (
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Response Body:
                </span>
                <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                  {testResult.responseBody}
                </pre>
              </div>
            )}

            {testResult.error && (
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Error:
                </span>
                <p className="mt-1 p-3 bg-red-50 rounded text-sm text-red-800">
                  {testResult.error}
                </p>
              </div>
            )}
          </div>
        </BaseCard>
      )}
    </div>
  );
}
