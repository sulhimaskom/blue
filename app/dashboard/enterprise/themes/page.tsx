/**
 * Enterprise Theme Management Dashboard
 *
 * Complete theme management interface for enterprise customers
 * Provides theme creation, editing, activation, and management capabilities
 *
 * @page Enterprise Themes Dashboard
 */

"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  enterpriseThemeManager,
  type EnterpriseThemeConfig,
} from "@/lib/constants/enterprise-themes";
import { EnterpriseThemeCustomizer } from "@/components/enterprise/enterprise-theme-customizer";
import { cn } from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { MetricCard } from "@/components/ui/metric-card";

interface ThemeStats {
  totalThemes: number;
  activeThemes: number;
  enterpriseCustomers: number;
  customizationRate: number;
}

export default function EnterpriseThemesPage() {
  const [themes, setThemes] = useState<EnterpriseThemeConfig[]>([]);
  const [activeTheme, setActiveTheme] = useState<EnterpriseThemeConfig | null>(
    null,
  );
  const [selectedTheme, setSelectedTheme] =
    useState<EnterpriseThemeConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<ThemeStats>({
    totalThemes: 0,
    activeThemes: 0,
    enterpriseCustomers: 0,
    customizationRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load themes and stats
  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setIsLoading(true);

    try {
      // Load from local theme manager (in production, this would be from API)
      const allThemes = enterpriseThemeManager.getAllThemes();
      const activeThemeData = enterpriseThemeManager.getActiveTheme();

      setThemes(allThemes);
      setActiveTheme(activeThemeData);

      // Calculate stats
      setStats({
        totalThemes: allThemes.length,
        activeThemes: activeThemeData ? 1 : 0,
        enterpriseCustomers: allThemes.filter((t) => t.isActive).length,
        customizationRate:
          allThemes.length > 0
            ? (allThemes.filter((t) => t.logoUrl).length / allThemes.length) *
              100
            : 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTheme = (themeId: string) => {
    enterpriseThemeManager.setActiveTheme(themeId);
    loadThemes(); // Refresh data
  };

  const handleResetTheme = () => {
    enterpriseThemeManager.resetTheme();
    loadThemes(); // Refresh data
  };

  const handleSelectTheme = (theme: EnterpriseThemeConfig) => {
    setSelectedTheme(theme);
    setIsEditing(true);
  };

  const handleThemeUpdate = () => {
    loadThemes(); // Refresh themes and stats
    setIsEditing(false);
    setSelectedTheme(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enterprise themes...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Enterprise Themes
            </h1>
            <p className="mt-1 text-gray-600">
              Manage white-label themes for enterprise customers
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeTheme && (
              <div className="flex items-center gap-2">
                <StatusIndicator status="healthy" />
                <span className="text-sm text-green-600">
                  Active: {activeTheme.brandName}
                </span>
              </div>
            )}
            <Button onClick={handleResetTheme} variant="outline">
              Reset to Default
            </Button>
            <Button onClick={() => setIsEditing(true)}>Create New Theme</Button>
          </div>
        </div>
      </div>

      <div>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Themes"
            value={stats.totalThemes}
            trend={{ value: 0, direction: "neutral" }}
            icon="activity"
          />
          <MetricCard
            title="Active Theme"
            value={stats.activeThemes}
            trend={{
              value: stats.activeThemes,
              direction: stats.activeThemes > 0 ? "up" : "neutral",
            }}
            icon="server"
          />
          <MetricCard
            title="Enterprise Customers"
            value={stats.enterpriseCustomers}
            trend={{ value: 0, direction: "neutral" }}
            icon="chart"
          />
          <MetricCard
            title="Customization Rate"
            value={`${stats.customizationRate.toFixed(1)}%`}
            trend={{
              value: Math.round(stats.customizationRate),
              direction: "up",
            }}
            icon="activity"
          />
        </div>

        {isEditing ? (
          /* Theme Customizer */
          <EnterpriseThemeCustomizer
            customerId={selectedTheme?.customerId}
            onThemeChange={handleThemeUpdate}
          />
        ) : (
          /* Theme List */
          <div className="space-y-6">
            {/* Active Theme Highlight */}
            {activeTheme && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">✨</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">
                        Currently Active Theme
                      </h3>
                      <p className="text-blue-700">
                        {activeTheme.brandName} ({activeTheme.customerId})
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleResetTheme}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            )}

            {/* Theme Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-4">All Themes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => {
                  const isActive = activeTheme?.customerId === theme.customerId;

                  return (
                    <div
                      key={theme.customerId}
                      className={cn(
                        "bg-white border rounded-lg p-6 hover:shadow-md transition-shadow",
                        isActive
                          ? "border-blue-500 shadow-md"
                          : "border-gray-200",
                      )}
                    >
                      <div className="space-y-4">
                        {/* Theme Preview */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div
                              className="w-8 h-8 rounded"
                              style={{ backgroundColor: theme.primaryColor }}
                            />
                            <div
                              className="w-8 h-8 rounded"
                              style={{ backgroundColor: theme.secondaryColor }}
                            />
                            <div
                              className="w-8 h-8 rounded"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                          </div>

                          {theme.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={theme.logoUrl}
                              alt={theme.brandName}
                              className="h-8 object-contain"
                            />
                          )}
                        </div>

                        {/* Theme Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {theme.brandName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {theme.customerId}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <StatusIndicator
                            status={isActive ? "healthy" : "unhealthy"}
                            size="sm"
                          />
                          <span className="text-sm text-gray-600">
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!isActive ? (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleActivateTheme(theme.customerId)
                              }
                              className="flex-1"
                            >
                              Activate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleResetTheme}
                              className="flex-1"
                            >
                              Deactivate
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectTheme(theme)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
