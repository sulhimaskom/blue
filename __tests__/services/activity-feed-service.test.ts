/**
 * ActivityFeedService Test Suite
 *
 * Critical Business Logic Testing:
 * - Activity event recording with cache invalidation
 * - Project, team, and user activity feeds with filtering
 * - Activity summaries and analytics
 * - Webhook event activity recording
 * - Cache behavior (hit/miss scenarios)
 * - Error handling for database and cache failures
 */

import {
  ActivityFeedService,
  type ActivityEvent,
  type ActivityFilterOptions,
  type ActivityLogResponse,
  type ActivitySummary,
  type RequestContext,
} from "@/lib/services/activity-feed-service";

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  UnifiedCacheManager: {
    getData: jest.fn(),
    setData: jest.fn(),
    invalidateByEvent: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    apiRequest: jest.fn(),
    error: jest.fn(),
  },
}));

import { db } from "@/lib/db";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { logger } from "@/lib/logger";
import { activityLogs } from "@/lib/db/schema";
import { eq, desc, and, inArray, gt, lt } from "drizzle-orm";

const createMockActivity = (overrides?: Partial<ActivityLogResponse>): ActivityLogResponse => ({
  id: "1",
  userId: 1,
  clerkId: "clerk-123",
  entityType: "project",
  entityId: "project-123",
  eventType: "project.created",
  eventData: { name: "Test Project" },
  timestamp: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});

const createMockDb = () => ({
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockResolvedValue(undefined),
  }),
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  }),
});


describe("ActivityFeedService - Critical Business Logic", () => {
  let mockContext: RequestContext;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockContext = { requestId: "test-request-id" };
    mockDb = createMockDb();
    jest.clearAllMocks();
  });

  describe("recordActivity - Event Recording", () => {
    it("should successfully record activity event", async () => {
      // Arrange
      const event: ActivityEvent = {
        userId: 1,
        clerkId: "clerk-123",
        entityType: "project",
        entityId: "project-123",
        eventType: "project.created",
        eventData: { name: "Test Project" },
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordActivity(event, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          requestId: "test-request-id",
          entityType: "project",
          entityId: "project-123",
          eventType: "project.created",
        }),
      );
    });

    it("should invalidate relevant caches after recording activity", async () => {
      // Arrange
      const event: ActivityEvent = {
        userId: 1,
        clerkId: "clerk-123",
        entityType: "project",
        entityId: "project-123",
        eventType: "project.created",
        eventData: { name: "Test Project" },
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordActivity(event, mockContext);

      // Assert
      expect(UnifiedCacheManager.invalidateByEvent).toHaveBeenCalledWith(
        "activity-recorded",
        expect.arrayContaining([
          "project-activity:project-123",
          "user-activity:1",
          "activity-summary:project:project-123",
          "activity-summary:all:all",
        ]),
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const event: ActivityEvent = {
        userId: 1,
        clerkId: "clerk-123",
        entityType: "project",
        entityId: "project-123",
        eventType: "project.created",
        eventData: { name: "Test Project" },
      };

      const errorMockDb = createMockDb();
      errorMockDb.insert().values = jest.fn().mockRejectedValue(new Error("Database error"));
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act & Assert - Should not throw, should log error
      await expect(ActivityFeedService.recordActivity(event, mockContext)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to record activity",
        expect.objectContaining({
          error: "Database error",
        }),
      );
    });

    it("should handle cache invalidation errors gracefully", async () => {
      // Arrange
      const event: ActivityEvent = {
        userId: 1,
        clerkId: "clerk-123",
        entityType: "project",
        entityId: "project-123",
        eventType: "project.created",
        eventData: { name: "Test Project" },
      };

      (db as jest.Mock).mockReturnValue(mockDb);
      (UnifiedCacheManager.invalidateByEvent as jest.Mock).mockRejectedValue(new Error("Cache error"));

      // Act & Assert - Should not throw, should log error
      await expect(ActivityFeedService.recordActivity(event, mockContext)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to invalidate activity caches",
        expect.any(Object),
      );
    });

    it("should handle activity without context", async () => {
      // Arrange
      const event: ActivityEvent = {
        userId: 1,
        clerkId: "clerk-123",
        entityType: "project",
        entityId: "project-123",
        eventType: "project.created",
        eventData: { name: "Test Project" },
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordActivity(event);

      // Assert
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          requestId: "unknown",
        }),
      );
    });
  });

  describe("getProjectActivity - Project Activity Feed", () => {
    it("should return project activities from cache", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.getData).toHaveBeenCalledWith(`project-activity:${projectId}:${JSON.stringify(options)}`);
      expect(db).not.toHaveBeenCalled();
    });

    it("should fetch project activities from database when cache miss", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = { limit: 10, offset: 0 };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockActivities),
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        `project-activity:${projectId}:${JSON.stringify(options)}`,
        mockActivities,
        { ttl: 300 },
      );
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "GET",
        `/api/projects/${projectId}/activity`,
        "test-request-id",
      );
    });

    it("should apply date range filters correctly", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        and(
          eq(activityLogs.entityType, "project"),
          eq(activityLogs.entityId, projectId),
          gt(activityLogs.timestamp, options.startDate),
          lt(activityLogs.timestamp, options.endDate),
        ),
      );
    });

    it("should apply event type filters correctly", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = {
        eventTypes: ["project.created", "project.updated"],
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        and(
          eq(activityLogs.entityType, "project"),
          eq(activityLogs.entityId, projectId),
          inArray(activityLogs.eventType, options.eventTypes),
        ),
      );
    });

    it("should handle database errors and return empty array", async () => {
      // Arrange
      const projectId = "project-123";
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      const errorMockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
              }),
            }),
          }),
        }),
      };
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act
      const result = await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get project activity",
        expect.objectContaining({
          projectId,
          error: "Database error",
        }),
      );
    });

    it("should use default options when none provided", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.getProjectActivity(projectId);

      // Assert
      expect(mockDb.select().from().where().orderBy().limit).toHaveBeenCalledWith(50);
      expect(mockDb.select().from().where().orderBy().limit().offset).toHaveBeenCalledWith(0);
    });

    it("should return empty array when no activities found", async () => {
      // Arrange
      const projectId = "project-123";
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue(createMockDb());

      // Act
      const result = await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getTeamActivity - Team Activity Feed", () => {
    it("should return team activities from cache", async () => {
      // Arrange
      const teamId = "team-123";
      const mockActivities = [createMockActivity({ entityType: "team", entityId: "team-123" })];
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await ActivityFeedService.getTeamActivity(teamId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.getData).toHaveBeenCalledWith(`team-activity:${teamId}:${JSON.stringify(options)}`);
      expect(db).not.toHaveBeenCalled();
    });

    it("should fetch team activities from database when cache miss", async () => {
      // Arrange
      const teamId = "team-123";
      const mockActivities = [createMockActivity({ entityType: "team", entityId: "team-123" })];
      const options: ActivityFilterOptions = { limit: 10 };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockActivities),
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getTeamActivity(teamId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        `team-activity:${teamId}:${JSON.stringify(options)}`,
        mockActivities,
        { ttl: 300 },
      );
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "GET",
        `/api/teams/${teamId}/activity`,
        "test-request-id",
      );
    });

    it("should handle database errors and return empty array", async () => {
      // Arrange
      const teamId = "team-123";
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      const errorMockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
              }),
            }),
          }),
        }),
      };
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act
      const result = await ActivityFeedService.getTeamActivity(teamId, options, mockContext);

      // Assert
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get team activity",
        expect.objectContaining({
          teamId,
          error: "Database error",
        }),
      );
    });
  });

  describe("getUserActivity - User Activity Feed", () => {
    it("should return user activities from cache", async () => {
      // Arrange
      const userId = 1;
      const mockActivities = [createMockActivity({ userId: 1 })];
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(mockActivities);

      // Act
      const result = await ActivityFeedService.getUserActivity(userId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.getData).toHaveBeenCalledWith(`user-activity:${userId}:${JSON.stringify(options)}`);
      expect(db).not.toHaveBeenCalled();
    });

    it("should fetch user activities from database when cache miss", async () => {
      // Arrange
      const userId = 1;
      const mockActivities = [createMockActivity({ userId: 1 })];
      const options: ActivityFilterOptions = { limit: 10 };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockActivities),
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getUserActivity(userId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        `user-activity:${userId}:${JSON.stringify(options)}`,
        mockActivities,
        { ttl: 300 },
      );
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "GET",
        "/api/activity/feed",
        "test-request-id",
        "1",
      );
    });

    it("should handle database errors and return empty array", async () => {
      // Arrange
      const userId = 1;
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      const errorMockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
              }),
            }),
          }),
        }),
      };
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act
      const result = await ActivityFeedService.getUserActivity(userId, options, mockContext);

      // Assert
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get user activity",
        expect.objectContaining({
          userId,
          error: "Database error",
        }),
      );
    });
  });

  describe("getActivitySummary - Activity Analytics", () => {
    it("should return activity summary from cache", async () => {
      // Arrange
      const mockSummary: ActivitySummary = {
        totalActivities: 10,
        projectActivities: 5,
        teamActivities: 2,
        userActivities: 1,
        blueprintActivities: 1,
        deploymentActivities: 1,
        activitiesByType: { "project.created": 5 },
        activitiesByDay: { "2024-01-01": 10 },
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(mockSummary);

      // Act
      const result = await ActivityFeedService.getActivitySummary("project", "project-123", mockContext);

      // Assert
      expect(result).toEqual(mockSummary);
      expect(UnifiedCacheManager.getData).toHaveBeenCalledWith("activity-summary:project:project-123");
      expect(db).not.toHaveBeenCalled();
    });

    it("should calculate activity summary from database", async () => {
      // Arrange
      const mockActivities = [
        createMockActivity({ eventType: "project.created" }),
        createMockActivity({ eventType: "project.updated", timestamp: new Date("2024-01-02T10:00:00Z") }),
        createMockActivity({ entityType: "team", entityId: "team-123", eventType: "team.created" }),
      ];

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockActivities),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getActivitySummary("project", "project-123", mockContext);

      // Assert
      expect(result.totalActivities).toBe(3);
      expect(result.projectActivities).toBe(2);
      expect(result.teamActivities).toBe(1);
      expect(result.activitiesByType["project.created"]).toBe(1);
      expect(result.activitiesByType["project.updated"]).toBe(1);
      expect(result.activitiesByType["team.created"]).toBe(1);
      expect(result.activitiesByDay["2024-01-01"]).toBe(2);
      expect(result.activitiesByDay["2024-01-02"]).toBe(1);
    });

    it("should calculate summary for all activities when no filters provided", async () => {
      // Arrange
      const mockActivities = [
        createMockActivity({ entityType: "project" }),
        createMockActivity({ entityType: "team", entityId: "team-123", eventType: "team.created" }),
      ];

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockActivities),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getActivitySummary();

      // Assert
      expect(result.totalActivities).toBe(2);
      expect(result.projectActivities).toBe(1);
      expect(result.teamActivities).toBe(1);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "activity-summary:all:all",
        expect.any(Object),
        { ttl: 600 },
      );
    });

    it("should calculate summary for entity type only", async () => {
      // Arrange
      const mockActivities = [
        createMockActivity({ entityType: "project" }),
        createMockActivity({ entityType: "project", entityId: "project-456", eventType: "project.updated" }),
      ];

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockActivities),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getActivitySummary("project");

      // Assert
      expect(result.totalActivities).toBe(2);
      expect(result.projectActivities).toBe(2);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        "activity-summary:project:all",
        expect.any(Object),
        { ttl: 600 },
      );
    });

    it("should handle database errors and return empty summary", async () => {
      // Arrange
      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      const errorMockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(new Error("Database error")),
              }),
            }),
          }),
        }),
      };
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act
      const result = await ActivityFeedService.getActivitySummary("project", "project-123", mockContext);

      // Assert
      expect(result).toEqual({
        totalActivities: 0,
        projectActivities: 0,
        teamActivities: 0,
        userActivities: 0,
        blueprintActivities: 0,
        deploymentActivities: 0,
        activitiesByType: {},
        activitiesByDay: {},
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get activity summary",
        expect.objectContaining({
          entityType: "project",
          entityId: "project-123",
          error: "Database error",
        }),
      );
    });
  });

  describe("recordFromWebhookEvent - Webhook Activity Recording", () => {
    it("should record project activity from webhook event", async () => {
      // Arrange
      const eventType = "project.created";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        projectId: "project-123",
        name: "Test Project",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "project",
          entityId: "project-123",
          eventType: "project.created",
        }),
      );
    });

    it("should record team activity from webhook event", async () => {
      // Arrange
      const eventType = "team.created";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        teamId: "team-123",
        name: "Test Team",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "team",
          entityId: "team-123",
          eventType: "team.created",
        }),
      );
    });

    it("should record blueprint activity from webhook event", async () => {
      // Arrange
      const eventType = "blueprint.created";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        blueprintId: "blueprint-123",
        name: "Test Blueprint",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "blueprint",
          entityId: "blueprint-123",
          eventType: "blueprint.created",
        }),
      );
    });

    it("should record deployment activity from webhook event", async () => {
      // Arrange
      const eventType = "deployment.succeeded";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        deploymentId: "deployment-123",
        status: "success",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "deployment",
          entityId: "deployment-123",
          eventType: "deployment.succeeded",
        }),
      );
    });

    it("should record user activity as default for non-prefixed events", async () => {
      // Arrange
      const eventType = "user.login";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        email: "test@example.com",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "user",
          entityId: "1",
          eventType: "user.login",
        }),
      );
    });

    it("should handle missing userId gracefully", async () => {
      // Arrange
      const eventType = "project.created";
      const eventData = {
        clerkId: "clerk-123",
        projectId: "project-123",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "0",
        expect.objectContaining({
          entityType: "project",
          entityId: "project-123",
        }),
      );
    });

    it("should handle missing clerkId gracefully", async () => {
      // Arrange
      const eventType = "project.created";
      const eventData = {
        userId: 1,
        projectId: "project-123",
      };

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(activityLogs);
      expect(logger.userAction).toHaveBeenCalledWith(
        "activity_recorded",
        "1",
        expect.objectContaining({
          entityType: "project",
          entityId: "project-123",
          eventType: "project.created",
          requestId: "test-request-id",
        }),
      );
    });

    it("should handle recording errors gracefully", async () => {
      // Arrange
      const eventType = "project.created";
      const eventData = {
        userId: 1,
        clerkId: "clerk-123",
        projectId: "project-123",
      };

      const errorMockDb = createMockDb();
      errorMockDb.insert().values = jest.fn().mockRejectedValue(new Error("Database error"));
      (db as jest.Mock).mockReturnValue(errorMockDb);

      // Act & Assert - Should not throw, should log error
      await expect(ActivityFeedService.recordFromWebhookEvent(eventType, eventData, mockContext)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to record activity",
        expect.objectContaining({
          eventType,
          error: "Database error",
        }),
      );
    });
  });

  describe("Integration Scenarios - Complex Use Cases", () => {
    it("should handle activity recording with multiple concurrent calls", async () => {
      // Arrange
      const events: ActivityEvent[] = [
        {
          userId: 1,
          clerkId: "clerk-123",
          entityType: "project",
          entityId: "project-123",
          eventType: "project.created",
          eventData: {},
        },
        {
          userId: 1,
          clerkId: "clerk-123",
          entityType: "project",
          entityId: "project-123",
          eventType: "project.updated",
          eventData: {},
        },
      ];

      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await Promise.all(events.map(event => ActivityFeedService.recordActivity(event, mockContext)));

      // Assert
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(UnifiedCacheManager.invalidateByEvent).toHaveBeenCalledTimes(2);
    });

    it("should maintain data consistency across cache and database", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = {};

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockActivities),
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(result).toEqual(mockActivities);
      expect(UnifiedCacheManager.setData).toHaveBeenCalledWith(
        expect.any(String),
        mockActivities,
        { ttl: 300 },
      );
    });

    it("should handle complex filter combinations correctly", async () => {
      // Arrange
      const projectId = "project-123";
      const mockActivities = [createMockActivity()];
      const options: ActivityFilterOptions = {
        limit: 25,
        offset: 10,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
        eventTypes: ["project.created", "project.updated"],
      };

      (UnifiedCacheManager.getData as jest.Mock).mockResolvedValue(null);
      (db as jest.Mock).mockReturnValue(mockDb);

      // Act
      await ActivityFeedService.getProjectActivity(projectId, options, mockContext);

      // Assert
      expect(mockDb.select().from().where().orderBy().limit).toHaveBeenCalledWith(25);
      expect(mockDb.select().from().where().orderBy().limit().offset).toHaveBeenCalledWith(10);
    });
  });
});
