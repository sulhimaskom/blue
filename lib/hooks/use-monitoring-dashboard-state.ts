import { useState, useCallback } from "react";

/* eslint-disable no-unused-vars */
export interface UseMonitoringDashboardState {
  expandedService: string | null;
  error: string | null;
}

export interface UseMonitoringDashboardActions {
  toggleServiceExpansion: (serviceName: string) => void;
  clearError: () => void;
  setError: (errorMessage: string) => void;
}
/* eslint-enable no-unused-vars */

export function useMonitoringDashboardState(): UseMonitoringDashboardState &
  UseMonitoringDashboardActions {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleServiceExpansion = useCallback((serviceName: string) => {
    setExpandedService((prev) => (prev === serviceName ? null : serviceName));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setErrorMessage = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  return {
    expandedService,
    error,
    toggleServiceExpansion,
    clearError,
    setError: setErrorMessage,
  };
}
