"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ActivityFilters, ActivityFilterOptions } from "@/components/activity/activity-filters";
import { useActivityData } from "@/lib/hooks/use-activity-data";
import { Button } from "@/components/ui/button";

export default function ActivityPage() {
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState<ActivityFilterOptions>({
    eventTypes: [],
  });

  const { activities, summary, loading, error } = useActivityData({
    limit,
    eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes.join(",") : undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const handleLoadMore = () => {
    setLimit((prev) => prev + 50);
  };

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Event Type", "Entity Type", "Entity ID", "Event Data"];
    const rows = activities.map((activity) => [
      activity.timestamp,
      activity.eventType,
      activity.entityType,
      activity.entityId,
      JSON.stringify(activity.eventData),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(activities, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity-export-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
            <p className="text-gray-600 mt-2">
              Track all your platform activities including projects, blueprints, deployments, and team events.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline">
              Export CSV
            </Button>
            <Button onClick={handleExportJSON} variant="outline">
              Export JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ActivityFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
          <div className="lg:col-span-3">
            <ActivityFeed
              activities={activities}
              summary={summary}
              loading={loading}
              error={error}
              onLoadMore={handleLoadMore}
              hasMore={activities.length >= limit}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
