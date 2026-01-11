/**
 * Color Customizer Component - Brand Details and Color Configuration
 *
 * RESPONSIBILITIES:
 * - Handle brand name and logo URL input
 * - Manage primary, secondary, and accent color selection
 * - Provide both color picker and hex text input methods
 * - Handle color input changes and validation
 *
 * PROPS INTERFACE:
 * - customTheme: Current theme configuration object
 * - onThemeChange: Callback for theme field updates
 * - brandName: Current brand name value
 * - logoUrl: Current logo URL value
 *
 * VISUAL DESIGN:
 * - Two-column grid layout (brand details on left, colors on right)
 * - Color inputs with visual color picker and text input side-by-side
 * - Responsive layout adapting to different screen sizes
 * - Clean form styling with focus states
 *
 * INTEGRATION:
 * - Standard HTML5 input types (text, url, color)
 * - Tailwind CSS for styling and responsive design
 * - Focus management with ring indicators
 */

import React from "react";

export interface ColorCustomizerProps {
  customTheme: {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
  };
  onThemeChange: (
    _field:
      | "brandName"
      | "primaryColor"
      | "secondaryColor"
      | "accentColor"
      | "logoUrl",
    _value: string,
  ) => void;
}

export function ColorCustomizer({
  customTheme,
  onThemeChange,
}: ColorCustomizerProps) {
  return (
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
              onChange={(e) => onThemeChange("brandName", e.target.value)}
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
              onChange={(e) => onThemeChange("logoUrl", e.target.value)}
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
                onChange={(e) => onThemeChange("primaryColor", e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customTheme.primaryColor}
                onChange={(e) => onThemeChange("primaryColor", e.target.value)}
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
                onChange={(e) => onThemeChange("secondaryColor", e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customTheme.secondaryColor}
                onChange={(e) => onThemeChange("secondaryColor", e.target.value)}
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
                onChange={(e) => onThemeChange("accentColor", e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customTheme.accentColor}
                onChange={(e) => onThemeChange("accentColor", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#10b981"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
