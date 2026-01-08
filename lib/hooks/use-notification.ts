import { useState, useCallback } from "react";

export interface Notification {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

export function useNotification() {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = useCallback(
    (
      message: string,
      type: Notification["type"] = "info",
      duration: number = 5000,
    ) => {
      setNotification({ message, type, duration });

      if (duration > 0) {
        setTimeout(() => setNotification(null), duration);
      }
    },
    [],
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showError = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, "error", duration);
    },
    [showNotification],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, "success", duration);
    },
    [showNotification],
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, "info", duration);
    },
    [showNotification],
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showNotification(message, "warning", duration);
    },
    [showNotification],
  );

  return {
    notification,
    showNotification,
    hideNotification,
    showError,
    showSuccess,
    showInfo,
    showWarning,
    // Backward compatibility aliases for existing components
    setError: showError,
    setSuccess: showSuccess,
  };
}
