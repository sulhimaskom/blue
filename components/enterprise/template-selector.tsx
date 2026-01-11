/**
 * Template Selector Component - Industry-Specific Theme Templates
 *
 * RESPONSIBILITIES:
 * - Display available industry templates with visual previews
 * - Handle template selection and application
 * - Show active template state with visual indicators
 *
 * PROPS INTERFACE:
 * - selectedTemplate: Currently selected template ID
 * - onSelectTemplate: Callback when template is selected
 *
 * VISUAL DESIGN:
 * - Grid layout with 4 columns on large screens
 * - Visual color swatches showing primary color
 * - Template name and industry type labels
 * - Active template highlighting with border color
 *
 * INTEGRATION:
 * - Uses ENTERPRISE_THEME_TEMPLATES from constants
 * - Integrates with theme system for dynamic styling
 * - Responsive layout adapting to screen sizes
 */

import React from "react";
import { ENTERPRISE_THEME_TEMPLATES } from "@/lib/constants/enterprise-themes";
import {
  cn,
  getBackgroundColor,
  getTextColor,
  getAccentColor,
} from "@/lib/constants/ui-themes";

export interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (_templateId: string) => void;
}

export function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
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
            onClick={() => onSelectTemplate(key)}
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
  );
}
