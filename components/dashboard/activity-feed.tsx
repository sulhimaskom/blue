import React from "react";
import { ActivityItem as ActivityItemType, ActivitySummary } from "@/lib/hooks/use-activity-data";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import { cn } from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";

interface ActivityFeedProps {
  activities: ActivityItemType[];
  summary?: ActivitySummary | null;
  loading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const ActivityFeed = React.memo(
  ({ activities, summary, loading, error, onLoadMore, hasMore }: ActivityFeedProps) => {
    const getEventIcon = (eventType: string) => {
      const iconMap: Record<string, string> = {
        project_created: "🎯",
        project_updated: "✏️",
        project_deleted: "🗑️",
        blueprint_created: "📝",
        blueprint_updated: "📄",
        blueprint_deleted: "📋",
        deployment_created: "🚀",
        deployment_updated: "🔄",
        deployment_deleted: "⏹️",
        team_created: "👥",
        team_updated: "👤",
        team_member_added: "➕",
        team_member_removed: "➖",
        user_signup: "🎉",
        user_login: "🔐",
      };

      return iconMap[eventType] || "📌";
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
        user_signup: "New user signed up",
        user_login: "User logged in",
      };

      return titles[eventType] || `${eventType.replace(/_/g, " ").toUpperCase()}`;
    };

    const getEntityTypeLabel = (entityType: string) => {
      const labels: Record<string, string> = {
        project: "Project",
        team: "Team",
        user: "User",
        blueprint: "Blueprint",
        deployment: "Deployment",
      };

      return labels[entityType] || entityType;
    };

    const getActivityTypeColor = (eventType: string) => {
      const colorMap: Record<string, string> = {
        project_created: "bg-green-100 text-green-800",
        project_updated: "bg-blue-100 text-blue-800",
        project_deleted: "bg-red-100 text-red-800",
        blueprint_created: "bg-purple-100 text-purple-800",
        blueprint_updated: "bg-indigo-100 text-indigo-800",
        blueprint_deleted: "bg-pink-100 text-pink-800",
        deployment_created: "bg-green-100 text-green-800",
        deployment_updated: "bg-blue-100 text-blue-800",
        deployment_deleted: "bg-red-100 text-red-800",
        team_created: "bg-green-100 text-green-800",
        team_updated: "bg-blue-100 text-blue-800",
        team_member_added: "bg-green-100 text-green-800",
        team_member_removed: "bg-orange-100 text-orange-800",
        user_signup: "bg-green-100 text-green-800",
        user_login: "bg-blue-100 text-blue-800",
      };

      return colorMap[eventType] || "bg-gray-100 text-gray-800";
    };

    if (loading && activities.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading activity feed...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-900 font-medium mb-2">Error Loading Activity</h3>
          <p className="text-red-700">{error}</p>
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-600">
            Your activity feed is empty. Start creating projects, blueprints, or deployments to see your activity here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {summary && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{summary.totalActivities}</div>
                <div className="text-sm text-blue-700">Total Activities</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">{summary.projectActivities}</div>
                <div className="text-sm text-green-700">Projects</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">{summary.teamActivities}</div>
                <div className="text-sm text-purple-700">Teams</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">{summary.userActivities}</div>
                <div className="text-sm text-blue-700">Users</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-indigo-900">{summary.blueprintActivities}</div>
                <div className="text-sm text-indigo-700">Blueprints</div>
              </div>
              <div className="bg-pink-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-pink-900">{summary.deploymentActivities}</div>
                <div className="text-sm text-pink-700">Deployments</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50 hover:scale-[1.01] transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-3xl">
                    {getEventIcon(activity.eventType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {getEventTitle(activity.eventType, activity.eventData)}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          getActivityTypeColor(activity.eventType)
                        )}
                      >
                        {getEntityTypeLabel(activity.entityType)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.eventType.replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatStandardDate(new Date(activity.timestamp))}</span>
                      <span>ID: {activity.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="outline"
              className="min-w-[200px]"
            >
              {loading ? "Loading..." : "Load More Activity"}
            </Button>
          </div>
        )}
      </div>
    );
  },
);

ActivityFeed.displayName = "ActivityFeed";
