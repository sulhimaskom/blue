import { useState, useCallback } from "react";

export interface UseMonitoringDashboardState {
  expandedService: string | null;
  error: string | null;
}

export interface UseMonitoringDashboardActions {
  toggleServiceExpansion: (serviceName: string) => void; // eslint-disable-line no-unused-vars
  clearError: () => void;
  setError: (errorMessage: string) => void; // eslint-disable-line no-unused-vars
}

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
