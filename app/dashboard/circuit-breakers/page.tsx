"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CircuitBreakerStatusPanel } from "@/components/monitoring/circuit-breaker-status-panel";

/**
 * Circuit Breaker Monitoring Dashboard page.
 *
 * This page provides comprehensive circuit breaker monitoring with:
 * - Real-time circuit breaker status visualization
 * - Manual circuit breaker reset capabilities
 * - Historical circuit breaker events tracking
 * - Integration with existing monitoring ecosystem
 *
 * Architecture: Service layer compliant with zero business logic in UI
 * - Uses CircuitBreakerStatusPanel for all circuit breaker operations
 * - Integrates with existing dashboard layout and theming
 * - Atomic component following blueprint.md principles
 */
export default function CircuitBreakerDashboard() {
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleError = (error: string) => {
    setNotification({ message: error, type: "error" });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSuccess = (message: string) => {
    setNotification({ message: message, type: "success" });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Circuit Breaker Monitoring
          </h1>
          <p className="text-gray-600">
            Monitor system circuit breakers, view real-time status, and manage
            manual resets for production stability.
          </p>
        </div>

        {/* Notification Display */}
        {notification && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              notification.type === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center">
              <span className="font-medium">
                {notification.type === "error" ? "Error:" : "Success:"}
              </span>
              <span className="ml-2">{notification.message}</span>
            </div>
          </div>
        )}

        <CircuitBreakerStatusPanel
          onError={handleError}
          onSuccess={handleSuccess}
        />

        {/* Additional Circuit Breaker Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Circuit Breaker Documentation */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Understanding Circuit Breaker States
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">CLOSED:</strong>
                  <span className="text-gray-600 ml-2">
                    Normal operation. All requests pass through.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">OPEN:</strong>
                  <span className="text-gray-600 ml-2">
                    Circuit tripped. All requests fail fast.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">HALF_OPEN:</strong>
                  <span className="text-gray-600 ml-2">
                    Testing recovery mode. Limited requests allowed.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions & Best Practices
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>Monitor circuit breakers during high-traffic events</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Reset individual circuits only after resolving underlying
                  issues
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Use &quot;Reset All Open&quot; only during full system
                  recovery
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Alert thresholds: 5 consecutive failures trigger circuit
                  opening
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
