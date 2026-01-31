import { useState, useEffect, useCallback } from "react";

export function useUnreadCount(refreshInterval: number = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=1&unreadOnly=true");

      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.pagination) {
        setUnreadCount(data.pagination.unreadCount);
      }
    } catch (_error) {
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
