import { useState, useEffect, useCallback } from "react";
import { NotificationType, NotificationMetadata } from "@/lib/services/notification-service";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface UseNotificationsDataParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseNotificationsDataReturn {
  notifications: Notification[];
  pagination: NotificationPagination | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (_notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotificationsData(
  params: UseNotificationsDataParams = {},
): UseNotificationsDataReturn {
  const { page = 1, limit = 20, unreadOnly, type, autoRefresh = true, refreshInterval = 30000 } = params;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<NotificationPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page.toString());
      if (limit) queryParams.append("limit", limit.toString());
      if (unreadOnly) queryParams.append("unreadOnly", "true");
      if (type) queryParams.append("type", type);

      const response = await fetch(`/api/notifications?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : null,
        })));
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || "Failed to fetch notifications");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setNotifications([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, limit, unreadOnly, type]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: new Date() }
              : n
          )
        );
        setPagination((prev) =>
          prev ? { ...prev, unreadCount: data.unreadCount } : null
        );
      } else {
        throw new Error(data.error || "Failed to mark notification as read");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date() }))
        );
        setPagination((prev) =>
          prev ? { ...prev, unreadCount: 0 } : null
        );
      } else {
        throw new Error(data.error || "Failed to mark all notifications as read");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  return {
    notifications,
    pagination,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
