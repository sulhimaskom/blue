import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

export interface ActivityItem {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: string;
}

export interface ActivitySummary {
  totalActivities: number;
  projectActivities: number;
  teamActivities: number;
  userActivities: number;
  blueprintActivities: number;
  deploymentActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByDay: Record<string, number>;
}

export interface UseActivityDataOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  eventTypes?: string;
}

export function useActivityData(options?: UseActivityDataOptions) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options?.limit) params.set("limit", options.limit.toString());
        if (options?.offset) params.set("offset", options.offset.toString());
        if (options?.startDate) params.set("startDate", options.startDate);
        if (options?.endDate) params.set("endDate", options.endDate);
        if (options?.eventTypes) params.set("eventTypes", options.eventTypes);

        const response = await fetch(`/api/activity/feed?${params.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activity feed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          setActivities(data.data.activity || []);
        } else {
          throw new Error(data.error || "Failed to fetch activity feed");
        }

        const summaryResponse = await fetch("/api/activity/summary", {
          credentials: "include",
        });

        if (!summaryResponse.ok) {
          throw new Error(`Failed to fetch activity summary: ${summaryResponse.statusText}`);
        }

        const summaryData = await summaryResponse.json();
        if (summaryData.success) {
          setSummary(summaryData.data.summary);
        } else {
          throw new Error(summaryData.error || "Failed to fetch activity summary");
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        logger.error("Failed to fetch activity data", {
          error: errorMessage,
          options,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [options]);

  return {
    activities,
    summary,
    loading,
    error,
  };
}
