"use client";

import React from "react";
import { cn } from "@/lib/constants/ui-themes";
import {
  BarChart3Icon,
  ZapIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

type TabType = "overview" | "ai" | "predictive";

interface DashboardTabsProps {
  activeTab: TabType;
  onTabChange: (_tab: TabType) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Performance analytics tabs"
      className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg"
    >
      <button
        role="tab"
        aria-selected={activeTab === "overview"}
        aria-controls="overview-panel"
        id="overview-tab"
        onClick={() => onTabChange("overview")}
        className={cn(
          "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          activeTab === "overview"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <BarChart3Icon className="w-4 h-4 inline mr-2" aria-hidden="true" />
        Overview
      </button>
      <button
        role="tab"
        aria-selected={activeTab === "ai"}
        aria-controls="ai-panel"
        id="ai-tab"
        onClick={() => onTabChange("ai")}
        className={cn(
          "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          activeTab === "ai"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <ZapIcon className="w-4 h-4 inline mr-2" aria-hidden="true" />
        AI Optimization
      </button>
      <button
        role="tab"
        aria-selected={activeTab === "predictive"}
        aria-controls="predictive-panel"
        id="predictive-tab"
        onClick={() => onTabChange("predictive")}
        className={cn(
          "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          activeTab === "predictive"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <TrendingUpIcon className="w-4 h-4 inline mr-2" aria-hidden="true" />
        Predictive
      </button>
    </div>
  );
};
