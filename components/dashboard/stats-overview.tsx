import React from "react";

interface BlueprintStats {
  totalProjects: number;
  totalBlueprints: number;
  completedBlueprints: number;
  draftBlueprints: number;
  lastActivity: string;
}

interface StatsOverviewProps {
  stats: BlueprintStats;
  credits: number;
}

export const StatsOverview = React.memo(
  ({ stats, credits }: StatsOverviewProps) => (
    <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
        <p className="text-xs sm:text-sm text-gray-600">Total Projects</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">
          {stats.totalProjects}
        </p>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
        <p className="text-xs sm:text-sm text-gray-600">Total Blueprints</p>
        <p className="text-xl sm:text-2xl font-bold text-blue-600">
          {stats.totalBlueprints}
        </p>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
        <p className="text-xs sm:text-sm text-gray-600">Available Credits</p>
        <p className="text-xl sm:text-2xl font-bold text-green-600">
          {credits}
        </p>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
        <p className="text-xs sm:text-sm text-gray-600">Last Activity</p>
        <p className="text-xs sm:text-sm font-medium text-gray-900">
          {new Date(stats.lastActivity).toLocaleDateString()}
        </p>
      </div>
    </div>
  ),
);

StatsOverview.displayName = "StatsOverview";
