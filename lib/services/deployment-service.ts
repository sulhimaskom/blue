import { db } from "@/lib/db";
import { deployments as deploymentsTable, projects, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { NotificationService, NotificationType } from "@/lib/services/notification-service";
import { logger } from "@/lib/logger";

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

      await NotificationService.dispatch(
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
}