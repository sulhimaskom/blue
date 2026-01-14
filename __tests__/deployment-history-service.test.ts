import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { DeploymentHistoryService } from "@/lib/services/deployment-history-service";
import { mockDbResponse } from "./helpers";

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

      const result = await DeploymentHistoryService.validateRollbackTarget("test-deployment-id", "test-project-id");

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
        DeploymentHistoryService.validateRollbackTarget("failed-deployment-id", "test-project-id")
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });

    it("should throw error for non-existent deployment", async () => {
      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(null);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("non-existent-id", "test-project-id")
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
        DeploymentHistoryService.validateRollbackTarget("pending-deployment-id", "test-project-id")
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
        DeploymentHistoryService.validateRollbackTarget("deleted-deployment-id", "test-project-id")
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });

    it("should throw error for deployment from different project", async () => {
      const deployment = {
        id: "other-deployment-id",
        projectId: "other-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "deployed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      await expect(
        DeploymentHistoryService.validateRollbackTarget("other-deployment-id", "test-project-id")
      ).rejects.toThrow("Deployment does not belong to this project");
    });
  });

  describe("createRollbackDeployment", () => {
    it("should throw error for non-existent deployment", async () => {
      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(null);

      await expect(
        DeploymentHistoryService.createRollbackDeployment(
          "test-project-id",
          "non-existent-id",
          "Rollback reason"
        )
      ).rejects.toThrow("Deployment not found");
    });

    it("should throw error for deployment from different project", async () => {
      const deployment = {
        id: "other-deployment-id",
        projectId: "other-project-id",
        environment: "production" as const,
        githubOrg: "test-org",
        githubRepoName: "test-repo",
        blueprintVersion: 1,
        status: "deployed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(DeploymentHistoryService, 'getDeploymentById').mockResolvedValue(deployment);

      await expect(
        DeploymentHistoryService.createRollbackDeployment(
          "test-project-id",
          "other-deployment-id",
          "Rollback reason"
        )
      ).rejects.toThrow("Deployment does not belong to this project");
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
        DeploymentHistoryService.createRollbackDeployment(
          "test-project-id",
          "failed-deployment-id",
          "Rollback reason"
        )
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
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
        DeploymentHistoryService.createRollbackDeployment(
          "test-project-id",
          "pending-deployment-id",
          "Rollback reason"
        )
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
        DeploymentHistoryService.createRollbackDeployment(
          "test-project-id",
          "deleted-deployment-id",
          "Rollback reason"
        )
      ).rejects.toThrow("Cannot rollback to a deployment that was not successful");
    });
  });
});
