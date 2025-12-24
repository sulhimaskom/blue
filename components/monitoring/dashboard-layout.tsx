"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorIcon, RefreshIcon, ActivityIcon } from "@/components/ui/icons";

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  autoRefresh: boolean;
  loading: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
}

export function DashboardHeader({
  title = "System Monitoring Dashboard",
  description = "Real-time system health and performance metrics",
  autoRefresh,
  loading,
  onToggleAutoRefresh,
  onManualRefresh,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ActivityIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {title}
            </h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          variant="outline"
          onClick={onToggleAutoRefresh}
          className={`flex items-center gap-2 ${
            autoRefresh ? "bg-green-50 border-green-200 text-green-700" : ""
          }`}
        >
          {autoRefresh ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Auto-refresh ON
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              Auto-refresh OFF
            </>
          )}
        </Button>
        <Button
          onClick={onManualRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <div className={loading ? "animate-spin" : ""}>
            <RefreshIcon />
          </div>
          {loading ? "Refreshing..." : "Refresh Now"}
        </Button>
      </div>
    </div>
  );
}

interface ErrorBannerProps {
  error: string;
  title?: string;
}

export function ErrorBanner({
  error,
  title = "Connection Error",
}: ErrorBannerProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-3">
        <ErrorIcon />
        <div>
          <h3 className="text-red-800 font-medium">{title}</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({
  message = "Loading system data...",
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 text-blue-600 animate-spin">
          <RefreshIcon />
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  header: ReactNode;
  error?: string | null;
  loading: boolean;
  hasData: boolean;
  errorBanner?: ReactNode;
  loadingState?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({
  header,
  error,
  loading,
  hasData,
  errorBanner,
  loadingState,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {header}
        {error && (errorBanner || <ErrorBanner error={error} />)}
        {loading && !hasData && (loadingState || <LoadingState />)}
        {children}
      </div>
    </div>
  );
}
