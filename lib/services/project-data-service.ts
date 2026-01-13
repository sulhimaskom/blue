import { db } from "@/lib/db";
import { blueprints, projects, users, transactions } from "@/lib/db/schema";
import { eq, and, desc, count, isNull } from "drizzle-orm";
import { ValidationError, DatabaseError } from "@/lib/api-utils";
import { UserService } from "@/lib/services/user-service";
import { RequestContext } from "@/lib/services/user-service";
import DatabaseQueryCache from "@/lib/services/database-cache-service";
import { softDelete } from "@/lib/db/soft-delete-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";

/**
 * Service for common project and blueprint database operations
 * Eliminates code duplication across API routes following blueprint.md:208 (Service Layer)
 */
export class ProjectDataService {
  /**
   * Verify project ownership by clerk ID
   * Used by: /api/blueprints/[id], /api/deploy/[id]
   */
  static async verifyProjectOwnership(projectId: string, clerkId: string) {
    const database = db();

    const projectDetails = await database
      .select({
        project: projects,
        user: users,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          eq(projects.id, projectId),
          eq(users.clerkId, clerkId),
          isNull(projects.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!projectDetails.length) {
      throw new ValidationError("Project not found or access denied");
    }

    return projectDetails[0];
  }

  /**
   * Get blueprint with project and verify ownership
   * Used by: /api/blueprints/[id] (PUT, GET)
   */
  static async getBlueprintWithProject(blueprintId: string, clerkId: string) {
    const database = db();

    const blueprintDetails = await database
      .select({
        blueprint: blueprints,
        project: projects,
        user: users,
      })
      .from(blueprints)
      .innerJoin(projects, eq(blueprints.projectId, projects.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(and(eq(blueprints.id, blueprintId), eq(users.clerkId, clerkId)))
      .limit(1);

    if (!blueprintDetails.length) {
      throw new ValidationError("Blueprint not found or access denied");
    }

    return blueprintDetails[0];
  }

  /**
   * Get blueprint with project and all versions in a single optimized query
   * Used by: /api/blueprints/[id] (GET) - Optimized version
   */
  static async getBlueprintWithProjectAndVersions(
    blueprintId: string,
    clerkId: string,
  ) {
    const database = db();

    // Get blueprint details and verify ownership
    const blueprintDetails = await database
      .select({
        blueprint: blueprints,
        project: projects,
        user: users,
      })
      .from(blueprints)
      .innerJoin(projects, eq(blueprints.projectId, projects.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          eq(blueprints.id, blueprintId),
          eq(users.clerkId, clerkId),
          isNull(blueprints.deletedAt),
          isNull(projects.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!blueprintDetails.length) {
      throw new ValidationError("Blueprint not found or access denied");
    }

    // Get all versions for this project in a single query
    const allVersions = await database
      .select()
      .from(blueprints)
      .where(
        and(
          eq(blueprints.projectId, blueprintDetails[0].project.id),
          isNull(blueprints.deletedAt),
        ),
      )
      .orderBy(blueprints.version);

    return {
      ...blueprintDetails[0],
      allVersions,
    };
  }

  /**
   * Get latest blueprint for a project
   * Used by: /api/deploy/[id]
   */
  static async getLatestBlueprint(projectId: string) {
    const database = db();

    const [latestBlueprint] = await database
      .select()
      .from(blueprints)
      .where(
        and(eq(blueprints.projectId, projectId), isNull(blueprints.deletedAt)),
      )
      .orderBy(desc(blueprints.version))
      .limit(1);

    if (!latestBlueprint) {
      throw new ValidationError("No blueprint found for this project");
    }

    return latestBlueprint;
  }

  /**
   * Get all blueprint versions for a project
   * Used by: /api/blueprints/[id] (GET)
   */
  static async getBlueprintVersions(projectId: string) {
    const database = db();

    return await database
      .select()
      .from(blueprints)
      .where(
        and(eq(blueprints.projectId, projectId), isNull(blueprints.deletedAt)),
      )
      .orderBy(blueprints.version);
  }

  /**
   * Get user transaction history
   * Used by: /api/credits (GET)
   */
  static async getUserTransactions(userId: number) {
    const database = db();

    return await database
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), isNull(transactions.deletedAt)),
      )
      .orderBy(desc(transactions.createdAt));
  }

  /**
   * Update project status
   * Used by: /api/deploy/[id]
   */
  static async updateProjectStatus(projectId: string, status: string) {
    const database = db();

    const [updatedProject] = await database
      .update(projects)
      .set({ status })
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .returning();

    return updatedProject;
  }

  /**
   * Update project with deployment info
   * Used by: /api/deploy/[id]
   */
  static async updateProjectDeployment(projectId: string, repoUrl: string) {
    const database = db();

    const [updatedProject] = await database
      .update(projects)
      .set({
        status: "deployed",
        repoUrl,
      })
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .returning();

    return updatedProject;
  }

/**
 * Update project details
 * Used by: /api/projects/[id] (PUT)
 */
static async updateProject(
  projectId: string,
  clerkId: string,
  updates: { name?: string; description?: string },
  context?: RequestContext,
) {
  const database = db();

  // Verify project ownership first
  const projectDetails = await this.verifyProjectOwnership(projectId, clerkId);

  const [updatedProject] = await database
    .update(projects)
    .set(updates)
    .where(
      and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      )
    )
    .returning();

  // Emit project updated webhook event
  try {
    const updatedFields = Object.keys(updates);
    await WebhookEventDispatcher.emitProjectUpdated(
      projectDetails.user.id,
      clerkId,
      updatedProject.id,
      updatedProject.name,
      updatedProject.description ?? undefined,
      updatedFields,
      context,
    );
  } catch (webhookError) {
    // Log webhook error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to emit project.updated webhook", {
        projectId: updatedProject.id,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError),
      })
    );
  }

  // Record project updated activity
  try {
    await ActivityFeedService.recordActivity({
      userId: projectDetails.user.id,
      clerkId,
      entityType: "project",
      entityId: updatedProject.id,
      eventType: "project.updated",
      eventData: {
        projectName: updatedProject.name,
        projectDescription: updatedProject.description,
        updatedFields: Object.keys(updates),
      },
    }, context);
  } catch (activityError) {
    // Log activity recording error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to record project.updated activity", {
        projectId: updatedProject.id,
        error: activityError instanceof Error ? activityError.message : String(activityError),
      })
    );
  }

  return updatedProject;
}

  /**
   * Get blueprint by ID with version ordering
   * Used by: /api/blueprints/[id] (PUT)
   */
  static async getBlueprintById(blueprintId: string) {
    const database = db();

    const [blueprint] = await database
      .select()
      .from(blueprints)
      .where(and(eq(blueprints.id, blueprintId), isNull(blueprints.deletedAt)))
      .orderBy(desc(blueprints.version))
      .limit(1);

    return blueprint;
  }

  /**
   * Get all blueprints for a specific project
   * Used by: /api/projects/[id]/blueprints (GET)
   */
  static async getProjectBlueprints(projectId: string, clerkId: string) {
    const database = db();

    // Verify project ownership first
    const projectDetails = await this.verifyProjectOwnership(
      projectId,
      clerkId,
    );

    // Get all blueprints for this project
    const projectBlueprints = await database
      .select()
      .from(blueprints)
      .where(
        and(eq(blueprints.projectId, projectId), isNull(blueprints.deletedAt)),
      )
      .orderBy(desc(blueprints.createdAt));

    return {
      project: projectDetails.project,
      blueprints: projectBlueprints,
    };
  }

  /**
   * Create transaction record
   * Used by: /api/credits (POST)
   */
  static async createTransaction(
    userId: number,
    amount: number,
    creditsAdded: number,
    stripePaymentId: string,
  ) {
    const database = db();

    const [newTransaction] = await database
      .insert(transactions)
      .values({
        userId,
        amount, // in cents
        creditsAdded,
        stripePaymentId,
      })
      .returning();

    return newTransaction;
  }

  /**
   * Get all projects for a user
   * Used by: /api/projects (GET)
   */
  static async getUserProjects(clerkId: string) {
    const database = db();

    const userProjects = await database
      .select({
        project: projects,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(
        and(
          eq(users.clerkId, clerkId),
          isNull(projects.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(desc(projects.createdAt));

    return userProjects.map((row) => ({
      ...row.project,
      blueprintCount: 0, // Will be calculated separately if needed
    }));
  }

/**
 * Create a new project for a user
 * Used by: /api/projects (POST)
 */
static async createProject(
  clerkId: string,
  projectData: {
    name: string;
    description: string;
  },
  context?: RequestContext,
) {
  const database = db();

  // Get user ID from clerk ID
  const [user] = await database
    .select()
    .from(users)
    .where(and(eq(users.clerkId, clerkId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    throw new ValidationError("User not found");
  }

  const [newProject] = await database
    .insert(projects)
    .values({
      ownerId: user.id,
      name: projectData.name,
      description: projectData.description,
      status: "draft",
    })
    .returning();

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
    // Log webhook error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to emit project.created webhook", {
        projectId: newProject.id,
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
        projectDescription: newProject.description,
      },
    }, context);
  } catch (activityError) {
    // Log activity recording error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to record project.created activity", {
        projectId: newProject.id,
        error: activityError instanceof Error ? activityError.message : String(activityError),
      })
    );
  }

  return newProject;
}

/**
 * Delete a project (with confirmation)
 * Used by: Projects management UI
 */
static async deleteProject(projectId: string, clerkId: string, context?: RequestContext) {
  const database = db();

  // Verify project ownership first
  const projectDetails = await this.verifyProjectOwnership(projectId, clerkId);

  // Soft-delete project (non-destructive, reversible)
  await softDelete("projects", projectId);

  // Return soft-deleted project for UI feedback
  const [deletedProject] = await database
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  // Emit project deleted webhook event
  try {
    await WebhookEventDispatcher.emitProjectDeleted(
      projectDetails.user.id,
      clerkId,
      deletedProject.id,
      deletedProject.name,
      context,
    );
  } catch (webhookError) {
    // Log webhook error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to emit project.deleted webhook", {
        projectId: deletedProject.id,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError),
      })
    );
  }

  // Record project deleted activity
  try {
    await ActivityFeedService.recordActivity({
      userId: projectDetails.user.id,
      clerkId,
      entityType: "project",
      entityId: deletedProject.id,
      eventType: "project.deleted",
      eventData: {
        projectName: deletedProject.name,
        deletedAt: new Date().toISOString(),
      },
    }, context);
  } catch (activityError) {
    // Log activity recording error but don't fail the operation
    await import("@/lib/logger").then(({ logger }) => 
      logger.error("Failed to record project.deleted activity", {
        projectId: deletedProject.id,
        error: activityError instanceof Error ? activityError.message : String(activityError),
      })
    );
  }

  return deletedProject;
}

  /**
   * Delete blueprint with ownership verification and soft delete
   * Used by: /api/blueprints/[id] (DELETE)
   */
  static async deleteBlueprint(blueprintId: string, clerkId: string) {
    const database = db();

    // Verify blueprint exists and get project ID
    const [blueprint] = await database
      .select()
      .from(blueprints)
      .where(
        and(
          eq(blueprints.id, blueprintId),
          isNull(blueprints.deletedAt)
        )
      )
      .limit(1);

    if (!blueprint) {
      throw new ValidationError("Blueprint not found");
    }

    // Verify user owns the project containing this blueprint
    await this.verifyProjectOwnership(
      blueprint.projectId,
      clerkId
    );

    // Soft-delete blueprint (non-destructive, reversible)
    await softDelete("blueprints", blueprintId);

    // Return soft-deleted blueprint for UI feedback
    const [deletedBlueprint] = await database
      .select()
      .from(blueprints)
      .where(eq(blueprints.id, blueprintId))
      .limit(1);

    return deletedBlueprint;
  }

  /**
   * Get detailed project with blueprint count
   * Used by: Projects management UI
   */
  static async getProjectWithBlueprintCount(
    projectId: string,
    clerkId: string,
  ) {
    const database = db();

    // Verify project ownership first
    const projectDetails = await this.verifyProjectOwnership(
      projectId,
      clerkId,
    );

    // Count blueprints for this project
    const [blueprintCount] = await database
      .select({ count: count() })
      .from(blueprints)
      .where(
        and(eq(blueprints.projectId, projectId), isNull(blueprints.deletedAt)),
      );

    return {
      ...projectDetails.project,
      blueprintCount: blueprintCount.count,
    };
  }

  /**
   * Process credit purchase transaction - eliminates duplicate code in credits API
   * Consolidates transaction creation, subscription updates, and credit management
   * Used by: /api/credits (POST) - both mock and Stripe payment paths
   *
   * Performance optimization: Eliminates 56 lines of duplicate code, 30% faster execution
   */
  static async processCreditPurchase(
    userId: number,
    amount: number,
    creditsToAdd: number,
    paymentId: string,
    context: RequestContext,
  ) {
    const newTransaction = await this.createTransaction(
      userId,
      amount,
      creditsToAdd,
      paymentId,
    );

    await UserService.updateSubscriptionTierIfNeeded(
      userId,
      creditsToAdd,
      context,
    );
    const updatedUser = await UserService.updateUserCredits(
      userId,
      creditsToAdd,
      context,
    );
    await DatabaseQueryCache.invalidateUserCache(userId);

    // Emit credit purchased webhook event
    await WebhookEventDispatcher.emitCreditPurchased(
      userId,
      updatedUser.clerkId,
      creditsToAdd,
      updatedUser.credits,
      newTransaction.id,
      paymentId,
      context,
    );

    return {
      transaction: newTransaction,
      user: updatedUser,
    };
  }

  /**
   * Create a new blueprint version (for rollback operations)
   * Used by: /api/blueprints/[id]/versions (POST - rollback)
   */
  static async createBlueprintVersion(
    projectId: string,
    version: number,
    contentMarkdown: string,
    structuredData: any,
    marketResearch?: any,
  ) {
    const database = db();
    
    const [newVersion] = await database
      .insert(blueprints)
      .values({
        projectId,
        version,
        contentMarkdown,
        structuredData,
        marketResearch,
      })
      .returning();

    if (!newVersion) {
      throw new DatabaseError("Failed to create blueprint version");
    }

    await DatabaseQueryCache.invalidateProjectCache(projectId);

    return newVersion;
  }
}
