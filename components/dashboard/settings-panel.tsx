"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SettingsTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface SettingsPanelProps {
  tabs: SettingsTab[];
  defaultTab?: string;
  className?: string;
}

export function SettingsPanel({ tabs, defaultTab, className }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || (tabs.length > 0 ? tabs[0]?.id : undefined));

  if (!tabs || tabs.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div className="text-center py-8 text-gray-500">
          No settings available
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

SettingsPanel.displayName = "SettingsPanel";
