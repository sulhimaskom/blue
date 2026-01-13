"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { useActivityData } from "@/lib/hooks/use-activity-data";

export default function ActivityPage() {
  const [limit, setLimit] = useState(50);
  const { activities, summary, loading, error } = useActivityData({ limit });

  const handleLoadMore = () => {
    setLimit((prev) => prev + 50);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-gray-600 mt-2">
            Track all your platform activities including projects, blueprints, deployments, and team events.
          </p>
        </div>

        <ActivityFeed
          activities={activities}
          summary={summary}
          loading={loading}
          error={error}
          onLoadMore={handleLoadMore}
          hasMore={activities.length >= limit}
        />
      </div>
    </DashboardLayout>
  );
}
