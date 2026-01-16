import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";
import { eq, desc, and, inArray, gt, lt, type SQL } from "drizzle-orm";
import { UnifiedCacheManager } from "./cache-orchestrator";
import { logger } from "@/lib/logger";
import type { RequestContext } from "./user-service";

export interface ActivityEvent {
  userId: number;
  clerkId: string;
  entityType: "project" | "team" | "user" | "blueprint" | "deployment";
  entityId: string;
  eventType: string;
  eventData: Record<string, any>;
}

export interface ActivityFilterOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
}

export interface ActivityLogResponse {
  id: string;
  userId: number;
  clerkId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
}

export interface ActivitySummary {
  totalActivities: number;
  projectActivities: number;
  teamActivities: number;
  userActivities: number;
  blueprintActivities: number;
  deploymentActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByDay: Record<string, number>;
}

/**
 * ActivityFeedService - Centralized activity tracking and retrieval
 * 
 * Provides:
 * - Activity event recording with caching
 * - Project, team, and user activity feeds
 * - Activity summaries and analytics
 * - Permission-based access control
 */
export class ActivityFeedService {
  private static readonly CACHE_TTL = 300;
  private static readonly SUMMARY_CACHE_TTL = 600;

  /**
   * Record an activity event
   */
  static async recordActivity(event: ActivityEvent, context?: RequestContext): Promise<void> {
    try {
      const database = db();

      await database.insert(activityLogs).values({
        userId: event.userId,
        clerkId: event.clerkId,
        entityType: event.entityType,
        entityId: event.entityId,
        eventType: event.eventType,
        eventData: event.eventData,
        timestamp: new Date(),
      });

      logger.userAction("activity_recorded", String(event.userId), {
        requestId: context?.requestId || "unknown",
        entityType: event.entityType,
        entityId: event.entityId,
        eventType: event.eventType,
      });

      await this.invalidateActivityCaches(event.entityType, event.entityId, event.userId);

    } catch (error) {
      logger.error("Failed to record activity", {
        requestId: context?.requestId || "unknown",
        userId: event.userId,
        entityType: event.entityType,
        entityId: event.entityId,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get project activity feed
   */
  static async getProjectActivity(
    projectId: string,
    options: ActivityFilterOptions = {},
    context?: RequestContext,
  ): Promise<ActivityLogResponse[]> {
    try {
      const cacheKey = `project-activity:${projectId}:${JSON.stringify(options)}`;

      const cached = await UnifiedCacheManager.getData<ActivityLogResponse[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const database = db();
      const { limit = 50, offset = 0, startDate, endDate, eventTypes } = options;

      const whereConditions = [
        eq(activityLogs.entityType, "project"),
        eq(activityLogs.entityId, projectId),
      ];

      if (startDate) {
        whereConditions.push(gt(activityLogs.timestamp, startDate));
      }

      if (endDate) {
        whereConditions.push(lt(activityLogs.timestamp, endDate));
      }

      if (eventTypes && eventTypes.length > 0) {
        whereConditions.push(inArray(activityLogs.eventType, eventTypes));
      }

          const activities = await database
            .select({
              id: activityLogs.id,
              userId: activityLogs.userId,
              clerkId: activityLogs.clerkId,
              entityType: activityLogs.entityType,
              entityId: activityLogs.entityId,
              eventType: activityLogs.eventType,
              eventData: activityLogs.eventData,
              timestamp: activityLogs.timestamp,
            })
            .from(activityLogs)
            .where(and(...whereConditions))
            .orderBy(desc(activityLogs.timestamp))
            .limit(limit)
            .offset(offset);

      logger.apiRequest("GET", `/api/projects/${projectId}/activity`, context?.requestId || "unknown");

      const typedActivities = activities.map(a => ({
        ...a,
        eventData: a.eventData as Record<string, any>,
      })) as ActivityLogResponse[];

      await UnifiedCacheManager.setData(cacheKey, typedActivities, { ttl: this.CACHE_TTL });

      return typedActivities;
    } catch (error) {
      logger.error("Failed to get project activity", {
        requestId: context?.requestId || "unknown",
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get team activity feed
   */
  static async getTeamActivity(
    teamId: string,
    options: ActivityFilterOptions = {},
    context?: RequestContext,
  ): Promise<ActivityLogResponse[]> {
    try {
      const cacheKey = `team-activity:${teamId}:${JSON.stringify(options)}`;

      const cached = await UnifiedCacheManager.getData<ActivityLogResponse[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const database = db();
      const { limit = 50, offset = 0, startDate, endDate, eventTypes } = options;

      const whereConditions = [
        eq(activityLogs.entityType, "team"),
        eq(activityLogs.entityId, teamId),
      ];

      if (startDate) {
        whereConditions.push(gt(activityLogs.timestamp, startDate));
      }

      if (endDate) {
        whereConditions.push(lt(activityLogs.timestamp, endDate));
      }

      if (eventTypes && eventTypes.length > 0) {
        whereConditions.push(inArray(activityLogs.eventType, eventTypes));
      }

      const activities = await database
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          clerkId: activityLogs.clerkId,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          eventType: activityLogs.eventType,
          eventData: activityLogs.eventData,
          timestamp: activityLogs.timestamp,
        })
        .from(activityLogs)
        .where(and(...whereConditions))
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit)
        .offset(offset);

      logger.apiRequest("GET", `/api/teams/${teamId}/activity`, context?.requestId || "unknown");

      const typedActivities = activities.map(a => ({
        ...a,
        eventData: a.eventData as Record<string, any>,
      })) as ActivityLogResponse[];

      await UnifiedCacheManager.setData(cacheKey, typedActivities, { ttl: this.CACHE_TTL });

      return typedActivities;
    } catch (error) {
      logger.error("Failed to get team activity", {
        requestId: context?.requestId || "unknown",
        teamId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get user activity feed (personalized feed)
   */
  static async getUserActivity(
    userId: number,
    options: ActivityFilterOptions = {},
    context?: RequestContext,
  ): Promise<ActivityLogResponse[]> {
    try {
      const cacheKey = `user-activity:${userId}:${JSON.stringify(options)}`;

      const cached = await UnifiedCacheManager.getData<ActivityLogResponse[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const database = db();
      const { limit = 50, offset = 0, startDate, endDate, eventTypes } = options;

      const whereConditions = [eq(activityLogs.userId, userId)];

      if (startDate) {
        whereConditions.push(gt(activityLogs.timestamp, startDate));
      }

      if (endDate) {
        whereConditions.push(lt(activityLogs.timestamp, endDate));
      }

      if (eventTypes && eventTypes.length > 0) {
        whereConditions.push(inArray(activityLogs.eventType, eventTypes));
      }

      const activities = await database
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          clerkId: activityLogs.clerkId,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          eventType: activityLogs.eventType,
          eventData: activityLogs.eventData,
          timestamp: activityLogs.timestamp,
        })
        .from(activityLogs)
        .where(and(...whereConditions))
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit)
        .offset(offset);

      logger.apiRequest("GET", "/api/activity/feed", context?.requestId || "unknown", String(userId));

      const typedActivities = activities.map(a => ({
        ...a,
        eventData: a.eventData as Record<string, any>,
      })) as ActivityLogResponse[];

      await UnifiedCacheManager.setData(cacheKey, typedActivities, { ttl: this.CACHE_TTL });

      return typedActivities;
    } catch (error) {
      logger.error("Failed to get user activity", {
        requestId: context?.requestId || "unknown",
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get activity summary for analytics
   */
  static async getActivitySummary(
    entityType?: string,
    entityId?: string,
    context?: RequestContext,
  ): Promise<ActivitySummary> {
    try {
      const cacheKey = `activity-summary:${entityType || "all"}:${entityId || "all"}`;

      const cached = await UnifiedCacheManager.getData<ActivitySummary>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const database = db();

      let whereClause: SQL<unknown> | undefined = undefined;
      if (entityType && entityId) {
        whereClause = and(
          eq(activityLogs.entityType, entityType),
          eq(activityLogs.entityId, entityId),
        );
      } else if (entityType) {
        whereClause = eq(activityLogs.entityType, entityType);
      }

      const activities = await database
        .select()
        .from(activityLogs)
        .where(whereClause)
        .orderBy(desc(activityLogs.timestamp))
        .limit(1000);

      const summary: ActivitySummary = {
        totalActivities: activities.length,
        projectActivities: activities.filter(a => a.entityType === "project").length,
        teamActivities: activities.filter(a => a.entityType === "team").length,
        userActivities: activities.filter(a => a.entityType === "user").length,
        blueprintActivities: activities.filter(a => a.entityType === "blueprint").length,
        deploymentActivities: activities.filter(a => a.entityType === "deployment").length,
        activitiesByType: {} as Record<string, number>,
        activitiesByDay: {} as Record<string, number>,
      };

      activities.forEach(activity => {
        summary.activitiesByType[activity.eventType] = (summary.activitiesByType[activity.eventType] || 0) + 1;

        const dayKey = activity.timestamp.toISOString().split("T")[0];
        summary.activitiesByDay[dayKey] = (summary.activitiesByDay[dayKey] || 0) + 1;
      });

      await UnifiedCacheManager.setData(cacheKey, summary, { ttl: this.SUMMARY_CACHE_TTL });

      return summary;
    } catch (error) {
      logger.error("Failed to get activity summary", {
        requestId: context?.requestId || "unknown",
        entityType,
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalActivities: 0,
        projectActivities: 0,
        teamActivities: 0,
        userActivities: 0,
        blueprintActivities: 0,
        deploymentActivities: 0,
        activitiesByType: {},
        activitiesByDay: {},
      };
    }
  }

  /**
   * Record activity from webhook event
   * Automatically records events from WebhookEventDispatcher
   */
  static async recordFromWebhookEvent(
    eventType: string,
    eventData: Record<string, any>,
    context?: RequestContext,
  ): Promise<void> {
    try {
      let entityType: "project" | "team" | "user" | "blueprint" | "deployment" = "user";
      let entityId = String(eventData.userId || "0");

      if (eventType.startsWith("project.")) {
        entityType = "project";
        entityId = eventData.projectId || "";
      } else if (eventType.startsWith("team.")) {
        entityType = "team";
        entityId = eventData.teamId || "";
      } else if (eventType.startsWith("blueprint.")) {
        entityType = "blueprint";
        entityId = eventData.blueprintId || "";
      } else if (eventType.startsWith("deployment.")) {
        entityType = "deployment";
        entityId = eventData.deploymentId || "";
      }

      await this.recordActivity({
        userId: eventData.userId || 0,
        clerkId: eventData.clerkId || "",
        entityType,
        entityId,
        eventType,
        eventData,
      }, context);

    } catch (error) {
      logger.error("Failed to record activity from webhook event", {
        requestId: context?.requestId || "unknown",
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate activity caches
   */
  private static async invalidateActivityCaches(
    entityType: string,
    entityId: string,
    userId: number,
  ): Promise<void> {
    try {
      await UnifiedCacheManager.invalidateByEvent("activity-recorded", [
        `project-activity:${entityId}`,
        `team-activity:${entityId}`,
        `user-activity:${userId}`,
        `activity-summary:${entityType}:${entityId}`,
        `activity-summary:all:all`,
      ]);

      await UnifiedCacheManager.invalidateByTag("activity-feed");
      await UnifiedCacheManager.invalidateByTag("activity-summary");
    } catch (error) {
      logger.error("Failed to invalidate activity caches", {
        entityType,
        entityId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
