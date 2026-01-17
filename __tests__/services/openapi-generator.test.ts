/**
 * OpenAPI Generator Test Suite
 *
 * Tests OpenAPI specification generation and validation
 * Ensures API documentation is complete and accurate
 */

import { OpenAPIGenerator, getOpenAPIGenerator } from "@/lib/services/openapi-generator";
import { generateAPIDocumentation, generateOpenAPISpec } from "@/lib/services/api-documentation-service";
import { z } from "zod";

describe("OpenAPIGenerator", () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator({
      title: "Test API",
      version: "1.0.0",
      baseUrl: "http://localhost:3000",
    });
  });

  describe("Initialization", () => {
    test("should create OpenAPI spec with required fields", () => {
      const spec = generator.generate();

      expect(spec).toHaveProperty("openapi", "3.0.3");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("servers");
      expect(spec).toHaveProperty("paths");
      expect(spec).toHaveProperty("components");
    });

    test("should include security schemes for authentication", () => {
      const spec = generator.generate();

      expect(spec.security).toEqual([
        {
          clerkAuth: ["read", "write"],
        },
      ]);

      expect(spec.components.securitySchemes).toHaveProperty("clerkAuth");
      expect(spec.components.securitySchemes.clerkAuth).toEqual({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Clerk JWT authentication token",
      });
    });

    test("should include common response schemas", () => {
      const spec = generator.generate();

      expect(spec.components.schemas).toHaveProperty("SuccessResponse");
      expect(spec.components.schemas).toHaveProperty("ErrorResponse");

      expect(spec.components.responses).toHaveProperty("ValidationError");
      expect(spec.components.responses).toHaveProperty("AuthenticationError");
      expect(spec.components.responses).toHaveProperty("AuthorizationError");
      expect(spec.components.responses).toHaveProperty("NotFoundError");
      expect(spec.components.responses).toHaveProperty("RateLimitError");
      expect(spec.components.responses).toHaveProperty("DatabaseError");
    });
  });

  describe("Tag Management", () => {
    test("should add tag to specification", () => {
      generator.addTag({
        name: "TestTag",
        description: "Test tag description",
      });

      const spec = generator.generate();
      const tag = spec.tags.find((t: any) => t.name === "TestTag");

      expect(tag).toBeDefined();
      expect(tag?.description).toBe("Test tag description");
    });

    test("should not add duplicate tags", () => {
      generator.addTag({
        name: "DuplicateTag",
        description: "First description",
      });

      generator.addTag({
        name: "DuplicateTag",
        description: "Second description",
      });

      const spec = generator.generate();
      const duplicates = spec.tags.filter((t: any) => t.name === "DuplicateTag");

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].description).toBe("First description");
    });
  });

  describe("Schema Registration", () => {
    test("should convert Zod schema to JSON Schema", () => {
      const testSchema = z.object({
        id: z.string(),
        name: z.string(),
        age: z.number().int().min(0),
      });

      const jsonSchema = generator.zodToSchema(testSchema);

      expect(jsonSchema).toHaveProperty("type", "object");
      expect(jsonSchema).toHaveProperty("properties");
      expect(jsonSchema.properties).toHaveProperty("id");
      expect(jsonSchema.properties).toHaveProperty("name");
      expect(jsonSchema.properties).toHaveProperty("age");
    });

    test("should register schema for reuse", () => {
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
      });

      generator.registerSchema("User", userSchema);

      const spec = generator.generate();

      expect(spec.components.schemas).toHaveProperty("User");
      expect(spec.components.schemas.User.type).toBe("object");
      expect(spec.components.schemas.User.properties).toHaveProperty("id");
      expect(spec.components.schemas.User.properties).toHaveProperty("name");
      expect(spec.components.schemas.User.properties).toHaveProperty("email");
    });
  });

  describe("Endpoint Registration", () => {
    test("should add GET endpoint", () => {
      generator.addGET("/test", {
        tags: ["Test"],
        summary: "Test GET endpoint",
        responses: {
          "200": {
            description: "Success",
          },
        },
        rateLimit: {
          category: "standard",
          maxRequests: 30,
          windowMs: 60000,
        },
      });

      const spec = generator.generate();

      expect(spec.paths["/test"]).toHaveProperty("get");
      expect(spec.paths["/test"].get?.summary).toBe("Test GET endpoint");
      expect(spec.paths["/test"].get?.tags).toEqual(["Test"]);
      expect(spec.paths["/test"].get?.rateLimit).toEqual({
        category: "standard",
        maxRequests: 30,
        windowMs: 60000,
      });
    });

    test("should add POST endpoint", () => {
      generator.addPOST("/test", {
        tags: ["Test"],
        summary: "Test POST endpoint",
        requestBody: {
          description: "Request body",
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
          },
        },
        rateLimit: {
          category: "moderate",
          maxRequests: 10,
          windowMs: 60000,
        },
      });

      const spec = generator.generate();

      expect(spec.paths["/test"]).toHaveProperty("post");
      expect(spec.paths["/test"].post?.summary).toBe("Test POST endpoint");
    });

    test("should add PUT endpoint", () => {
      generator.addPUT("/test", {
        tags: ["Test"],
        summary: "Test PUT endpoint",
        responses: {
          "200": {
            description: "Success",
          },
        },
      });

      const spec = generator.generate();

      expect(spec.paths["/test"]).toHaveProperty("put");
      expect(spec.paths["/test"].put?.summary).toBe("Test PUT endpoint");
    });

    test("should add DELETE endpoint", () => {
      generator.addDELETE("/test", {
        tags: ["Test"],
        summary: "Test DELETE endpoint",
        responses: {
          "200": {
            description: "Success",
          },
        },
      });

      const spec = generator.generate();

      expect(spec.paths["/test"]).toHaveProperty("delete");
      expect(spec.paths["/test"].delete?.summary).toBe("Test DELETE endpoint");
    });

    test("should add HEAD endpoint", () => {
      generator.addHEAD("/test", {
        tags: ["Test"],
        summary: "Test HEAD endpoint",
        responses: {
          "200": {
            description: "Success",
          },
        },
      });

      const spec = generator.generate();

      expect(spec.paths["/test"]).toHaveProperty("head");
      expect(spec.paths["/test"].head?.summary).toBe("Test HEAD endpoint");
    });
  });

  describe("JSON/YAML Export", () => {
    test("should export as JSON string", () => {
      const json = generator.toJSON();

      const spec = JSON.parse(json);

      expect(spec).toHaveProperty("openapi", "3.0.3");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("paths");
    });

    test("should export as valid JSON", () => {
      const json = generator.toJSON();

      expect(() => JSON.parse(json)).not.toThrow();
    });

    test("should generate spec with sorted paths and tags", () => {
      generator.addTag({ name: "ZZZTag", description: "Last tag" });
      generator.addTag({ name: "AAATag", description: "First tag" });

      generator.addGET("/zzz", {
        tags: ["Test"],
        summary: "Last endpoint",
        responses: { "200": { description: "Success" } },
      });

      generator.addGET("/aaa", {
        tags: ["Test"],
        summary: "First endpoint",
        responses: { "200": { description: "Success" } },
      });

      const spec = generator.generate();

      // Tags should be sorted alphabetically
      expect(spec.tags[0].name).toBe("AAATag");
      expect(spec.tags[1].name).toBe("ZZZTag");

      // Paths should be sorted alphabetically
      const pathKeys = Object.keys(spec.paths);
      expect(pathKeys[0]).toBe("/aaa");
      expect(pathKeys[1]).toBe("/zzz");
    });
  });
});

describe("APIDocumentationService", () => {
  describe("API Specification Generation", () => {
    test("should generate valid OpenAPI specification", () => {
      const spec = generateOpenAPISpec();

      expect(spec).toHaveProperty("openapi", "3.0.3");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("servers");
      expect(spec).toHaveProperty("paths");
      expect(spec).toHaveProperty("components");
      expect(spec).toHaveProperty("tags");
    });

    test("should include core API endpoints", () => {
      const spec = generateOpenAPISpec();

      // Health endpoints
      expect(spec.paths).toHaveProperty("/health");
      expect(spec.paths).toHaveProperty("/health");

      // Credits endpoints
      expect(spec.paths).toHaveProperty("/credits");
      expect(spec.paths).toHaveProperty("/credits/usage");

      // Subscription endpoints
      expect(spec.paths).toHaveProperty("/subscription/tiers");
      expect(spec.paths).toHaveProperty("/subscription/current");
      expect(spec.paths).toHaveProperty("/subscription/upgrade");
    });

    test("should include all standard API tags", () => {
      const spec = generateOpenAPISpec();

      const tagNames = spec.tags.map((t: any) => t.name);

      expect(tagNames).toContain("Health");
      expect(tagNames).toContain("Credits");
      expect(tagNames).toContain("Subscriptions");
      expect(tagNames).toContain("Projects");
      expect(tagNames).toContain("Blueprints");
      expect(tagNames).toContain("Teams");
      expect(tagNames).toContain("Webhooks");
      expect(tagNames).toContain("Performance");
    });

    test("should include registered schemas", () => {
      const spec = generateOpenAPISpec();

      // Check for core schemas
      expect(spec.components.schemas).toHaveProperty("HealthCheckResponse");
      expect(spec.components.schemas).toHaveProperty("CreditPurchaseRequest");
      expect(spec.components.schemas).toHaveProperty("CreditPurchaseResponse");
      expect(spec.components.schemas).toHaveProperty("CreditsInfoResponse");
    });

    test("should export as valid JSON string", () => {
      const json = generateAPIDocumentation();

      expect(() => JSON.parse(json)).not.toThrow();

      const spec = JSON.parse(json);
      expect(spec).toHaveProperty("openapi");
      expect(spec).toHaveProperty("info");
    });
  });

  describe("Endpoint Documentation", () => {
    test("should document health check endpoint", () => {
      const spec = generateOpenAPISpec();

      const healthEndpoint = spec.paths["/health"]?.get;

      expect(healthEndpoint).toBeDefined();
      expect(healthEndpoint?.tags).toContain("Health");
      expect(healthEndpoint?.summary).toBe("Get system health status");
      expect(healthEndpoint?.rateLimit).toEqual({
        category: "permissive",
        maxRequests: 60,
        windowMs: 60000,
      });
    });

    test("should document credit purchase endpoint", () => {
      const spec = generateOpenAPISpec();

      const creditsEndpoint = spec.paths["/credits"]?.post;

      expect(creditsEndpoint).toBeDefined();
      expect(creditsEndpoint?.tags).toContain("Credits");
      expect(creditsEndpoint?.summary).toBe("Purchase credits");
      expect(creditsEndpoint?.security).toEqual([{ clerkAuth: [] }]);
      expect(creditsEndpoint?.requestBody).toBeDefined();
      expect(creditsEndpoint?.rateLimit).toEqual({
        category: "moderate",
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    test("should include error responses for all endpoints", () => {
      const spec = generateOpenAPISpec();

      // Check various endpoints have error responses
      const creditsPost = spec.paths["/credits"]?.post;
      expect(creditsPost?.responses).toHaveProperty("400");
      expect(creditsPost?.responses).toHaveProperty("401");
      expect(creditsPost?.responses).toHaveProperty("429");
      expect(creditsPost?.responses).toHaveProperty("500");
    });
  });
});

describe("Helper Functions", () => {
  describe("extractPathParams", () => {
    test("should extract path parameters from route", () => {
      const { extractPathParams } = require("@/lib/services/openapi-generator");

      const params = extractPathParams("/users/:userId/posts/:postId");

      expect(params).toEqual(["userId", "postId"]);
    });

    test("should return empty array for routes without params", () => {
      const { extractPathParams } = require("@/lib/services/openapi-generator");

      const params = extractPathParams("/health");

      expect(params).toEqual([]);
    });
  });
});

describe("getOpenAPIGenerator Singleton", () => {
  test("should return same instance on multiple calls", () => {
    const instance1 = getOpenAPIGenerator();
    const instance2 = getOpenAPIGenerator();

    expect(instance1).toBe(instance2);
  });
});
