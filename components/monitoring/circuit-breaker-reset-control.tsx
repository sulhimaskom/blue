/* eslint-disable no-unused-vars */
"use client";

import React, { useState } from "react";
import { BaseCard } from "@/components/ui/base-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { cn } from "@/lib/constants/ui-themes";
import { useNotification } from "@/lib/hooks/use-notification";

interface ResetResult {
  timestamp: string;
  action: string;
  message: string;
  affectedServices: string[];
  nextHealthCheck: string;
}

interface CircuitBreakerResetControlProps {
  /** Callback function when reset is completed */
  onResetComplete?: (_result: ResetResult) => void;
  /** Callback function to refresh circuit breaker metrics */
  onRefreshMetrics?: () => void;
  /** Whether to show confirmation dialog */
  requireConfirmation?: boolean;
  /** Custom button text */
  buttonText?: string;
}

/**
 * Component for resetting circuit breakers
 * Provides admin controls for manual circuit breaker recovery
 * Compliant with blueprint.md atomic component principles - no business logic
 */
export function CircuitBreakerResetControl({
  onResetComplete,
  onRefreshMetrics,
  requireConfirmation = true,
  buttonText = "Reset All Circuit Breakers",
}: CircuitBreakerResetControlProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { notification, showError, showSuccess, hideNotification } =
    useNotification();

  // Handle circuit breaker reset
  const handleReset = async () => {
    if (requireConfirmation && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      hideNotification();

      const response = await fetch("/api/circuit-breakers/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        showSuccess(data.message || "Circuit breakers reset successfully");
        onResetComplete?.(data.data);

        // Auto-refresh metrics after successful reset
        setTimeout(() => {
          onRefreshMetrics?.();
        }, 1000);
      } else {
        throw new Error(data.error || "Failed to reset circuit breakers");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // Cancel confirmation
  const handleCancel = () => {
    setShowConfirm(false);
    hideNotification();
  };

  return (
    <BaseCard className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <StatusIndicator status="degraded" size="sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Circuit Breaker Reset
            </h3>
            <p className="text-sm text-gray-600">
              Manual recovery controls for circuit breakers
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-yellow-600 text-lg">⚠️</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Admin Action Required
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Resetting circuit breakers will immediately restore all services
                to operational state, bypassing failure protection. Use only
                when you have verified the underlying issues are resolved.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-red-600 text-lg">🛑</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">
                  Confirm Circuit Breaker Reset
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  This action will immediately reset all circuit breakers to the
                  CLOSED state, allowing requests to flow through all services
                  again.
                </p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Resetting..." : "Yes, Reset All"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!showConfirm && (
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              disabled={loading}
              className={cn(
                "px-6 py-3 rounded-lg font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : requireConfirmation
                    ? "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
              )}
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin">⟳</span>
                  <span>Resetting...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>{buttonText}</span>
                </span>
              )}
            </button>
          </div>
        )}

        {/* Success Message */}
        {notification?.type === "success" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <StatusIndicator status="healthy" size="sm" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">
                  Reset Successful
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Circuit breakers are now accepting requests. Monitor the
                  status above to confirm recovery.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {notification?.type === "error" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <StatusIndicator status="unhealthy" size="sm" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800">
                  Reset Failed
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {notification.message}
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Retrying..." : "Retry Reset"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="font-medium mb-2">What this reset affects:</div>
            <ul className="space-y-1 ml-4">
              <li>• AI Service Circuit Breakers (iflow, tavily)</li>
              <li>• GitHub API Circuit Breaker</li>
              <li>• All registered service circuit breakers</li>
              <li>• Error counters and failure tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
