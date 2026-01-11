/**
 * Theme Exporter Component - Export and Reset Functionality
 *
 * RESPONSIBILITIES:
 * - Export current theme configuration as JSON file
 * - Reset theme to default values
 * - Display action buttons for theme operations
 * - Handle export file generation and download
 *
 * PROPS INTERFACE:
 * - activeTheme: Currently active theme object (for export)
 * - onExport: Callback to export theme
 * - onReset: Callback to reset theme to defaults
 *
 * VISUAL DESIGN:
 * - Flexible button layout wrapping on small screens
 * - Disabled state for export when no active theme
 * - Primary button for main actions, outline for secondary
 *
 * INTEGRATION:
 * - Uses Button component from UI library
 * - Generates JSON blob for theme export
 * - Creates automatic download for export file
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { EnterpriseThemeConfig } from "@/lib/constants/enterprise-themes";

export interface ThemeExporterProps {
  activeTheme: EnterpriseThemeConfig | null;
  onExport: () => void;
  onReset: () => void;
}

export function ThemeExporter({
  activeTheme,
  onExport,
  onReset,
}: ThemeExporterProps) {
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      {activeTheme && (
        <Button variant="outline" onClick={onExport}>
          Export Theme
        </Button>
      )}

      <Button variant="outline" onClick={onReset}>
        Reset to Default
      </Button>
    </div>
  );
}
