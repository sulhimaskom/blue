"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorIcon, RefreshIcon, ActivityIcon } from "@/components/ui/icons";
import { Gradients } from "@/lib/constants/gradients";
import { getUIText } from "@/lib/constants/ui-text";
import {
  STATUS_THEMES,
  ANIMATION_STATES,
  getBackgroundColor,
  getTextColor,
  getIconColor,
  cn,
} from "@/lib/constants/ui-themes";

/**
 * Props for the DashboardHeader component.
 * @interface DashboardHeaderProps
 */
interface DashboardHeaderProps {
  /** Optional custom title for the dashboard header. Defaults to "System Monitoring Dashboard" */
  title?: string;
  /** Optional custom description for the dashboard. Defaults to "Real-time system health and performance metrics" */
  description?: string;
  /** Current state of auto-refresh functionality */
  autoRefresh: boolean;
  /** Loading state for manual refresh operation */
  loading: boolean;
  /** Callback function to toggle auto-refresh on/off */
  onToggleAutoRefresh: () => void;
  /** Callback function to trigger manual data refresh */
  onManualRefresh: () => void;
}

/**
 * DashboardHeader component that provides the main header with auto-refresh controls.
 *
 * Features:
 * - Customizable title and description
 * - Auto-refresh toggle with live indicator
 * - Manual refresh button with loading state
 * - Responsive layout for mobile and desktop
 *
 * @example
 * ```tsx
 * <DashboardHeader
 *   title="Custom Dashboard"
 *   description="Monitoring custom services"
 *   autoRefresh={true}
 *   loading={false}
 *   onToggleAutoRefresh={() => console.log('toggle refresh')}
 *   onManualRefresh={() => console.log('manual refresh')}
 * />
 * ```
 */
export function DashboardHeader({
  title = getUIText("monitoring", "dashboardTitle"),
  description = getUIText("monitoring", "dashboardDescription"),
  autoRefresh,
  loading,
  onToggleAutoRefresh,
  onManualRefresh,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-8">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn("p-2 rounded-lg", getBackgroundColor("accent"))}>
            <ActivityIcon />
          </div>
          <div>
            <h1
              className={cn(
                "text-3xl font-bold leading-tight",
                getTextColor("heading"),
              )}
            >
              {title}
            </h1>
            <p className={cn("mt-1", getTextColor("body"))}>{description}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          variant="outline"
          onClick={onToggleAutoRefresh}
          aria-label={
            autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"
          }
          className={`flex items-center gap-2 ${
            autoRefresh ? STATUS_THEMES.healthy.combined : ""
          }`}
        >
          {autoRefresh ? (
            <>
              <div
                className={ANIMATION_STATES.liveAnimated}
                aria-hidden="true"
              />
              <span>{getUIText("monitoring", "autoRefreshOn")}</span>
            </>
          ) : (
            <>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full"
                aria-hidden="true"
              />
              <span>{getUIText("monitoring", "autoRefreshOff")}</span>
            </>
          )}
        </Button>
        <Button
          onClick={onManualRefresh}
          disabled={loading}
          aria-label={
            loading
              ? getUIText("monitoring", "refreshingData")
              : getUIText("monitoring", "refreshNow")
          }
          className="flex items-center gap-2"
        >
          <div className={loading ? "animate-spin" : ""} aria-hidden="true">
            <RefreshIcon />
          </div>
          {loading
            ? getUIText("monitoring", "refreshingNow")
            : getUIText("monitoring", "refreshNow")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Props for the ErrorBanner component.
 * @interface ErrorBannerProps
 */
interface ErrorBannerProps {
  /** Error message to display to the user */
  error: string;
  /** Optional custom title for the error banner. Defaults to "Connection Error" */
  title?: string;
}

/**
 * ErrorBanner component for displaying connection or API errors to users.
 *
 * Features:
 * - Consistent error styling using theme colors
 * - Error icon for visual feedback
 * - Customizable title and message
 * - Accessible error presentation
 *
 * @example
 * ```tsx
 * <ErrorBanner
 *   title="API Error"
 *   error="Failed to fetch monitoring data. Please try again."
 * />
 * ```
 */
export function ErrorBanner({
  error,
  title = getUIText("monitoring", "connectionError"),
}: ErrorBannerProps) {
  return (
    <div
      className={`mb-6 p-4 rounded-lg border ${STATUS_THEMES.unhealthy.background} ${STATUS_THEMES.unhealthy.border}`}
    >
      <div className="flex items-center gap-3">
        <ErrorIcon />
        <div>
          <h3
            className={`font-medium ${STATUS_THEMES.unhealthy.text.replace("700", "800")}`}
          >
            {title}
          </h3>
          <p
            className={`text-sm ${STATUS_THEMES.unhealthy.text.replace("700", "600")}`}
          >
            {error}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Props for the LoadingState component.
 * @interface LoadingStateProps
 */
interface LoadingStateProps {
  /** Optional custom loading message. Defaults to "Loading system data..." */
  message?: string;
}

/**
 * LoadingState component for displaying loading indicators during data fetching.
 *
 * Features:
 * - Animated refresh icon
 * - Customizable loading message
 * - Centered layout with proper spacing
 * - Accessible loading indicator
 *
 * @example
 * ```tsx
 * <LoadingState message="Fetching latest metrics..." />
 * ```
 */
export function LoadingState({
  message = getUIText("monitoring", "loadingSystemData"),
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className={cn("w-8 h-8 animate-spin", getIconColor("accent"))}>
          <RefreshIcon />
        </div>
        <p className={getTextColor("body")}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Props for the DashboardLayout component.
 * @interface DashboardLayoutProps
 */
interface DashboardLayoutProps {
  /** Header component to display at the top of the dashboard */
  header: ReactNode;
  /** Optional error message to display. If provided, shows error banner */
  error?: string | null;
  /** Loading state indicator for the dashboard */
  loading: boolean;
  /** Flag indicating whether data is available for display */
  hasData: boolean;
  /** Optional custom error banner component. If not provided, uses default ErrorBanner */
  errorBanner?: ReactNode;
  /** Optional custom loading state component. If not provided, uses default LoadingState */
  loadingState?: ReactNode;
  /** Main content of the dashboard */
  children: ReactNode;
}

/**
 * DashboardLayout component that provides the main layout structure for monitoring dashboards.
 *
 * Architectural Pattern:
 * - Atomic design pattern with composable components
 * - Separation of concerns: layout handles presentation, not data fetching
 * - Responsive design with mobile-first approach
 * - Accessibility-first with proper ARIA labels
 *
 * Features:
 * - Consistent gradient background using theme system
 * - Responsive padding for all screen sizes
 * - Maximum width container for optimal reading
 * - Error and loading state management
 * - Flexible content area with customizable components
 *
 * @example
 * ```tsx
 * <DashboardLayout
 *   header={<DashboardHeader {...headerProps} />}
 *   error={error}
 *   loading={loading}
 *   hasData={hasData}
 * >
 *   <SystemHealthOverview {...healthProps} />
 *   <PerformanceMetrics {...metricsProps} />
 * </DashboardLayout>
 * ```
 */
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
    <div
      className={`min-h-screen ${Gradients.PAGE_BACKGROUND} p-4 md:p-6 lg:p-8`}
    >
      <div className="max-w-7xl mx-auto">
        {header}
        {error && (errorBanner || <ErrorBanner error={error} />)}
        {loading && !hasData && (loadingState || <LoadingState />)}
        {children}
      </div>
    </div>
  );
}
