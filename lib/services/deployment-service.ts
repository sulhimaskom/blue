import { db } from "@/lib/db";
import { deployments as deploymentsTable } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";


/**
 * Deployment Service for environment management
 * Handles all deployment-related business logic
 */

export class DeploymentService {
  /**
   * Check if deployment already exists for environment
   */
  static async checkExistingDeployment(projectId: string, environment: string): Promise<any> {
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
    return deployments[0] || null;
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
    updates: Partial<{
      githubRepoId: number;
      githubRepoUrl: string;
      status: string;
      deploymentLogs: any;
    }>
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
  static async getProjectDeployments(projectId: string): Promise<any[]> {
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
    return deployments;
  }

  /**
   * Soft delete deployment (for cleanup)
   */
  static async deleteDeployment(deploymentId: string): Promise<void> {
    const database = db();
    await database
      .update(deploymentsTable)
      .set({
        deletedAt: new Date(),
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(deploymentsTable.id, deploymentId));
  }
}