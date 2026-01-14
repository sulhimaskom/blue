import { db } from "@/lib/db";
import { projects, blueprints, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ValidationError, DatabaseError } from "@/lib/api-utils";
import { RequestContext } from "@/lib/services/user-service";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { PROJECT_TEMPLATES } from "@/lib/constants/project-templates";

export interface CloneProjectOptions {
  name: string;
  description?: string;
}

export interface ProjectCloneResult {
  clonedProject: any;
  clonedBlueprints: any[];
  originalProjectId: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  complexity: "beginner" | "intermediate" | "advanced";
  estimatedCredits: number;
  blueprints: Array<{
    version: number;
    contentMarkdown: string;
    structuredData: any;
    marketResearch?: any;
  }>;
}

/**
 * Service for project cloning and template functionality
 * Follows Service Layer principles (blueprint.md:208)
 */
export class ProjectCloneService {
  /**
   * Clone an existing project with its blueprints
   * Used by: /api/projects/[id]/clone (POST)
   */
  static async cloneProject(
    projectId: string,
    clerkId: string,
    options: CloneProjectOptions,
    context?: RequestContext,
  ): Promise<ProjectCloneResult> {
    const database = db();

    const { name, description } = options;

    // Verify project ownership and get details
    const projectDetails = await ProjectDataService.verifyProjectOwnership(
      projectId,
      clerkId,
    );

    const originalProject = projectDetails.project;

    // Get all blueprints for the original project
    const originalBlueprints = await database
      .select()
      .from(blueprints)
      .where(
        and(
          eq(blueprints.projectId, projectId),
          isNull(blueprints.deletedAt),
        ),
      )
      .orderBy(blueprints.version);

    if (!originalBlueprints.length) {
      throw new ValidationError("Cannot clone project with no blueprints");
    }

    // Create the cloned project
    const [clonedProject] = await database
      .insert(projects)
      .values({
        ownerId: originalProject.ownerId,
        name: name || `${originalProject.name} (Clone)`,
        description: description || originalProject.description || "",
        status: "draft",
      })
      .returning();

    if (!clonedProject) {
      throw new DatabaseError("Failed to create cloned project");
    }

    // Clone all blueprints to the new project
    const clonedBlueprints: any[] = [];
    for (const originalBlueprint of originalBlueprints) {
      const [clonedBlueprint] = await database
        .insert(blueprints)
        .values({
          projectId: clonedProject.id,
          version: originalBlueprint.version,
          contentMarkdown: originalBlueprint.contentMarkdown,
          structuredData: originalBlueprint.structuredData,
          marketResearch: originalBlueprint.marketResearch,
        })
        .returning();

      if (clonedBlueprint) {
        clonedBlueprints.push(clonedBlueprint);
      }
    }

    // Emit project cloned webhook event
    try {
      await WebhookEventDispatcher.emitProjectCreated(
        projectDetails.user.id,
        clerkId,
        clonedProject.id,
        clonedProject.name,
        clonedProject.description ?? undefined,
        context,
      );
    } catch (webhookError) {
      await import("@/lib/logger").then(({ logger }) =>
        logger.error("Failed to emit project.cloned webhook", {
          projectId: clonedProject.id,
          originalProjectId: projectId,
          error: webhookError instanceof Error ? webhookError.message : String(webhookError),
        })
      );
    }

    // Record project cloned activity
    try {
      await ActivityFeedService.recordActivity({
        userId: projectDetails.user.id,
        clerkId,
        entityType: "project",
        entityId: clonedProject.id,
        eventType: "project.cloned",
        eventData: {
          projectName: clonedProject.name,
          originalProjectId: projectId,
          originalProjectName: originalProject.name,
          blueprintsCount: clonedBlueprints.length,
        },
      }, context);
    } catch (activityError) {
      await import("@/lib/logger").then(({ logger }) =>
        logger.error("Failed to record project.cloned activity", {
          projectId: clonedProject.id,
          originalProjectId: projectId,
          error: activityError instanceof Error ? activityError.message : String(activityError),
        })
      );
    }

    // Invalidate projects cache
    await UnifiedCacheManager.invalidateByTag("projects");

    return {
      clonedProject,
      clonedBlueprints,
      originalProjectId: projectId,
    };
  }

  /**
   * Get available project templates
   * Used by: /api/projects/templates (GET)
   */
  static async getProjectTemplates(): Promise<ProjectTemplate[]> {
    const templates = PROJECT_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      complexity: template.complexity,
      estimatedCredits: template.estimatedCredits,
      blueprints: template.blueprints,
    }));

    return templates;
  }

  /**
   * Create project from template
   * Used by: /api/projects/templates (POST)
   */
  static async createFromTemplate(
    templateId: string,
    clerkId: string,
    projectData: {
      name: string;
      description?: string;
    },
    context?: RequestContext,
  ): Promise<ProjectCloneResult> {
    const database = db();

    // Find template
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      throw new ValidationError("Template not found");
    }

    // Get user ID from clerk ID
    const [user] = await database
      .select()
      .from(users)
      .where(and(eq(users.clerkId, clerkId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new ValidationError("User not found");
    }

    // Create project from template
    const [newProject] = await database
      .insert(projects)
      .values({
        ownerId: user.id,
        name: projectData.name,
        description: projectData.description || template.description,
        status: "draft",
      })
      .returning();

    if (!newProject) {
      throw new DatabaseError("Failed to create project from template");
    }

    // Create template blueprints
    const createdBlueprints: any[] = [];
    for (const blueprint of template.blueprints) {
      const [createdBlueprint] = await database
        .insert(blueprints)
        .values({
          projectId: newProject.id,
          version: blueprint.version,
          contentMarkdown: blueprint.contentMarkdown,
          structuredData: blueprint.structuredData,
          marketResearch: blueprint.marketResearch,
        })
        .returning();

      if (createdBlueprint) {
        createdBlueprints.push(createdBlueprint);
      }
    }

    // Emit project created webhook event
    try {
      await WebhookEventDispatcher.emitProjectCreated(
        user.id,
        clerkId,
        newProject.id,
        newProject.name,
        newProject.description ?? undefined,
        context,
      );
    } catch (webhookError) {
      await import("@/lib/logger").then(({ logger }) =>
        logger.error("Failed to emit project.created webhook from template", {
          projectId: newProject.id,
          templateId,
          error: webhookError instanceof Error ? webhookError.message : String(webhookError),
        })
      );
    }

    // Record project created activity
    try {
      await ActivityFeedService.recordActivity({
        userId: user.id,
        clerkId,
        entityType: "project",
        entityId: newProject.id,
        eventType: "project.created",
        eventData: {
          projectName: newProject.name,
          templateId,
          templateName: template.name,
          blueprintsCount: createdBlueprints.length,
        },
      }, context);
    } catch (activityError) {
      await import("@/lib/logger").then(({ logger }) =>
        logger.error("Failed to record project.created activity from template", {
          projectId: newProject.id,
          templateId,
          error: activityError instanceof Error ? activityError.message : String(activityError),
        })
      );
    }

    // Invalidate projects cache
    await UnifiedCacheManager.invalidateByTag("projects");

    return {
      clonedProject: newProject,
      clonedBlueprints: createdBlueprints,
      originalProjectId: `template:${templateId}`,
    };
  }
}
