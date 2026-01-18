import { logger } from "@/lib/logger";
import { DeploymentService } from "@/lib/services/deployment-service";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { githubService } from "@/lib/services/github-service";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { ValidationError } from "@/lib/api-utils";

/**
 * Deployment Promotion Service
 *
 * Handles business logic for environment promotion and rollback operations.
 * Extracts complex orchestration and transformation logic from API routes.
 *
 * @class DeploymentPromotionService
 */
export class DeploymentPromotionService {
  private static instance: DeploymentPromotionService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DeploymentPromotionService {
    if (!DeploymentPromotionService.instance) {
      DeploymentPromotionService.instance = new DeploymentPromotionService();
    }
    return DeploymentPromotionService.instance;
  }

  /**
   * Generate repository name for environment deployment
   *
   * @param projectName - Project name (will be sanitized)
   * @param environment - Target environment (production, staging, preview)
   * @returns Formatted repository name
   */
  public generateEnvironmentRepoName(
    projectName: string,
    environment: "production" | "staging" | "preview"
  ): string {
    return DeploymentService.generateEnvironmentRepoName(
      projectName.replace(/\s+/g, "-").toLowerCase(),
      environment
    );
  }

  /**
   * Generate repository description for deployment
   *
   * @param projectDescription - Project description
   * @param environment - Target environment
   * @param operation - Operation type (deployment, rollback)
   * @returns Formatted repository description
   */
  public generateRepoDescription(
    projectDescription: string | null | undefined,
    environment: "production" | "staging" | "preview",
    operation: "deployment" | "rollback" = "deployment"
  ): string {
    const baseDescription =
      projectDescription || "AI-generated software project";
    const operationSuffix = operation === "rollback" ? " - rollback" : "";
    return `${baseDescription} (${environment}${operationSuffix})`;
  }

  /**
   * Transform staging repo name to production repo name
   *
   * @param stagingRepoName - Staging repository name
   * @returns Production repository name
   */
  public transformStagingToProductionRepoName(stagingRepoName: string): string {
    return stagingRepoName.replace("-staging", "");
  }

  /**
   * Rollback deployment to previous version
   *
   * @param projectId - Project UUID
   * @param targetDeploymentId - Target deployment ID to rollback to
   * @param reason - Rollback reason
   * @param userId - User ID
   * @param clerkId - Clerk user ID
   * @param context - Request context
   * @returns Rollback result with deployment details
   */
  public async rollbackDeployment(
    projectId: string,
    targetDeploymentId: string,
    reason: string,
    userId: number,
    clerkId: string,
    context: { requestId: string }
  ): Promise<{
    rollbackDeploymentId: string;
    repoUrl: string;
    repoName: string;
    status: string;
    message: string;
  }> {
    const rollbackStartTime = Date.now();

    const targetDeployment =
      await DeploymentHistoryService.validateRollbackTarget(
        targetDeploymentId,
        projectId
      );

    const projectDetails = await ProjectDataService.verifyProjectOwnership(
      projectId,
      clerkId
    );

    const { project } = projectDetails;

    const rollbackDeploymentId =
      await DeploymentHistoryService.createRollbackDeployment(
        projectId,
        targetDeploymentId,
        reason
      );

    try {
      const latestBlueprint =
        await ProjectDataService.getLatestBlueprint(projectId);
      const environmentRepoName = this.generateEnvironmentRepoName(
        project.name,
        targetDeployment.environment as "production" | "staging" | "preview"
      );

      const repo = await githubService.createRepository({
        org: targetDeployment.githubOrg,
        name: environmentRepoName,
        description: this.generateRepoDescription(
          project.description,
          targetDeployment.environment as "production" | "staging" | "preview",
          "rollback"
        ),
        isPrivate: true,
        blueprintContent: latestBlueprint.contentMarkdown,
      });

      await DeploymentService.updateDeploymentRecord(rollbackDeploymentId, {
        githubRepoId: repo.id,
        githubRepoUrl: repo.html_url,
        status: "deployed",
      });

      const rollbackEndTime = Date.now();
      const rollbackTime = rollbackEndTime - rollbackStartTime;

      performanceMonitorService.recordDeploymentMetric({
        deploymentId: rollbackDeploymentId,
        projectId,
        environment: targetDeployment.environment as "production" | "staging" | "preview",
        status: "rolled_back",
        timestamp: new Date(),
        deploymentTime: rollbackTime,
        metadata: {
          repoUrl: repo.html_url,
          githubOrg: targetDeployment.githubOrg,
          githubRepoName: environmentRepoName,
          reason,
          targetDeploymentId,
        },
      });

      const results = await Promise.allSettled([
        DeploymentService.notifyDeploymentStatus(
          rollbackDeploymentId,
          "deployed",
          { operation: "rollback" }
        ),
        WebhookEventDispatcher.emitProjectDeployed(
          userId,
          clerkId,
          projectId,
          rollbackDeploymentId,
          "rolled_back",
          repo.html_url,
          context
        ),
        ActivityFeedService.recordActivity(
          {
            userId,
            clerkId,
            entityType: "deployment",
            entityId: rollbackDeploymentId,
            eventType: "deployment.rolled_back",
            eventData: {
              projectId,
              projectName: project.name,
              environment: targetDeployment.environment,
              status: "rolled_back",
              reason,
              targetDeploymentId,
            },
          },
          context
        ),
      ]);

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const taskName = [
            "DeploymentService.notifyDeploymentStatus",
            "WebhookEventDispatcher.emitProjectDeployed",
            "ActivityFeedService.recordActivity",
          ][index];
          logger.error(`Post-rollback task '${taskName}' failed`, {
            requestId: context.requestId,
            error: result.reason,
          });
        }
      });

      logger.userAction("Rollback successful", clerkId, {
        requestId: context.requestId,
        projectId,
        rollbackDeploymentId,
        targetDeploymentId,
        reason,
      });

      return {
        rollbackDeploymentId,
        repoUrl: repo.html_url,
        repoName: environmentRepoName,
        status: "deployed",
        message: "Rollback completed successfully",
      };
    } catch (error) {
      await DeploymentService.notifyDeploymentStatus(
        rollbackDeploymentId,
        "failed",
        { operation: "rollback" }
      );

      throw error;
    }
  }

  /**
   * Promote staging deployment to production
   *
   * @param projectId - Project UUID
   * @param validationRequired - Whether to validate blueprint version
   * @param userId - User ID
   * @param clerkId - Clerk user ID
   * @param context - Request context
   * @returns Promotion result with deployment details
   */
  public async promoteToProduction(
    projectId: string,
    validationRequired: boolean,
    userId: number,
    clerkId: string,
    context: { requestId: string }
  ): Promise<{
    projectId: string;
    fromEnvironment: string;
    toEnvironment: string;
    deploymentId: string;
    repoUrl: string;
    repoName: string;
    status: string;
    message: string;
    promotedAt: string;
  }> {
    const promotionStartTime = Date.now();

    const projectDetails = await ProjectDataService.verifyProjectOwnership(
      projectId,
      clerkId
    );

    const { project } = projectDetails;

    const stagingDeployment = await DeploymentService.checkExistingDeployment(
      projectId,
      "staging"
    );
    if (!stagingDeployment || stagingDeployment.status !== "deployed") {
      throw new ValidationError(
        "Valid staging deployment required for promotion"
      );
    }

    const existingProduction =
      await DeploymentService.checkExistingDeployment(projectId, "production");
    if (existingProduction) {
      throw new ValidationError("Production deployment already exists");
    }

    if (validationRequired) {
      const latestBlueprint =
        await ProjectDataService.getLatestBlueprint(projectId);
      if (
        latestBlueprint.version !== stagingDeployment.blueprintVersion
      ) {
        throw new ValidationError(
          "Blueprint version mismatch between staging and latest"
        );
      }
    }

    const productionRepoName = this.transformStagingToProductionRepoName(
      stagingDeployment.githubRepoName
    );
    const productionDeploymentId =
      await DeploymentService.createDeploymentRecord({
        projectId,
        environment: "production",
        githubOrg: stagingDeployment.githubOrg,
        githubRepoName: productionRepoName,
        blueprintVersion: stagingDeployment.blueprintVersion,
      });

    try {
      const repo = await githubService.createRepository({
        org: stagingDeployment.githubOrg,
        name: productionRepoName,
        description: this.generateRepoDescription(
          project.description,
          "production",
          "deployment"
        ),
        isPrivate: true,
        blueprintContent: (
          await ProjectDataService.getLatestBlueprint(projectId)
        ).contentMarkdown,
      });

      await DeploymentService.updateDeploymentRecord(productionDeploymentId, {
        githubRepoId: repo.id,
        githubRepoUrl: repo.html_url,
        status: "deployed",
      });

      const promotionEndTime = Date.now();
      const promotionTime = promotionEndTime - promotionStartTime;

      performanceMonitorService.recordDeploymentMetric({
        deploymentId: productionDeploymentId,
        projectId,
        environment: "production",
        status: "promoted",
        timestamp: new Date(),
        deploymentTime: promotionTime,
        metadata: {
          blueprintVersion: stagingDeployment.blueprintVersion,
          repoUrl: repo.html_url,
          githubOrg: stagingDeployment.githubOrg,
          githubRepoName: productionRepoName,
          fromEnvironment: "staging",
          toEnvironment: "production",
        },
      });

      await DeploymentService.notifyDeploymentStatus(
        productionDeploymentId,
        "deployed",
        { operation: "promote", fromEnvironment: "staging" }
      );

      await WebhookEventDispatcher.emitProjectDeployed(
        userId,
        clerkId,
        projectId,
        productionDeploymentId,
        "promoted",
        repo.html_url,
        context
      );

      await ActivityFeedService.recordActivity(
        {
          userId,
          clerkId,
          entityType: "deployment",
          entityId: productionDeploymentId,
          eventType: "deployment.promoted",
          eventData: {
            projectId,
            projectName: project.name,
            fromEnvironment: "staging",
            toEnvironment: "production",
            status: "promoted",
          },
        },
        context
      );

      await ProjectDataService.updateProjectDeployment(projectId, repo.html_url);

      logger.userAction("Environment promotion successful", clerkId, {
        requestId: context.requestId,
        projectId,
        fromEnvironment: "staging",
        toEnvironment: "production",
        stagingDeploymentId: stagingDeployment.id,
        productionDeploymentId,
      });

      return {
        projectId,
        fromEnvironment: "staging",
        toEnvironment: "production",
        deploymentId: productionDeploymentId,
        repoUrl: repo.html_url,
        repoName: productionRepoName,
        status: "deployed",
        message: "Environment promotion successful",
        promotedAt: new Date().toISOString(),
      };
    } catch (error) {
      await DeploymentService.notifyDeploymentStatus(
        productionDeploymentId,
        "failed",
        { operation: "promote", fromEnvironment: "staging" }
      );

      throw error;
    }
  }
}

// Singleton instance export
export const deploymentPromotionService = DeploymentPromotionService.getInstance();
