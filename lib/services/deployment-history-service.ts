import { db } from "@/lib/db";
import { deployments as deploymentsTable } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface DeploymentHistoryRecord {
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

export interface DeploymentHistoryFilters {
  status?: "pending" | "deployed" | "failed" | "deleted";
  environment?: "production" | "staging" | "preview";
}

export interface DeploymentHistoryResponse {
  deployments: DeploymentHistoryRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Deployment History Service for tracking deployment history
 * Handles all deployment history-related business logic
 */
export class DeploymentHistoryService {
  /**
   * Get deployment history for a project with pagination
   */
  static async getDeploymentHistory(
    projectId: string,
    page: number = 1,
    pageSize: number = 20,
    filters: DeploymentHistoryFilters = {}
  ): Promise<DeploymentHistoryResponse> {
    const database = db();
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(deploymentsTable.projectId, projectId),
    ];

    if (filters.status) {
      conditions.push(eq(deploymentsTable.status, filters.status));
    }

    if (filters.environment) {
      conditions.push(eq(deploymentsTable.environment, filters.environment));
    }

    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(and(...conditions))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalCountResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(deploymentsTable)
      .where(and(...conditions));

    const totalCount = totalCountResult[0]?.count || 0;

    return {
      deployments: deployments as DeploymentHistoryRecord[],
      totalCount,
      page,
      pageSize,
    };
  }

  /**
   * Get specific deployment details by ID
   */
  static async getDeploymentById(deploymentId: string): Promise<DeploymentHistoryRecord | null> {
    const database = db();
    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.id, deploymentId))
      .limit(1);

    return deployments[0] as DeploymentHistoryRecord || null;
  }

  /**
   * Get deployment history for a specific project and environment
   */
  static async getProjectEnvironmentHistory(
    projectId: string,
    environment: "production" | "staging" | "preview",
    limit: number = 10
  ): Promise<DeploymentHistoryRecord[]> {
    const database = db();
    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(
        and(
          eq(deploymentsTable.projectId, projectId),
          eq(deploymentsTable.environment, environment)
        )
      )
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(limit);

    return deployments as DeploymentHistoryRecord[];
  }

  /**
   * Get successful deployments for rollback selection
   */
  static async getRollbackCandidates(
    projectId: string,
    environment: "production" | "staging" | "preview",
    limit: number = 10
  ): Promise<DeploymentHistoryRecord[]> {
    const database = db();
    const deployments = await database
      .select()
      .from(deploymentsTable)
      .where(
        and(
          eq(deploymentsTable.projectId, projectId),
          eq(deploymentsTable.environment, environment),
          eq(deploymentsTable.status, "deployed")
        )
      )
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(limit);

    return deployments as DeploymentHistoryRecord[];
  }

  /**
   * Validate rollback target deployment
   */
  static async validateRollbackTarget(deploymentId: string): Promise<DeploymentHistoryRecord> {
    const deployment = await this.getDeploymentById(deploymentId);

    if (!deployment) {
      throw new Error("Deployment not found");
    }

    if (deployment.status !== "deployed") {
      throw new Error("Cannot rollback to a deployment that was not successful");
    }

    return deployment;
  }

  /**
   * Create rollback deployment
   */
  static async createRollbackDeployment(
    projectId: string,
    environment: "production" | "staging" | "preview",
    targetDeploymentId: string,
    rollbackReason: string
  ): Promise<string> {
    const targetDeployment = await this.validateRollbackTarget(targetDeploymentId);

    const database = db();
    const result = await database
      .insert(deploymentsTable)
      .values({
        projectId: targetDeployment.projectId,
        environment: targetDeployment.environment,
        githubOrg: targetDeployment.githubOrg,
        githubRepoName: targetDeployment.githubRepoName,
        blueprintVersion: targetDeployment.blueprintVersion,
        status: "pending",
        deploymentLogs: {
          rollback: true,
          rollbackFrom: targetDeployment.id,
          rollbackReason,
          rollbackTimestamp: new Date().toISOString(),
        },
      })
      .returning({ id: deploymentsTable.id });

    return result[0].id;
  }
}
