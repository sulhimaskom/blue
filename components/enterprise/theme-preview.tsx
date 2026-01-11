/**
 * Theme Preview Component - Real-Time Theme Visualization
 *
 * RESPONSIBILITIES:
 * - Display live preview of selected theme colors
 * - Show status indicators, buttons, and typography
 * - Render color swatches with hex validation
 *
 * PROPS INTERFACE:
 * - customTheme: Current custom theme configuration
 * - visible: Whether preview mode is active
 *
 * VISUAL DESIGN:
 * - Grid layout with 3 columns for preview cards
 * - Status indicators showing healthy/degraded/unhealthy states
 * - Button previews with primary and outline variants
 * - Color swatches displaying theme colors
 * - Typography section showing brand name styling
 *
 * INTEGRATION:
 * - Uses StatusIndicator for health status display
 * - Uses Button component for action previews
 * - Applies custom theme colors dynamically
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { validateHexColor } from "@/lib/utils/color-validation";

export interface ThemePreviewProps {
  customTheme: {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
  };
  visible: boolean;
}

export function ThemePreview({ customTheme, visible }: ThemePreviewProps) {
  if (!visible) return null;

  return (
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
                style={{
                  backgroundColor: validateHexColor(
                    customTheme.primaryColor,
                    "#3b82f6"
                  )
                }}
              />
              <div
                className="w-full h-6 rounded"
                style={{
                  backgroundColor: validateHexColor(
                    customTheme.secondaryColor,
                    "#8b5cf6"
                  )
                }}
              />
              <div
                className="w-full h-6 rounded"
                style={{
                  backgroundColor: validateHexColor(
                    customTheme.accentColor,
                    "#10b981"
                  )
                }}
              />
            </div>
          </div>
        </div>

        {/* Typography Preview */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Typography</h4>
          <p className="text-sm text-gray-600 mb-2">
            This is how your custom text appears with selected theme.
          </p>
          <p
            className="font-semibold"
            style={{
              color: validateHexColor(customTheme.primaryColor, "#3b82f6")
            }}
          >
            {customTheme.brandName || "Your Brand"} - Styled with primary color
          </p>
        </div>
      </div>
    </div>
  );
}
