import { db } from "@/lib/db";
import { deployments as deploymentsTable, projects, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { NotificationService, NotificationType } from "@/lib/services/notification-service";
import { logger } from "@/lib/logger";
import { DatabaseError, ValidationError } from "@/lib/api-utils";
import { githubService } from "@/lib/services/github-service";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";

export interface DeploymentRecord {
  id: string;
  projectId: string;
  environment: "production" | "staging" | "preview";
  githubOrg: string;
  githubRepoName: string;
  githubRepoId?: number;
  githubRepoUrl?: string;
  blueprintVersion: number;
  status: "pending" | "deployed" | "failed" | "deleted";
  deploymentLogs?: any;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface DeployEnvironmentResult {
  projectId: string;
  deploymentId: string;
  environment: string;
  repoUrl: string;
  repoName: string;
  status: string;
  message: string;
  deploymentDetails: {
    repositoryId: number;
    fullName: string;
    cloneUrl: string;
    organization: string;
    repository: string;
    visibility: string;
    createdAt: string;
    blueprintVersion: number;
    expiresAt?: Date;
  };
}

export interface RequestContext {
  requestId: string;
}


/**
 * Deployment Service for environment management
 * Handles all deployment-related business logic
 */

export class DeploymentService {
  /**
   * Check if deployment already exists for environment
   */
  static async checkExistingDeployment(projectId: string, environment: string): Promise<DeploymentRecord | null> {
    const database = db();
    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(
        and(
          eq(deploymentsTable.projectId, projectId),
          eq(deploymentsTable.environment, environment),
          isNull(deploymentsTable.deletedAt)
        )
      )
      .limit(1);
    return deployments[0] as DeploymentRecord || null;
  }

  /**
   * Generate environment-specific repository name
   */
  static generateEnvironmentRepoName(baseName: string, environment: string): string {
    if (environment === "production") return baseName;
    if (environment === "staging") return `${baseName}-staging`;
    if (environment === "preview") return `${baseName}-preview-${Date.now().toString(36)}`;
    return baseName;
  }

  /**
   * Create deployment record
   * @param record - Deployment record details
   * @returns Created deployment ID
   * @throws DatabaseError if database operation fails
   */
  static async createDeploymentRecord(record: {
    projectId: string;
    environment: string;
    githubOrg: string;
    githubRepoName: string;
    blueprintVersion: number;
    expiresAt?: Date;
  }): Promise<string> {
    const database = db();
    const result = await database
      .insert(deploymentsTable)
      .values({
        projectId: record.projectId,
        environment: record.environment,
        githubOrg: record.githubOrg,
        githubRepoName: record.githubRepoName,
        blueprintVersion: record.blueprintVersion,
        status: "pending",
        expiresAt: record.expiresAt,
      })
      .returning({ id: deploymentsTable.id });

    if (!result || result.length === 0) {
      throw new DatabaseError("Failed to create deployment record");
    }

    return result[0].id;
  }

  /**
   * Update deployment record with GitHub details
   */
  static async updateDeploymentRecord(
    deploymentId: string, 
updates: Partial<Pick<DeploymentRecord, 'githubRepoId' | 'githubRepoUrl' | 'status' | 'deploymentLogs'>>
  ): Promise<void> {
    const database = db();
    await database
      .update(deploymentsTable)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deploymentId));
  }

  /**
   * Get all deployments for a project
   */
  static async getProjectDeployments(projectId: string): Promise<DeploymentRecord[]> {
    const database = db();
    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(
        and(
          eq(deploymentsTable.projectId, projectId),
          isNull(deploymentsTable.deletedAt)
        )
      )
      .orderBy(deploymentsTable.createdAt);
    return deployments as DeploymentRecord[];
  }

  /**
   * Soft delete deployment (for cleanup)
   */
  static async deleteDeployment(deploymentId: string): Promise<void> {
    const database = db();

    const [deployment] = await database
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, deploymentId))
      .limit(1);

    if (!deployment) {
      return;
    }

    await database
      .update(deploymentsTable)
      .set({
        deletedAt: new Date(),
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deploymentId));

    await this.notifyDeploymentStatus(deploymentId, "deleted", { operation: "delete" });
  }

  /**
   * Dispatch deployment status notification to user
   * @param deploymentId Deployment ID to notify about
   * @param status Deployment status (deployed, failed, deleted)
   * @param context Additional context for the notification
   */
  static async notifyDeploymentStatus(
    deploymentId: string,
    status: "deployed" | "failed" | "deleted",
    context?: {
      operation?: "create" | "promote" | "rollback" | "delete";
      fromEnvironment?: string;
    }
  ): Promise<void> {
    try {
      const database = db();
      const [deployment] = await database
        .select()
        .from(deploymentsTable)
        .where(eq(deploymentsTable.id, deploymentId))
        .limit(1);

      if (!deployment) {
        return;
      }

      const [project] = await database
        .select()
        .from(projects)
        .where(eq(projects.id, deployment.projectId))
        .limit(1);

      if (!project) {
        return;
      }

      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, project.ownerId))
        .limit(1);

      if (!user) {
        return;
      }

      let title: string;
      let message: string;
      const projectName = project.name || deployment.projectId;

      if (status === "deployed") {
        title = "Deployment Successful";
        if (context?.operation === "promote") {
          message = `Project "${projectName}" has been successfully promoted from ${context.fromEnvironment} to ${deployment.environment}.`;
        } else if (context?.operation === "rollback") {
          message = `Project "${projectName}" has been successfully rolled back in ${deployment.environment}.`;
        } else {
          message = `Project "${projectName}" has been successfully deployed to ${deployment.environment}.`;
        }
      } else if (status === "failed") {
        title = "Deployment Failed";
        message = `Deployment of project "${projectName}" to ${deployment.environment} failed. Please check the deployment logs for details.`;
      } else {
        title = "Deployment Deleted";
        message = `Deployment of project "${projectName}" in ${deployment.environment} has been deleted.`;
      }

      await       NotificationService.dispatch(
        user.clerkId,
        "deployment_status" as NotificationType,
        title,
        message,
        {
          deploymentId,
          projectId: deployment.projectId,
          environment: deployment.environment,
          status,
        },
        `/projects/${deployment.projectId}/deploy/${deploymentId}`
      );
    } catch (error) {
      logger.error("Failed to send deployment notification", { deploymentId, status, error });
    }
  }

  /**
   * Deploy environment to GitHub with full orchestration
   * @param params Deployment parameters including project details and environment configuration
   * @returns Deployment result with repository details
   */
  static async deployEnvironment(params: {
    projectId: string;
    userId: number;
    userClerkId: string;
    githubOrg: string;
    repoName: string;
    isPrivate: boolean;
    environment: "production" | "staging" | "preview";
    context: RequestContext;
  }): Promise<DeployEnvironmentResult> {
    const {
      projectId,
      userId,
      userClerkId,
      githubOrg,
      repoName,
      isPrivate,
      environment,
      context,
    } = params;

    const deploymentStartTime = Date.now();

    const projectDetails = await ProjectDataService.verifyProjectOwnership(
      projectId,
      userClerkId,
    );
    const { project } = projectDetails;

    const existingDeployment = await DeploymentService.checkExistingDeployment(projectId, environment);
    if (existingDeployment) {
      throw new ValidationError(`Project already has a ${environment} deployment`);
    }

    if (environment === "production") {
      const stagingDeployment = await DeploymentService.checkExistingDeployment(projectId, "staging");
      if (!stagingDeployment || stagingDeployment.status !== "deployed") {
        throw new ValidationError("Staging deployment required before production");
      }
    }

    const latestBlueprint = await ProjectDataService.getLatestBlueprint(projectId);
    const blueprintVersion = latestBlueprint.version || 1;

    await ProjectDataService.updateProjectStatus(projectId, "generating");

    const environmentRepoName = DeploymentService.generateEnvironmentRepoName(repoName, environment);

    const expiresAt = environment === "preview"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : undefined;

    logger.info("Starting environment deployment", {
      requestId: context.requestId,
      userId: userClerkId,
      projectId,
      githubOrg,
      repoName: environmentRepoName,
      environment,
      blueprintVersion,
      expiresAt,
    });

    let deploymentId: string | undefined;
    try {
      deploymentId = await DeploymentService.createDeploymentRecord({
        projectId,
        environment,
        githubOrg,
        githubRepoName: environmentRepoName,
        blueprintVersion,
        expiresAt,
      });

      const repo = await githubService.createRepository({
        org: githubOrg,
        name: environmentRepoName,
        description: `${project.description || "AI-generated software project"} (${environment})`,
        isPrivate: isPrivate || false,
        blueprintContent: latestBlueprint.contentMarkdown,
      });

      await DeploymentService.updateDeploymentRecord(deploymentId, {
        githubRepoId: repo.id,
        githubRepoUrl: repo.html_url,
        status: "deployed",
      });

      const deploymentEndTime = Date.now();
      const deploymentTime = deploymentEndTime - deploymentStartTime;

      performanceMonitorService.recordDeploymentMetric({
        deploymentId: deploymentId!,
        projectId,
        environment,
        status: "deployed",
        timestamp: new Date(),
        deploymentTime,
        metadata: {
          blueprintVersion,
          repoUrl: repo.html_url,
          githubOrg,
          githubRepoName: environmentRepoName,
        },
      });

      await Promise.all([
        NotificationService.dispatch(
          userClerkId,
          "deployment_status",
          "Deployment Successful",
          `Your ${environment} deployment for project "${project.name}" was successful.`,
          {
            deploymentId,
            projectId,
            environment,
            status: "deployed",
          },
          `/projects/${projectId}/deploy/${deploymentId}`,
        ),
        WebhookEventDispatcher.emitProjectDeployed(
          userId,
          userClerkId,
          projectId,
          deploymentId!,
          "success",
          repo.html_url,
          context,
        ),
        ActivityFeedService.recordActivity({
          userId,
          clerkId: userClerkId,
          entityType: "deployment",
          entityId: deploymentId!,
          eventType: "deployment.success",
          eventData: {
            projectId,
            projectName: project.name,
            environment,
            status: "deployed",
            repoUrl: repo.html_url,
          },
        }, context)
      ]);

      if (environment === "production") {
        await ProjectDataService.updateProjectDeployment(projectId, repo.html_url);
      }

      logger.userAction("Environment deployment successful", userClerkId, {
        requestId: context.requestId,
        projectId,
        deploymentId,
        environment,
        repoUrl: repo.html_url,
        githubOrg,
        repoName: environmentRepoName,
      });

      return {
        projectId: project.id,
        deploymentId: deploymentId!,
        environment,
        repoUrl: repo.html_url,
        repoName: environmentRepoName,
        status: "deployed",
        message: `${environment} deployment successful`,
        deploymentDetails: {
          repositoryId: repo.id,
          fullName: repo.full_name,
          cloneUrl: repo.clone_url,
          organization: githubOrg,
          repository: environmentRepoName,
          visibility: isPrivate ? "private" : "public",
          createdAt: repo.created_at,
          blueprintVersion,
          expiresAt,
        },
      };
    } catch (error) {
      await ProjectDataService.updateProjectStatus(projectId, "completed");

      await NotificationService.dispatch(
        userClerkId,
        "deployment_status",
        "Deployment Failed",
        `Your ${environment} deployment for project "${project.name}" failed.`,
        {
          projectId,
          environment,
          status: "failed",
        },
        deploymentId ? `/projects/${projectId}/deploy/${deploymentId}` : `/projects/${projectId}`,
      );

      if (deploymentId) {
        await Promise.all([
          WebhookEventDispatcher.emitProjectDeployed(
            userId,
            userClerkId,
            projectId,
            deploymentId,
            "failed",
            undefined,
            context,
          ),
          ActivityFeedService.recordActivity({
            userId,
            clerkId: userClerkId,
            entityType: "deployment",
            entityId: deploymentId,
            eventType: "deployment.failed",
            eventData: {
              projectId,
              projectName: project.name,
              environment,
              status: "failed",
            },
          }, context)
        ]);
      }

      throw error;
    }
  }
}