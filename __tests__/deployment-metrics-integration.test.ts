import { describe, it, expect, beforeEach, jest } from "@jest/globals";

describe("Deployment Metrics Integration", () => {
  beforeEach(() => {
    const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");
    performanceMonitorService.reset();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  describe("PerformanceMonitorService - Deployment Metrics", () => {
    describe("recordDeploymentMetric", () => {
      it("should record a deployment metric successfully", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const deploymentMetric = {
          deploymentId: "test-deployment-id",
          projectId: "test-project-id",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 5000,
          metadata: {
            blueprintVersion: 1,
            repoUrl: "https://github.com/test/repo",
            githubOrg: "test",
            githubRepoName: "test-repo",
          },
        };

        expect(() => {
          performanceMonitorService.recordDeploymentMetric(deploymentMetric);
        }).not.toThrow();
      });

      it("should record deployment metric with different statuses", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const statuses: Array<"deployed" | "promoted" | "rolled_back" | "failed"> = [
          "deployed",
          "promoted",
          "rolled_back",
          "failed",
        ];

        statuses.forEach((status) => {
          const deploymentMetric = {
            deploymentId: `test-deployment-${status}`,
            projectId: "test-project-id",
            environment: "production" as const,
            status,
            timestamp: new Date(),
            deploymentTime: 5000,
            metadata: {},
          };

          expect(() => {
            performanceMonitorService.recordDeploymentMetric(deploymentMetric);
          }).not.toThrow();
        });
      });

      it("should record deployment metric for all environments", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const environments: Array<"production" | "staging" | "preview"> = [
          "production",
          "staging",
          "preview",
        ];

        environments.forEach((environment) => {
          const deploymentMetric = {
            deploymentId: `test-deployment-${environment}`,
            projectId: "test-project-id",
            environment,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 5000,
            metrics: {},
          };

          expect(() => {
            performanceMonitorService.recordDeploymentMetric(deploymentMetric);
          }).not.toThrow();
        });
      });

      it("should handle deployment metrics with promotion metadata", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const promotionMetric = {
          deploymentId: "test-promotion-id",
          projectId: "test-project-id",
          environment: "production" as const,
          status: "promoted" as const,
          timestamp: new Date(),
          deploymentTime: 3000,
          metadata: {
            blueprintVersion: 2,
            repoUrl: "https://github.com/test/repo",
            githubOrg: "test",
            githubRepoName: "test-repo",
            fromEnvironment: "staging",
            toEnvironment: "production",
          },
        };

        expect(() => {
          performanceMonitorService.recordDeploymentMetric(promotionMetric);
        }).not.toThrow();
      });

      it("should handle deployment metrics with rollback metadata", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const rollbackMetric = {
          deploymentId: "test-rollback-id",
          projectId: "test-project-id",
          environment: "staging" as const,
          status: "rolled_back" as const,
          timestamp: new Date(),
          deploymentTime: 4000,
          metadata: {
            repoUrl: "https://github.com/test/repo",
            githubOrg: "test",
            githubRepoName: "test-repo-staging",
            reason: "Critical bug in production",
            targetDeploymentId: "target-deployment-id",
          },
        };

        expect(() => {
          performanceMonitorService.recordDeploymentMetric(rollbackMetric);
        }).not.toThrow();
      });
    });

    describe("getDeploymentMetric", () => {
      it("should retrieve deployment metric by deployment ID", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const deploymentMetric = {
          deploymentId: "test-deployment-id",
          projectId: "test-project-id",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 5000,
          metadata: {
            blueprintVersion: 1,
            repoUrl: "https://github.com/test/repo",
          },
        };

        performanceMonitorService.recordDeploymentMetric(deploymentMetric);

        const retrievedMetric = performanceMonitorService.getDeploymentMetric("test-deployment-id");

        expect(retrievedMetric).toBeDefined();
        expect(retrievedMetric?.deploymentId).toBe("test-deployment-id");
        expect(retrievedMetric?.projectId).toBe("test-project-id");
        expect(retrievedMetric?.environment).toBe("production");
        expect(retrievedMetric?.status).toBe("deployed");
        expect(retrievedMetric?.deploymentTime).toBe(5000);
      });

      it("should return undefined for non-existent deployment ID", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const retrievedMetric = performanceMonitorService.getDeploymentMetric("non-existent-id");

        expect(retrievedMetric).toBeUndefined();
      });

      it("should handle multiple deployment metrics and retrieve correct one", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const deploymentMetric1 = {
          deploymentId: "test-deployment-1",
          projectId: "test-project-id",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 5000,
          metadata: {},
        };

        const deploymentMetric2 = {
          deploymentId: "test-deployment-2",
          projectId: "test-project-id",
          environment: "staging" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 3000,
          metadata: {},
        };

        performanceMonitorService.recordDeploymentMetric(deploymentMetric1);
        performanceMonitorService.recordDeploymentMetric(deploymentMetric2);

        const retrievedMetric1 = performanceMonitorService.getDeploymentMetric("test-deployment-1");
        const retrievedMetric2 = performanceMonitorService.getDeploymentMetric("test-deployment-2");

        expect(retrievedMetric1?.deploymentId).toBe("test-deployment-1");
        expect(retrievedMetric2?.deploymentId).toBe("test-deployment-2");
        expect(retrievedMetric1?.environment).toBe("production");
        expect(retrievedMetric2?.environment).toBe("staging");
      });
    });

    describe("getDeploymentMetricsSummary", () => {
      it("should return empty summary when no metrics recorded", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const summary = performanceMonitorService.getDeploymentMetricsSummary();

        expect(summary.totalDeployments).toBe(0);
        expect(summary.successfulDeployments).toBe(0);
        expect(summary.failedDeployments).toBe(0);
        expect(summary.avgDeploymentTime).toBe(0);
        expect(summary.deploymentsByEnvironment.production).toBe(0);
        expect(summary.deploymentsByEnvironment.staging).toBe(0);
        expect(summary.deploymentsByEnvironment.preview).toBe(0);
        expect(summary.recentDeployments).toHaveLength(0);
      });

      it("should return correct summary with mixed deployment statuses", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const metrics = [
          {
            deploymentId: "deploy-1",
            projectId: "project-1",
            environment: "production" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 5000,
            metadata: {},
          },
          {
            deploymentId: "deploy-2",
            projectId: "project-1",
            environment: "staging" as const,
            status: "promoted" as const,
            timestamp: new Date(),
            deploymentTime: 3000,
            metadata: {},
          },
          {
            deploymentId: "deploy-3",
            projectId: "project-1",
            environment: "preview" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 2000,
            metadata: {},
          },
          {
            deploymentId: "deploy-4",
            projectId: "project-1",
            environment: "production" as const,
            status: "rolled_back" as const,
            timestamp: new Date(),
            deploymentTime: 4000,
            metadata: {},
          },
          {
            deploymentId: "deploy-5",
            projectId: "project-1",
            environment: "staging" as const,
            status: "failed" as const,
            timestamp: new Date(),
            deploymentTime: undefined,
            metadata: {},
          },
        ];

        metrics.forEach((metric) => performanceMonitorService.recordDeploymentMetric(metric));

        const summary = performanceMonitorService.getDeploymentMetricsSummary();

        expect(summary.totalDeployments).toBe(5);
        expect(summary.successfulDeployments).toBe(4); // deployed, promoted, rolled_back
        expect(summary.failedDeployments).toBe(1);
        expect(summary.avgDeploymentTime).toBe(3500); // (5000 + 3000 + 2000 + 4000) / 4
        expect(summary.deploymentsByEnvironment.production).toBe(2);
        expect(summary.deploymentsByEnvironment.staging).toBe(2);
        expect(summary.deploymentsByEnvironment.preview).toBe(1);
        expect(summary.recentDeployments).toHaveLength(5);
      });

      it("should return recent deployments sorted by timestamp", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const now = new Date();
        const metric1 = {
          deploymentId: "deploy-1",
          projectId: "project-1",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(now.getTime() - 10000),
          deploymentTime: 5000,
          metadata: {},
        };
        const metric2 = {
          deploymentId: "deploy-2",
          projectId: "project-1",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(now.getTime() - 5000),
          deploymentTime: 6000,
          metadata: {},
        };
        const metric3 = {
          deploymentId: "deploy-3",
          projectId: "project-1",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: now,
          deploymentTime: 4000,
          metadata: {},
        };

        performanceMonitorService.recordDeploymentMetric(metric1);
        performanceMonitorService.recordDeploymentMetric(metric2);
        performanceMonitorService.recordDeploymentMetric(metric3);

        const summary = performanceMonitorService.getDeploymentMetricsSummary();
        const recentDeployments = summary.recentDeployments;

        expect(recentDeployments).toHaveLength(3);
        expect(recentDeployments[0].deploymentId).toBe("deploy-3");
        expect(recentDeployments[1].deploymentId).toBe("deploy-2");
        expect(recentDeployments[2].deploymentId).toBe("deploy-1");
      });

      it("should limit recent deployments to 10", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        for (let i = 1; i <= 15; i++) {
          const metric = {
            deploymentId: `deploy-${i}`,
            projectId: "project-1",
            environment: "production" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 5000,
            metadata: {},
          };
          performanceMonitorService.recordDeploymentMetric(metric);
        }

        const summary = performanceMonitorService.getDeploymentMetricsSummary();

        expect(summary.totalDeployments).toBe(15);
        expect(summary.recentDeployments).toHaveLength(10);
      });
    });

    describe("getDeploymentMetricsByProject", () => {
      it("should return empty array for project with no deployments", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const projectMetrics = performanceMonitorService.getDeploymentMetricsByProject("non-existent-project");

        expect(projectMetrics).toHaveLength(0);
      });

      it("should return only metrics for specific project", () => {
        const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

        const project1Metrics = [
          {
            deploymentId: "deploy-1",
            projectId: "project-1",
            environment: "production" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 5000,
            metadata: {},
          },
          {
            deploymentId: "deploy-2",
            projectId: "project-1",
            environment: "staging" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 3000,
            metadata: {},
          },
        ];

        const project2Metrics = [
          {
            deploymentId: "deploy-3",
            projectId: "project-2",
            environment: "production" as const,
            status: "deployed" as const,
            timestamp: new Date(),
            deploymentTime: 4000,
            metadata: {},
          },
        ];

        [...project1Metrics, ...project2Metrics].forEach((metric) =>
          performanceMonitorService.recordDeploymentMetric(metric)
        );

        const project1Results = performanceMonitorService.getDeploymentMetricsByProject("project-1");
        const project2Results = performanceMonitorService.getDeploymentMetricsByProject("project-2");

        expect(project1Results).toHaveLength(2);
        expect(project2Results).toHaveLength(1);
        expect(project1Results.every((m) => m.projectId === "project-1")).toBe(true);
        expect(project2Results.every((m) => m.projectId === "project-2")).toBe(true);
      });
    });
  });

  describe("Circular Buffer Behavior", () => {
    it("should handle circular buffer overflow gracefully", () => {
      const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

      const BUFFER_SIZE = 200;

      for (let i = 1; i <= BUFFER_SIZE + 10; i++) {
        const metric = {
          deploymentId: `deploy-${i}`,
          projectId: "project-1",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 5000,
          metadata: {},
        };
        performanceMonitorService.recordDeploymentMetric(metric);
      }

      const summary = performanceMonitorService.getDeploymentMetricsSummary();

      expect(summary.totalDeployments).toBe(BUFFER_SIZE);
      expect(summary.recentDeployments).toHaveLength(10);
    });

    it("should maintain circular buffer integrity after overflow", () => {
      const { performanceMonitorService } = require("@/lib/services/performance-monitor-service");

      const BUFFER_SIZE = 200;

      for (let i = 1; i <= BUFFER_SIZE + 20; i++) {
        const metric = {
          deploymentId: `deploy-${i}`,
          projectId: "project-1",
          environment: "production" as const,
          status: "deployed" as const,
          timestamp: new Date(),
          deploymentTime: 5000,
          metadata: {},
        };
        performanceMonitorService.recordDeploymentMetric(metric);
      }

      const summary = performanceMonitorService.getDeploymentMetricsSummary();

      expect(summary.totalDeployments).toBe(BUFFER_SIZE);

      const firstInBuffer = performanceMonitorService.getDeploymentMetric("deploy-21");
      const notInBuffer = performanceMonitorService.getDeploymentMetric("deploy-20");

      expect(firstInBuffer).toBeDefined();
      expect(notInBuffer).toBeUndefined();
    });
  });
});
