'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationList } from '@/components/notifications/notification-list';
import {
  NotificationFilters,
  NotificationFilterOptions,
} from '@/components/notifications/notification-filters';
import { useNotificationsData } from '@/lib/hooks/use-notifications-data';
import { analytics } from '@/lib/services/analytics-service';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [filters, setFilters] = useState<NotificationFilterOptions>({
    unreadOnly: false,
  });

  const { notifications, pagination, loading, error, markAsRead, markAllAsRead } =
    useNotificationsData({
      page,
      limit,
      unreadOnly: filters.unreadOnly,
      type: filters.type,
      autoRefresh: true,
      refreshInterval: 30000,
    });

  const handleLoadMore = () => {
    analytics.trackButtonClick('load-more-notifications', 'notifications', { page });
    setPage(prev => prev + 1);
  };

  const handleFiltersChange = (newFilters: NotificationFilterOptions) => {
    analytics.track('notification-filter-changed', { filters: newFilters });
    setFilters(newFilters);
    setPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
    analytics.trackButtonClick('mark-as-read', 'notifications', { notificationId: id });
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    analytics.trackButtonClick('mark-all-as-read', 'notifications', {
      unreadCount: pagination?.unreadCount,
    });
    await markAllAsRead();
  };

  const hasMore = pagination ? page < pagination.totalPages : false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">
              Stay updated with your projects, team activities, and important system events.
            </p>
          </div>
          {pagination && pagination.unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Mark All as Read
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <NotificationFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              unreadCount={pagination?.unreadCount}
            />
          </div>
          <div className="lg:col-span-3">
            <NotificationList
              notifications={notifications}
              pagination={pagination}
              loading={loading}
              error={error}
              onMarkAsRead={handleMarkAsRead}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
