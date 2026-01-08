"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BaseCard } from "@/components/ui/base-card";
import type { WebhookConfiguration } from "@/lib/db/schema";

interface WebhookEventHistoryProps {
  config: WebhookConfiguration;
  onClose: () => void;
}

export default function WebhookEventHistory({
  config,
  onClose,
}: WebhookEventHistoryProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retiringEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simplified fetch logic - will be implemented properly later
      setEvents([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id]);

  return (
    <BaseCard className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event History - {config.name}</h3>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No events found for this webhook
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-md p-3 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{event.eventType}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    event.status === "success"
                      ? "bg-green-100 text-green-800"
                      : event.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {event.status}
                </span>
                {event.status === "failed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retiringEventId === event.id}
                    onClick={() => {
                      // Retry logic to be implemented
                    }}
                  >
                    {retiringEventId === event.id ? "Retrying..." : "Retry"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseCard>
  );
}
