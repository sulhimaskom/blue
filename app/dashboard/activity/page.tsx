'use client';

import { useState, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useActivityData } from '@/lib/hooks/use-activity-data';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import type { ActivityFilterOptions } from '@/components/activity/activity-filters';
import { analytics } from '@/lib/services/analytics-service';

const ActivityFeed = lazy(() =>
  import('@/components/dashboard/activity-feed').then(module => ({
    default: module.ActivityFeed,
  }))
);

const ActivityFilters = lazy(() =>
  import('@/components/activity/activity-filters').then(module => ({
    default: module.ActivityFilters,
  }))
);

export default function ActivityPage() {
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState<ActivityFilterOptions>({
    eventTypes: [],
  });

  const { activities, summary, loading, error } = useActivityData({
    limit,
    eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes.join(',') : undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const handleLoadMore = () => {
    analytics.trackButtonClick('load-more-activity', 'activity', { limit });
    setLimit(prev => prev + 50);
  };

  const handleExportCSV = () => {
    analytics.trackButtonClick('export-csv', 'activity', { activityCount: activities.length });
    const headers = ['Timestamp', 'Event Type', 'Entity Type', 'Entity ID', 'Event Data'];
    const rows = activities.map(activity => [
      activity.timestamp,
      activity.eventType,
      activity.entityType,
      activity.entityId,
      JSON.stringify(activity.eventData),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    analytics.trackButtonClick('export-json', 'activity', { activityCount: activities.length });
    const jsonContent = JSON.stringify(activities, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleFilterChange = (newFilters: ActivityFilterOptions) => {
    analytics.track('activity-filter-changed', { filters: newFilters });
    setFilters(newFilters);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
            <p className="text-gray-600 mt-2">
              Track all your platform activities including projects, blueprints, deployments, and
              team events.
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
            <Suspense fallback={<DashboardSkeleton />}>
              <ActivityFilters filters={filters} onFiltersChange={handleFilterChange} />
            </Suspense>
          </div>
          <div className="lg:col-span-3">
            <Suspense fallback={<DashboardSkeleton />}>
              <ActivityFeed
                activities={activities}
                summary={summary}
                loading={loading}
                error={error}
                onLoadMore={handleLoadMore}
                hasMore={activities.length >= limit}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
