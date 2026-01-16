import React from "react";
import { NotificationType, NOTIFICATION_TYPES } from "@/lib/services/notification-service";

export interface NotificationFilterOptions {
  unreadOnly: boolean;
  type?: NotificationType;
}

interface NotificationFiltersProps {
  filters: NotificationFilterOptions;
  onFiltersChange: (_filters: NotificationFilterOptions) => void;
  unreadCount?: number;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; icon: string }> = {
  blueprint_complete: { label: "Blueprint Complete", icon: "📝" },
  team_invitation: { label: "Team Invitation", icon: "👥" },
  deployment_status: { label: "Deployment Status", icon: "🚀" },
  credit_warning: { label: "Credit Warning", icon: "⚠️" },
  blueprint_shared: { label: "Blueprint Shared", icon: "📤" },
  team_member_role_changed: { label: "Team Member Role Changed", icon: "🔄" },
  team_member_removed: { label: "Team Member Removed", icon: "👋" },
  team_updated: { label: "Team Updated", icon: "✏️" },
  project_created: { label: "Project Created", icon: "➕" },
  project_updated: { label: "Project Updated", icon: "🔧" },
  project_deleted: { label: "Project Deleted", icon: "🗑️" },
  team_deleted: { label: "Team Deleted", icon: "💥" },
  credit_exhaustion_warning: { label: "Credit Exhaustion Warning", icon: "🚨" },
};

const NOTIFICATION_TYPES_LIST = NOTIFICATION_TYPES.map((type) => ({
  value: type,
  label: NOTIFICATION_TYPE_LABELS[type].label,
  icon: NOTIFICATION_TYPE_LABELS[type].icon,
}));

export const NotificationFilters = React.memo(
  ({ filters, onFiltersChange, unreadCount = 0 }: NotificationFiltersProps) => {
    const handleUnreadOnlyToggle = () => {
      onFiltersChange({ ...filters, unreadOnly: !filters.unreadOnly });
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value || undefined;
      onFiltersChange({ ...filters, type: type as NotificationType | undefined });
    };

    const handleClearFilters = () => {
      onFiltersChange({ unreadOnly: false });
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        </div>

        <div className="space-y-6">
          {unreadCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔔</span>
                <div>
                  <div className="text-sm font-medium text-blue-900">
                    {unreadCount} Unread Notification{unreadCount !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-blue-700">
                    You have unread notifications
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.unreadOnly}
                onChange={handleUnreadOnlyToggle}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">
                Show unread only
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Type
            </label>
            <select
              value={filters.type || ""}
              onChange={handleTypeChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {NOTIFICATION_TYPES_LIST.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }
);

NotificationFilters.displayName = "NotificationFilters";
