"use client";

import React from "react";
import { Button } from "./button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Environment } from "@/lib/utils/environment";
import {
  getTextColor,
  getIconColor,
  getBackgroundColor,
  cn,
} from "@/lib/constants/ui-themes";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  // eslint-disable-next-line no-unused-vars
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div
                className={cn("p-3 rounded-full", getBackgroundColor("subtle"))}
              >
                <AlertTriangle
                  className={cn("h-6 w-6", getIconColor("error"))}
                />
              </div>
            </div>

            <h2
              className={cn(
                "text-xl font-semibold mb-2",
                getTextColor("heading"),
              )}
            >
              Something went wrong
            </h2>

            <p className={cn("mb-6", getTextColor("body"))}>
              We encountered an unexpected error. Please try refreshing the
              page.
            </p>

            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full"
                aria-label="Try again"
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
                aria-label="Refresh page"
              >
                <RefreshCw className="h-4 w-4mr-2" />
                Refresh Page
              </Button>
            </div>

            {Environment.isDevelopment() && this.state.error && (
              <details className="mt-6 text-left">
                <summary
                  className={cn(
                    "cursor-pointer text-sm font-mono hover:",
                    getTextColor("muted"),
                    getTextColor("body"),
                  )}
                >
                  Error Details (Development)
                </summary>
                <pre
                  className={cn(
                    "mt-2 text-xs p-3 rounded overflow-auto max-h-40",
                    getBackgroundColor("muted"),
                    getIconColor("error"),
                  )}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
