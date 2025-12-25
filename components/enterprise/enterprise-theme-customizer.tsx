/**
 * Enterprise Theme Customization Component
 *
 * Provides complete white-label customization interface for enterprise customers
 * Enables brand customization, logo upload, and real-time theme preview
 *
 * @component EnterpriseThemeCustomizer
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  useEnterpriseTheme,
  createEnterpriseTheme,
  ENTERPRISE_THEME_TEMPLATES,
} from "@/lib/constants/enterprise-themes";
import {
  cn,
  getTextColor,
  getBackgroundColor,
  getAccentColor,
} from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";

interface EnterpriseThemeCustomizerProps {
  /** Customer ID for theme management */
  customerId?: string;
  /** Theme change callback */
  onThemeChange?: () => void;
}

export function EnterpriseThemeCustomizer({
  customerId,
  onThemeChange,
}: EnterpriseThemeCustomizerProps) {
  const { activeTheme, setTheme, resetTheme, registerTheme } =
    useEnterpriseTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customTheme, setCustomTheme] = useState({
    brandName: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    accentColor: "#10b981",
    logoUrl: "",
  });
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize with current customer's theme if available
  useEffect(() => {
    if (customerId && activeTheme?.customerId !== customerId) {
      setTheme(customerId);
    }
  }, [customerId, activeTheme, setTheme]);

  /**
   * Apply selected template
   */
  const applyTemplate = (templateId: string) => {
    const template = ENTERPRISE_THEME_TEMPLATES[templateId];
    if (template) {
      setCustomTheme({
        brandName: template.brandName,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        accentColor: template.accentColor,
        logoUrl: template.logoUrl || "",
      });
      setSelectedTemplate(templateId);
    }
  };

  /**
   * Save and apply custom theme
   */
  const saveCustomTheme = async () => {
    if (!customTheme.brandName) return;

    setIsSaving(true);

    try {
      const newTheme = createEnterpriseTheme({
        customerId:
          customerId ||
          customTheme.brandName.toLowerCase().replace(/\s+/g, "-"),
        brandName: customTheme.brandName,
        primaryColor: customTheme.primaryColor,
        secondaryColor: customTheme.secondaryColor,
        accentColor: customTheme.accentColor,
        logoUrl: customTheme.logoUrl || undefined,
      });

      registerTheme(newTheme);
      setTheme(newTheme.customerId);

      onThemeChange?.();

      // Show success feedback
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    } catch {
      setIsSaving(false);
    }
  };

  /**
   * Export theme configuration
   */
  const exportTheme = () => {
    if (!activeTheme) return;

    const themeData = JSON.stringify(activeTheme, null, 2);
    const blob = new Blob([themeData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTheme.customerId}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Reset to default theme
   */
  const handleReset = () => {
    resetTheme();
    setSelectedTemplate("");
    setCustomTheme({
      brandName: "",
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      accentColor: "#10b981",
      logoUrl: "",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className={cn("text-2xl font-bold", getTextColor("heading"))}>
          Enterprise Theme Customizer
        </h2>
        <p className={cn(getTextColor("body"))}>
          Customize the platform appearance to match your brand identity
        </p>
        {activeTheme && (
          <div className="flex items-center justify-center gap-2">
            <StatusIndicator status="healthy" size="sm" />
            <span className={cn("text-sm", getAccentColor("blue", "primary"))}>
              Active: {activeTheme.brandName}
            </span>
          </div>
        )}
      </div>

      {/* Theme Templates */}
      <div className={cn("rounded-lg border p-6", getBackgroundColor("card"))}>
        <h3
          className={cn("text-lg font-semibold mb-4", getTextColor("heading"))}
        >
          Quick Start Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(ENTERPRISE_THEME_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                selectedTemplate === key
                  ? cn("border-blue-500", getAccentColor("blue", "background"))
                  : cn(
                      "border-gray-200 hover:border-gray-300",
                      getBackgroundColor("subtle"),
                    ),
              )}
            >
              <div
                className="w-full h-8 rounded mb-2"
                style={{ backgroundColor: template.primaryColor }}
              />
              <div className="text-sm font-medium">{template.brandName}</div>
              <div className={cn("text-xs capitalize", getTextColor("muted"))}>
                {key}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Theme Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Custom Brand Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brand Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                value={customTheme.brandName}
                onChange={(e) =>
                  setCustomTheme((prev) => ({
                    ...prev,
                    brandName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL (optional)
              </label>
              <input
                type="url"
                value={customTheme.logoUrl}
                onChange={(e) =>
                  setCustomTheme((prev) => ({
                    ...prev,
                    logoUrl: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          {/* Color Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customTheme.primaryColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={customTheme.primaryColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customTheme.secondaryColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value,
                    }))
                  }
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={customTheme.secondaryColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      secondaryColor: e.target.value,
                    }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#8b5cf6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customTheme.accentColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      accentColor: e.target.value,
                    }))
                  }
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={customTheme.accentColor}
                  onChange={(e) =>
                    setCustomTheme((prev) => ({
                      ...prev,
                      accentColor: e.target.value,
                    }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#10b981"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            onClick={saveCustomTheme}
            disabled={!customTheme.brandName || isSaving}
            className="min-w-32"
          >
            {isSaving ? "Saving..." : "Apply Theme"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? "Exit Preview" : "Preview Mode"}
          </Button>

          {activeTheme && (
            <Button variant="outline" onClick={exportTheme}>
              Export Theme
            </Button>
          )}

          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      {previewMode && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>

          <div className="space-y-4">
            {/* Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Status Indicators</h4>
                <div className="space-y-2">
                  <StatusIndicator status="healthy" />
                  <StatusIndicator status="degraded" />
                  <StatusIndicator status="unhealthy" />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Buttons</h4>
                <div className="space-y-2">
                  <Button size="sm">Primary Action</Button>
                  <Button variant="outline" size="sm">
                    Secondary
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Colors</h4>
                <div className="space-y-2">
                  <div
                    className="w-full h-6 rounded"
                    style={{ backgroundColor: customTheme.primaryColor }}
                  />
                  <div
                    className="w-full h-6 rounded"
                    style={{ backgroundColor: customTheme.secondaryColor }}
                  />
                  <div
                    className="w-full h-6 rounded"
                    style={{ backgroundColor: customTheme.accentColor }}
                  />
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Typography</h4>
              <p className="text-sm text-gray-600 mb-2">
                This is how your custom text appears with the selected theme.
              </p>
              <p
                className="font-semibold"
                style={{ color: customTheme.primaryColor }}
              >
                {customTheme.brandName || "Your Brand"} - Styled with primary
                color
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
