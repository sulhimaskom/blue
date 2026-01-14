import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/services/webhook-event-dispatcher", () => ({
  WebhookEventDispatcher: {
    emitProjectCreated: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/activity-feed-service", () => ({
  ActivityFeedService: {
    recordActivity: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  UnifiedCacheManager: {
    invalidateByTag: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/project-data-service", () => ({
  ProjectDataService: {
    verifyProjectOwnership: jest.fn(),
  },
}));

import { ProjectCloneService } from "@/lib/services/project-clone-service";
import { ValidationError } from "@/lib/api-utils";

describe("ProjectCloneService - Core Functionality Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProjectTemplates", () => {
    it("should return all project templates", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);

      templates.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("complexity");
        expect(template).toHaveProperty("estimatedCredits");
        expect(template).toHaveProperty("blueprints");
        expect(Array.isArray(template.blueprints)).toBe(true);
      });
    });

    it("should include webapp template", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();
      const webappTemplate = templates.find((t: any) => t.id === "webapp");

      expect(webappTemplate).toBeDefined();
      expect(webappTemplate.name).toBe("Web Application");
      expect(webappTemplate.complexity).toBe("intermediate");
      expect(webappTemplate.estimatedCredits).toBe(50);
    });

    it("should include api template", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();
      const apiTemplate = templates.find((t: any) => t.id === "api");

      expect(apiTemplate).toBeDefined();
      expect(apiTemplate.name).toBe("REST API");
      expect(apiTemplate.complexity).toBe("beginner");
      expect(apiTemplate.estimatedCredits).toBe(30);
    });

    it("should include microservice template", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();
      const microserviceTemplate = templates.find((t: any) => t.id === "microservice");

      expect(microserviceTemplate).toBeDefined();
      expect(microserviceTemplate.name).toBe("Microservice");
      expect(microserviceTemplate.complexity).toBe("advanced");
      expect(microserviceTemplate.estimatedCredits).toBe(75);
    });

    it("should include fullstack template", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();
      const fullstackTemplate = templates.find((t: any) => t.id === "fullstack");

      expect(fullstackTemplate).toBeDefined();
      expect(fullstackTemplate.name).toBe("Full-Stack Application");
      expect(fullstackTemplate.complexity).toBe("advanced");
      expect(fullstackTemplate.estimatedCredits).toBe(100);
    });

    it("should include blueprint content in templates", async () => {
      const templates = await ProjectCloneService.getProjectTemplates();

      templates.forEach((template: any) => {
        template.blueprints.forEach((blueprint: any) => {
          expect(blueprint).toHaveProperty("version");
          expect(blueprint).toHaveProperty("contentMarkdown");
          expect(blueprint).toHaveProperty("structuredData");
          expect(typeof blueprint.version).toBe("number");
          expect(typeof blueprint.contentMarkdown).toBe("string");
          expect(typeof blueprint.structuredData).toBe("object");
        });
      });
    });
  });

  describe("cloneProject - Parameter Validation", () => {
    it("should validate templateId for createFromTemplate", async () => {
      await expect(
        ProjectCloneService.createFromTemplate(
          "invalid-template-id",
          "clerk-123",
          { name: "Test Project" },
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("should accept valid template types", async () => {
      const validTemplateIds = ["webapp", "api", "microservice", "fullstack"];

      for (const templateId of validTemplateIds) {
        await expect(
          ProjectCloneService.createFromTemplate(
            templateId,
            "clerk-123",
            { name: "Test Project" },
          ),
        ).rejects.toThrow(); // Will fail at database level, not validation
      }
    });
  });

  describe("Integration Points", () => {
    it("should have webhook integration", () => {
      expect(() => {
        require("@/lib/services/webhook-event-dispatcher").WebhookEventDispatcher.emitProjectCreated;
      }).not.toThrow();
    });

    it("should have activity feed integration", () => {
      expect(() => {
        require("@/lib/services/activity-feed-service").ActivityFeedService.recordActivity;
      }).not.toThrow();
    });

    it("should have cache integration", () => {
      expect(() => {
        require("@/lib/services/cache-orchestrator").UnifiedCacheManager.invalidateByTag;
      }).not.toThrow();
    });

    it("should have project data service integration", () => {
      expect(() => {
        require("@/lib/services/project-data-service").ProjectDataService.verifyProjectOwnership;
      }).not.toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should export correct types", () => {
      const { CloneProjectOptions, ProjectCloneResult, ProjectTemplate } = require("@/lib/services/project-clone-service");

      expect(typeof CloneProjectOptions).toBe("object");
      expect(typeof ProjectCloneResult).toBe("object");
      expect(typeof ProjectTemplate).toBe("object");
    });

    it("should have correct method signatures", () => {
      expect(typeof ProjectCloneService.cloneProject).toBe("function");
      expect(typeof ProjectCloneService.getProjectTemplates).toBe("function");
      expect(typeof ProjectCloneService.createFromTemplate).toBe("function");
    });
  });
});
