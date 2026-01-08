"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdvancedPerformanceDashboard } from "@/components/monitoring/advanced-performance-dashboard";

/**
 * Advanced Performance Monitoring Dashboard page.
 *
 * This page provides comprehensive performance analytics with:
 * - Real-time performance metrics visualization
 * - AI cache optimization controls
 * - Predictive performance analytics
 * - Integration with existing monitoring ecosystem
 *
 * Architecture: Service layer compliant with zero business logic in UI
 * - Uses AdvancedPerformanceDashboard for all performance operations
 * - Integrates with existing dashboard layout and theming
 * - Atomic component following blueprint.md principles
 */
export default function AdvancedPerformanceDashboardPage() {
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
            Advanced Performance Analytics
          </h1>
          <p className="text-gray-600">
            Comprehensive performance monitoring with AI-powered optimization
            and predictive analytics.
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

        <AdvancedPerformanceDashboard
          onError={handleError}
          onSuccess={handleSuccess}
        />

        {/* Additional Performance Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Analytics Documentation */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Understanding Performance Metrics
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">System Metrics:</strong>
                  <span className="text-gray-600 ml-2">
                    CPU, memory, disk I/O, and network performance monitoring.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">
                    Application Metrics:
                  </strong>
                  <span className="text-gray-600 ml-2">
                    Response times, throughput, and error rate tracking.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full mt-1"></div>
                <div>
                  <strong className="text-gray-900">Database Metrics:</strong>
                  <span className="text-gray-600 ml-2">
                    Connection pool usage, query performance, and cache
                    efficiency.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Optimization Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              AI Optimization & Predictions
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  AI-powered cache optimization reduces API costs by 5-15%
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Predictive analytics anticipate performance bottlenecks 24-48
                  hours in advance
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Machine learning models continuously improve based on usage
                  patterns
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                <span>
                  Real-time optimization recommendations with confidence scores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
