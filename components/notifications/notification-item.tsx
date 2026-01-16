import React from "react";
import { Notification } from "@/lib/hooks/use-notifications-data";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import { NotificationType, NotificationMetadata } from "@/lib/services/notification-service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/constants/ui-themes";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (_id: string) => Promise<void>;
}

export const NotificationItem = React.memo(
  ({ notification, onMarkAsRead }: NotificationItemProps) => {
    const isUnread = notification.readAt === null;

    const getNotificationIcon = (type: NotificationType): string => {
      const iconMap: Record<NotificationType, string> = {
        blueprint_complete: "📝",
        team_invitation: "👥",
        deployment_status: "🚀",
        credit_warning: "⚠️",
        blueprint_shared: "📤",
        team_member_role_changed: "🔄",
        team_member_removed: "👋",
        team_updated: "✏️",
        project_created: "➕",
        project_updated: "🔧",
        project_deleted: "🗑️",
        team_deleted: "💥",
        credit_exhaustion_warning: "🚨",
      };
      return iconMap[type] || "🔔";
    };

    const getNotificationTypeColor = (type: NotificationType): string => {
      const colorMap: Record<NotificationType, string> = {
        blueprint_complete: "bg-purple-100 text-purple-800",
        team_invitation: "bg-blue-100 text-blue-800",
        deployment_status: "bg-green-100 text-green-800",
        credit_warning: "bg-red-100 text-red-800",
        blueprint_shared: "bg-indigo-100 text-indigo-800",
        team_member_role_changed: "bg-yellow-100 text-yellow-800",
        team_member_removed: "bg-orange-100 text-orange-800",
        team_updated: "bg-teal-100 text-teal-800",
        project_created: "bg-cyan-100 text-cyan-800",
        project_updated: "bg-lime-100 text-lime-800",
        project_deleted: "bg-gray-100 text-gray-800",
        team_deleted: "bg-red-100 text-red-800",
        credit_exhaustion_warning: "bg-red-100 text-red-800",
      };
      return colorMap[type] || "bg-gray-100 text-gray-800";
    };

    const getNotificationTypeLabel = (type: NotificationType): string => {
      const labelMap: Record<NotificationType, string> = {
        blueprint_complete: "Blueprint Complete",
        team_invitation: "Team Invitation",
        deployment_status: "Deployment Status",
        credit_warning: "Credit Warning",
        blueprint_shared: "Blueprint Shared",
        team_member_role_changed: "Team Member Role Changed",
        team_member_removed: "Team Member Removed",
        team_updated: "Team Updated",
        project_created: "Project Created",
        project_updated: "Project Updated",
        project_deleted: "Project Deleted",
        team_deleted: "Team Deleted",
        credit_exhaustion_warning: "Credit Exhaustion Warning",
      };
      return labelMap[type] || type;
    };

    const getMetadataPreview = (metadata: NotificationMetadata | null): string | null => {
      if (!metadata) return null;

      if (metadata.blueprintId && metadata.projectId) {
        return `Project: ${metadata.projectId.slice(0, 8)}...`;
      }
      if (metadata.deploymentId && metadata.status) {
        return `Status: ${metadata.status}`;
      }
      if (metadata.remainingCredits !== undefined) {
        return `${metadata.remainingCredits} credits remaining`;
      }
      if (metadata.inviterName) {
        return `Invited by ${metadata.inviterName}`;
      }
      if (metadata.sharerName) {
        return `Shared by ${metadata.sharerName}`;
      }

      return null;
    };

    const handleMarkAsRead = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      await onMarkAsRead(notification.id);
    };

    const content = (
      <div
        className={cn(
          "p-6 hover:bg-gray-50 transition-colors cursor-pointer border-l-4",
          isUnread ? "border-blue-500" : "border-transparent"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-3xl">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">
                    {notification.title}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      getNotificationTypeColor(notification.type)
                    )}
                  >
                    {getNotificationTypeLabel(notification.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                {getMetadataPreview(notification.metadata) && (
                  <p className="text-xs text-gray-500 mb-2">
                    {getMetadataPreview(notification.metadata)}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatStandardDate(notification.createdAt)}</span>
                  {notification.readAt && (
                    <span className="text-green-600">
                      Read {formatStandardDate(notification.readAt)}
                    </span>
                  )}
                </div>
              </div>
              {isUnread && (
                <Button
                  onClick={handleMarkAsRead}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                >
                  Mark as Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    if (notification.link) {
      return (
        <Link href={notification.link}>
          {content}
        </Link>
      );
    }

    return <div>{content}</div>;
  }
);

NotificationItem.displayName = "NotificationItem";
