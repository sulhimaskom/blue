import { useState, useEffect, useCallback } from "react";
import { ServiceError } from "@/lib/services/service-error-handler";

export function useUnreadCount(refreshInterval: number = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=1&unreadOnly=true");

      if (!response.ok) {
        throw ServiceError.validation(
          `Failed to fetch unread count: ${response.statusText}`,
          "useUnreadCount",
          "fetchUnreadCount",
          { statusCode: response.status }
        );
      }

      const data = await response.json();

      if (data.success && data.pagination) {
        setUnreadCount(data.pagination.unreadCount);
      }
    } catch (error) {
      // Error is logged but not thrown to avoid disrupting the UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchUnreadCount, refreshInterval]);

  return { unreadCount, loading };
}
