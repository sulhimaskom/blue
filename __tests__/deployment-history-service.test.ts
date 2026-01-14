import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";

describe("DeploymentHistoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateRollbackTarget", () => {
    it("should validate successful deployment", async () => {
      const deployment = {
        id: "test-deployment-id",
        projectId: "test-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "deployed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      const result = await DeploymentHistoryService.validateRollbackTarget("test-deployment-id");

      expect(result).toEqual(deployment);
      expect(result.status).toBe("deployed");
    });

    it("should throw error for failed deployment", async () => {
      const deployment = {
        id: "failed-deployment-id",
        projectId: "test-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "failed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("failed-deployment-id")
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });

    it("should throw error for non-existent deployment", async () => {
      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(null);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("non-existent-id")
      ).rejects.toThrow("Deployment not found");
    });

    it("should throw error for pending deployment", async () => {
      const deployment = {
        id: "pending-deployment-id",
        projectId: "test-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("pending-deployment-id")
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });

    it("should throw error for deleted deployment", async () => {
      const deployment = {
        id: "deleted-deployment-id",
        projectId: "test-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "deleted" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("deleted-deployment-id")
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });
  });
});
