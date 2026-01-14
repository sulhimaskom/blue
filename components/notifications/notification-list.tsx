import React from "react";
import { Notification, NotificationPagination } from "@/lib/hooks/use-notifications-data";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";

interface NotificationListProps {
  notifications: Notification[];
  pagination: NotificationPagination | null;
  loading?: boolean;
  error?: string | null;
  onMarkAsRead: (_id: string) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const NotificationList = React.memo(
  ({
    notifications,
    pagination,
    loading = false,
    error = null,
    onMarkAsRead,
    onLoadMore,
    hasMore = false,
  }: NotificationListProps) => {
    if (loading && notifications.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-900 font-medium mb-2">Error Loading Notifications</h3>
          <p className="text-red-700">{error}</p>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-600">
            {pagination?.unreadCount === 0
              ? "You have no unread notifications."
              : "Your notifications list is empty. You'll see notifications here when events occur."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {pagination && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Notifications
                </h3>
                <p className="text-sm text-gray-600">
                  Showing {notifications.length} of {pagination.total} total notifications
                  {pagination.unreadCount > 0 && ` • ${pagination.unreadCount} unread`}
                </p>
              </div>
              {pagination.unreadCount > 0 && (
                <Button onClick={onLoadMore} variant="outline" size="sm">
                  Mark All as Read
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </div>
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="outline"
              className="min-w-[200px]"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

NotificationList.displayName = "NotificationList";
