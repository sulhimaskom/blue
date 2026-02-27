import React, { useState } from "react";
import { ActivityItem as ActivityItemType } from "@/lib/hooks/use-activity-data";
import { ACTIVITY_ICONS, MAJOR_ACTIVITY_TYPES } from "@/lib/constants/activity-types";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "@/components/ui/icons";

interface MiniActivityFeedProps {
  activities: ActivityItemType[];
  limit?: number;
  onViewAll?: () => void;
}

export const MiniActivityFeed = React.memo(
  ({ activities, limit = 10, onViewAll }: MiniActivityFeedProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const recentActivities = activities
      .filter((activity) => (MAJOR_ACTIVITY_TYPES as readonly string[]).includes(activity.eventType))
      .slice(0, limit);

    const getEventIcon = (eventType: string) => {
      return ACTIVITY_ICONS[eventType] || "📌";
    };

    const getEventTitle = (eventType: string, eventData: Record<string, any>) => {
      const titles: Record<string, string> = {
        project_created: `Project "${eventData.name}" created`,
        project_updated: `Project "${eventData.name}" updated`,
        project_deleted: `Project "${eventData.name}" deleted`,
        blueprint_created: `Blueprint "${eventData.name}" generated`,
        blueprint_updated: `Blueprint "${eventData.name}" updated`,
        blueprint_deleted: `Blueprint "${eventData.name}" deleted`,
        deployment_created: `Deployment "${eventData.name}" created`,
        deployment_updated: `Deployment "${eventData.name}" updated`,
        deployment_deleted: `Deployment "${eventData.name}" deleted`,
        team_created: `Team "${eventData.name}" created`,
        team_updated: `Team "${eventData.name}" updated`,
        team_member_added: `Member added to ${eventData.teamName || "team"}`,
        team_member_removed: `Member removed from ${eventData.teamName || "team"}`,
      };

      return titles[eventType] || `${eventType.replace(/_/g, " ").toUpperCase()}`;
    };

    if (recentActivities.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-600">No recent activity</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <div className="flex items-center gap-2">
            {activities.length > limit && (
              <span className="text-xs text-gray-500">
                Showing {recentActivities.length} of {activities.length}
              </span>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-all duration-200 hover:scale-[1.01]">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {getEventIcon(activity.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getEventTitle(activity.eventType, activity.eventData)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatStandardDate(new Date(activity.timestamp))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200">
          <Button
            onClick={onViewAll}
            variant="outline"
            className="w-full"
          >
            View All Activity
          </Button>
        </div>
      </div>
    );
  }
);

MiniActivityFeed.displayName = "MiniActivityFeed";
