/**
 * OpenAPI Specification Generator
 *
 * Automatically generates OpenAPI 3.0.3 specifications from API routes
 * Provides machine-readable API documentation for:
 * - Swagger UI integration
 * - Automated client SDK generation
 * - External developer onboarding
 *
 * Integration Engineering Best Practices:
 * - Contract First: API specs generated from actual implementation
 * - Self-Documenting: Zod schemas define request/response models
 * - Consistency: Unified format across all endpoints
 */

import { z } from "zod";
import { logger } from "@/lib/logger";
import { ServiceError } from "@/lib/services/service-error-handler";
import { EnvironmentError } from "@/lib/env";
import { zodToJsonSchema } from "zod-to-json-schema";

// =============================================================================
// OPENAPI SPECIFICATION STRUCTURE
// =============================================================================

export interface OpenAPISpec {
  openapi: "3.0.3";
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  security: Array<{
    [key: string]: string[];
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, SecurityScheme>;
    responses?: Record<string, ResponseObject>;
  };
}

export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
}

export interface OperationObject {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: Array<{ [key: string]: string[] }>;
  rateLimit?: {
    category: string;
    maxRequests: number;
    windowMs: number;
  };
}

export interface ParameterObject {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema: any;
  example?: any;
}

export interface RequestBodyObject {
  description?: string;
  required: boolean;
  content: Record<string, MediaObject>;
}

export interface MediaObject {
  schema: any;
  example?: any;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaObject>;
  headers?: Record<string, any>;
}

export interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "header" | "query" | "cookie";
  scheme?: string;
  bearerFormat?: string;
}

// =============================================================================
// OPENAPI GENERATOR
// =============================================================================

export class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private tagRegistry: Set<string> = new Set();

  constructor(config: { title: string; version: string; baseUrl: string }) {
    this.spec = {
      openapi: "3.0.3",
      info: {
        title: config.title,
        version: config.version,
        description:
          "Architect Platform API - World-class AI-powered software generation platform",
        contact: {
          name: "Architect Platform",
          email: "support@architect.dev",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: config.baseUrl,
          description: "Production API server",
        },
      ],
      security: [
        {
          clerkAuth: ["read", "write"],
        },
      ],
      tags: [],
      paths: {},
      components: {
        schemas: {
          SuccessResponse: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: true,
              },
              data: {
                type: "object",
                description: "Response data varies by endpoint",
              },
              message: {
                type: "string",
                nullable: true,
              },
            },
          },
          ErrorResponse: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: false,
              },
              error: {
                type: "string",
                description: "Human-readable error message",
              },
              details: {
                type: "string",
                nullable: true,
                description: "Additional error details (development only)",
              },
            },
          },
        },
        securitySchemes: {
          clerkAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Clerk JWT authentication token",
          },
        },
        responses: {
          ValidationError: {
            description: "Validation error - invalid request data",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Validation error",
                  details: "Invalid request data provided",
                },
              },
            },
          },
          AuthenticationError: {
            description: "Authentication error - invalid or missing credentials",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Authentication required",
                },
              },
            },
          },
          AuthorizationError: {
            description: "Authorization error - insufficient permissions",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Insufficient permissions",
                },
              },
            },
          },
          NotFoundError: {
            description: "Resource not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Resource not found",
                },
              },
            },
          },
          RateLimitError: {
            description: "Rate limit exceeded - too many requests",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Rate limit exceeded. Try again in 30 seconds.",
                },
              },
            },
            headers: {
              "X-RateLimit-Limit": {
                description: "Maximum requests allowed",
                schema: { type: "integer" },
              },
              "X-RateLimit-Remaining": {
                description: "Requests remaining in window",
                schema: { type: "integer" },
              },
              "X-RateLimit-Reset": {
                description: "Unix timestamp when window resets",
                schema: { type: "integer" },
              },
            },
          },
          DatabaseError: {
            description: "Internal server error - database or service error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  success: false,
                  error: "Internal server error",
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Add a tag to the OpenAPI spec
   */
  addTag(tag: { name: string; description: string }): void {
    if (!this.tagRegistry.has(tag.name)) {
      this.tagRegistry.add(tag.name);
      this.spec.tags.push(tag);
    }
  }

  /**
   * Register a schema for reuse across endpoints
   */
  registerSchema(name: string, zodSchema: z.ZodType<any>): void {
    this.spec.components.schemas[name] = zodToJsonSchema(zodSchema);
  }

  /**
   * Add a GET endpoint to the OpenAPI spec
   */
  addGET(path: string, operation: OperationObject): void {
    this.addPath(path, "get", operation);
  }

  /**
   * Add a POST endpoint to the OpenAPI spec
   */
  addPOST(path: string, operation: OperationObject): void {
    this.addPath(path, "post", operation);
  }

  /**
   * Add a PUT endpoint to the OpenAPI spec
   */
  addPUT(path: string, operation: OperationObject): void {
    this.addPath(path, "put", operation);
  }

  /**
   * Add a DELETE endpoint to the OpenAPI spec
   */
  addDELETE(path: string, operation: OperationObject): void {
    this.addPath(path, "delete", operation);
  }

  /**
   * Add any method endpoint to the OpenAPI spec
   */
  private addPath(path: string, method: string, operation: OperationObject): void {
    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }
    (this.spec.paths[path] as any)[method] = operation;

    // Add tags to spec if not already present
    if (operation.tags) {
      operation.tags.forEach((tag) => {
        if (!this.tagRegistry.has(tag)) {
          this.tagRegistry.add(tag);
          // Tag will be added separately with full description
        }
      });
    }
  }

  /**
   * Convert Zod schema to JSON Schema format
   */
  zodToSchema(zodSchema: z.ZodType<any>): any {
    return zodToJsonSchema(zodSchema);
  }

  /**
   * Add a HEAD endpoint to the OpenAPI spec
   */
  addHEAD(path: string, operation: OperationObject): void {
    this.addPath(path, "head", operation);
  }

  /**
   * Generate the final OpenAPI specification
   */
  generate(): OpenAPISpec {
    // Sort tags alphabetically
    this.spec.tags.sort((a, b) => a.name.localeCompare(b.name));

    // Sort paths alphabetically
    const sortedPaths: Record<string, PathItem> = {};
    Object.keys(this.spec.paths)
      .sort()
      .forEach((key) => {
        sortedPaths[key] = this.spec.paths[key];
      });
    this.spec.paths = sortedPaths;

    return this.spec;
  }

  /**
   * Export as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Export as YAML string (requires js-yaml package)
   */
  toYAML(): string {
    try {
      const yaml = require("js-yaml");
      return yaml.dump(this.generate(), { indent: 2 });
    } catch (error) {
      throw ServiceError.validation(
        "js-yaml package not installed. Install it to export YAML.",
        "OpenAPIGenerator",
        "toYAML",
        { operation: "yaml-export" }
      );
    }
  }
}

// =============================================================================
// RATE LIMIT CATEGORIES
// =============================================================================

export const RATE_LIMIT_DESCRIPTIONS: Record<string, string> = {
  strict:
    "3 requests per minute - Expensive operations (AI generation, deployment)",
  moderate: "10 requests per minute - Write operations that consume resources",
  standard: "30 requests per minute - Read operations with caching",
  permissive: "60 requests per minute - Public endpoints",
  webhook: "100 requests per minute - Incoming webhook processing",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create standard 200 OK response for successful requests
 */
export function successResponse(description: string, schema?: any): ResponseObject {
  return {
    description,
    content: schema
      ? {
          "application/json": {
            schema: {
              allOf: [
                { $ref: "#/components/schemas/SuccessResponse" },
                {
                  properties: {
                    data: schema,
                  },
                },
              ],
            },
          },
        }
      : {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/SuccessResponse",
            },
          },
        },
  };
}

/**
 * Create error response for specific error type
 */
export function errorResponse(errorRef: string): ResponseObject {
  return {
    $ref: `#/components/responses/${errorRef}`,
  } as any;
}

/**
 * Extract path parameters from a route path
 */
export function extractPathParams(path: string): string[] {
  return path.match(/:\w+/g)?.map((p) => p.substring(1)) || [];
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let openAPIGeneratorInstance: OpenAPIGenerator | null = null;

export function getOpenAPIGenerator(): OpenAPIGenerator {
  if (!openAPIGeneratorInstance) {
    const { env } = require("@/lib/env");

    // Validate NEXT_PUBLIC_APP_URL - throw error in production if not configured
    if (!env.NEXT_PUBLIC_APP_URL) {
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        throw new EnvironmentError(
          "NEXT_PUBLIC_APP_URL is not configured. Please set this environment variable in production."
        );
      }
      // In development/test, use localhost but log warning
      logger.warn("NEXT_PUBLIC_APP_URL not configured, using localhost for development");
    }

    openAPIGeneratorInstance = new OpenAPIGenerator({
      title: "Architect Platform API",
      version: env.NPM_PACKAGE_VERSION || "1.0.0",
      baseUrl: env.NEXT_PUBLIC_APP_URL,
    });
  }
  return openAPIGeneratorInstance;
}
