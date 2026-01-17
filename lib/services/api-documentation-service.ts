/**
 * API Documentation Service
 *
 * Registers all API endpoints with OpenAPI specification generator
 * Provides centralized documentation for the entire API surface
 *
 * Integration Engineering Best Practices:
 * - Single Source of Truth: All API specs defined here
 * - Self-Documenting: Uses Zod schemas for type safety
 * - Consistent Format: Uniform documentation across all endpoints
 */

import {
  getOpenAPIGenerator,
  successResponse,
  errorResponse,
} from "./openapi-generator";
import { z } from "zod";

// =============================================================================
// INITIALIZATION
// =============================================================================

const generator = getOpenAPIGenerator();

// =============================================================================
// TAG DEFINITIONS
// =============================================================================

generator.addTag({
  name: "Health",
  description: "System health and status monitoring endpoints",
});

generator.addTag({
  name: "Authentication",
  description: "User authentication and session management",
});

generator.addTag({
  name: "Credits",
  description: "Credit management, purchase, and transaction history",
});

generator.addTag({
  name: "Projects",
  description: "Project management operations",
});

generator.addTag({
  name: "Blueprints",
  description: "AI-powered blueprint generation and management",
});

generator.addTag({
  name: "Teams",
  description: "Team collaboration and member management",
});

generator.addTag({
  name: "Webhooks",
  description: "Webhook configuration and management",
});

generator.addTag({
  name: "Subscriptions",
  description: "Subscription tier management and billing",
});

generator.addTag({
  name: "Performance",
  description: "System performance metrics and monitoring",
});

generator.addTag({
  name: "Deployments",
  description: "Project deployment to GitHub repositories",
});

generator.addTag({
  name: "Notifications",
  description: "User notification management",
});

generator.addTag({
  name: "Cache",
  description: "Cache performance and metrics",
});

generator.addTag({
  name: "Circuit Breakers",
  description: "Circuit breaker status and management",
});

// =============================================================================
// SCHEMA REGISTRATIONS
// =============================================================================

// Health Check Response
generator.registerSchema(
  "HealthCheckResponse",
  z.object({
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    timestamp: z.string(),
    uptime: z.number(),
    version: z.string(),
    environment: z.string(),
    checks: z.array(
      z.object({
        service: z.string(),
        status: z.enum(["healthy", "degraded", "unhealthy"]),
        error: z.string().optional(),
      }),
    ),
  }),
);

// Credit Purchase Request
generator.registerSchema(
  "CreditPurchaseRequest",
  z.object({
    amount: z.number().int().min(100).max(100000),
    paymentMethodId: z.string(),
    confirmImmediate: z.boolean().optional(),
  }),
);

// Credit Purchase Response
generator.registerSchema(
  "CreditPurchaseResponse",
  z.object({
    transactionId: z.string(),
    creditsAdded: z.number().int(),
    totalCredits: z.number().int(),
    amount: z.number(),
    subscriptionTier: z.string(),
    paymentId: z.string(),
    stripeClientSecret: z.string().optional(),
    paymentStatus: z.string().optional(),
    requiresAction: z.boolean().optional(),
    publishableKey: z.string().optional(),
    message: z.string(),
  }),
);

// Credits Info Response
generator.registerSchema(
  "CreditsInfoResponse",
  z.object({
    credits: z.number().int(),
    subscriptionTier: z.string(),
    transactions: z.array(
      z.object({
        id: z.string(),
        amount: z.number(),
        creditsAdded: z.number().int(),
        createdAt: z.string(),
        paymentId: z.string().optional(),
      }),
    ),
    pricing: z.object({
      creditValue: z.string(),
      packages: z.array(
        z.object({
          name: z.string(),
          amount: z.number(),
          credits: z.number().int(),
          popular: z.boolean().optional(),
        }),
      ),
    }),
    stripeConfig: z.object({
      configured: z.boolean(),
      publishableKey: z.string().nullable(),
    }),
  }),
);

// Project Schema
generator.registerSchema(
  "Project",
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    repoUrl: z.string().optional(),
    ownerId: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

// Blueprint Schema
generator.registerSchema(
  "Blueprint",
  z.object({
    id: z.string(),
    projectId: z.string(),
    version: z.number().int(),
    name: z.string(),
    content: z.string(),
    status: z.enum(["generating", "completed", "failed"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

// Team Schema
generator.registerSchema(
  "Team",
  z.object({
    id: z.string(),
    name: z.string(),
    ownerId: z.number().int(),
    memberCount: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

// Webhook Configuration Schema
generator.registerSchema(
  "WebhookConfiguration",
  z.object({
    id: z.string(),
    userId: z.number().int(),
    name: z.string(),
    url: z.string(),
    secret: z.string(),
    eventTypes: z.array(z.string()),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

// =============================================================================
// HEALTH ENDPOINTS
// =============================================================================

generator.addGET("/health", {
  tags: ["Health"],
  summary: "Get system health status",
  description:
    "Returns the current health status of the system and all integrated services",
  parameters: [
    {
      name: "detailed",
      in: "query",
      description:
        "Return detailed health information for all services",
      required: false,
      schema: { type: "boolean" },
    },
  ],
  responses: {
    "200": successResponse(
      "Health status retrieved successfully",
      generator.zodToSchema(
        z.object({
          status: z.enum(["healthy", "degraded", "unhealthy"]),
          timestamp: z.string(),
          uptime: z.number(),
          version: z.string(),
          environment: z.string(),
          checks: z.array(
            z.object({
              service: z.string(),
              status: z.enum(["healthy", "degraded", "unhealthy"]),
              error: z.string().optional(),
            }),
          ),
        }),
      ),
    ),
  },
  rateLimit: {
    category: "permissive",
    maxRequests: 60,
    windowMs: 60000,
  },
});

generator.addHEAD("/health", {
  tags: ["Health"],
  summary: "Health check for load balancers",
  description:
    "Minimal health check endpoint for load balancer health probes",
  responses: {
    "200": {
      description: "System is healthy",
    },
    "503": {
      description: "System is unhealthy",
    },
  },
  rateLimit: {
    category: "permissive",
    maxRequests: 60,
    windowMs: 60000,
  },
});

// =============================================================================
// CREDITS ENDPOINTS
// =============================================================================

generator.addPOST("/credits", {
  tags: ["Credits"],
  summary: "Purchase credits",
  description:
    "Initiates a credit purchase using a payment method. Returns a payment intent for client-side confirmation or processes immediately if configured.",
  security: [{ clerkAuth: [] }],
  requestBody: {
    description: "Credit purchase request",
    required: true,
    content: {
      "application/json": {
        schema: generator.zodToSchema(
          z.object({
            amount: z.number().int().min(100).max(100000),
            paymentMethodId: z.string(),
            confirmImmediate: z.boolean().optional(),
          }),
        ),
      },
    },
  },
  responses: {
    "200": successResponse(
      "Credits purchased successfully",
      generator.zodToSchema(
        z.object({
          transactionId: z.string(),
          creditsAdded: z.number().int(),
          totalCredits: z.number().int(),
          amount: z.number(),
          subscriptionTier: z.string(),
          paymentId: z.string(),
          stripeClientSecret: z.string().optional(),
          paymentStatus: z.string().optional(),
          requiresAction: z.boolean().optional(),
          publishableKey: z.string().optional(),
          message: z.string(),
        }),
      ),
    ),
    "400": errorResponse("ValidationError"),
    "401": errorResponse("AuthenticationError"),
    "429": errorResponse("RateLimitError"),
    "500": errorResponse("DatabaseError"),
  },
  rateLimit: {
    category: "moderate",
    maxRequests: 10,
    windowMs: 60000,
  },
});

generator.addGET("/credits", {
  tags: ["Credits"],
  summary: "Get user credits and transactions",
  description:
    "Returns current credit balance, subscription tier, and transaction history",
  security: [{ clerkAuth: [] }],
  responses: {
    "200": successResponse(
      "Credits information retrieved successfully",
      generator.zodToSchema(
        z.object({
          credits: z.number().int(),
          subscriptionTier: z.string(),
          transactions: z.array(
            z.object({
              id: z.string(),
              amount: z.number(),
              creditsAdded: z.number().int(),
              createdAt: z.string(),
              paymentId: z.string().optional(),
            }),
          ),
          pricing: z.object({
            creditValue: z.string(),
            packages: z.array(
              z.object({
                name: z.string(),
                amount: z.number(),
                credits: z.number().int(),
                popular: z.boolean().optional(),
              }),
            ),
          }),
          stripeConfig: z.object({
            configured: z.boolean(),
            publishableKey: z.string().nullable(),
          }),
        }),
      ),
    ),
    "401": errorResponse("AuthenticationError"),
    "429": errorResponse("RateLimitError"),
  },
  rateLimit: {
    category: "standard",
    maxRequests: 30,
    windowMs: 60000,
  },
});

generator.addGET("/credits/usage", {
  tags: ["Credits"],
  summary: "Get credit usage analytics",
  description:
    "Returns detailed analytics of credit usage including trends, averages, and patterns",
  security: [{ clerkAuth: [] }],
  parameters: [
    {
      name: "days",
      in: "query",
      description: "Number of days to analyze (default: 30)",
      required: false,
      schema: { type: "integer", default: 30, minimum: 1, maximum: 365 },
    },
  ],
  responses: {
    "200": successResponse(
      "Credit usage analytics retrieved successfully",
      generator.zodToSchema(
        z.object({
          totalCreditsUsed: z.number().int(),
          dailyAverage: z.number(),
          highestDailyUsage: z.number().int(),
          lowestDailyUsage: z.number().int(),
          usageByDay: z.array(
            z.object({
              date: z.string(),
              credits: z.number().int(),
            }),
          ),
          usageByFeature: z.array(
            z.object({
              feature: z.string(),
              credits: z.number().int(),
              percentage: z.number(),
            }),
          ),
        }),
      ),
    ),
    "401": errorResponse("AuthenticationError"),
    "429": errorResponse("RateLimitError"),
  },
  rateLimit: {
    category: "standard",
    maxRequests: 30,
    windowMs: 60000,
  },
});

// =============================================================================
// SUBSCRIPTION ENDPOINTS
// =============================================================================

generator.addGET("/subscription/tiers", {
  tags: ["Subscriptions"],
  summary: "Get subscription tier information",
  description:
    "Returns available subscription tiers with their features and pricing",
  responses: {
    "200": successResponse(
      "Subscription tiers retrieved successfully",
      generator.zodToSchema(
        z.object({
          tiers: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              price: z.number(),
              credits: z.number().int(),
              features: z.array(z.string()),
              rateLimitMultiplier: z.number(),
              popular: z.boolean().optional(),
            }),
          ),
          currentTier: z.string().optional(),
          upgradeUrl: z.string().optional(),
        }),
      ),
    ),
    "429": errorResponse("RateLimitError"),
  },
  rateLimit: {
    category: "permissive",
    maxRequests: 60,
    windowMs: 60000,
  },
});

generator.addGET("/subscription/current", {
  tags: ["Subscriptions"],
  summary: "Get current subscription status",
  description:
    "Returns the user's current subscription tier and billing information",
  security: [{ clerkAuth: [] }],
  responses: {
    "200": successResponse(
      "Current subscription retrieved successfully",
      generator.zodToSchema(
        z.object({
          tier: z.string(),
          status: z.enum(["active", "past_due", "canceled", "unpaid"]),
          currentPeriodStart: z.string(),
          currentPeriodEnd: z.string(),
          cancelAtPeriodEnd: z.boolean(),
          features: z.array(z.string()),
          rateLimitMultiplier: z.number(),
        }),
      ),
    ),
    "401": errorResponse("AuthenticationError"),
    "404": errorResponse("NotFoundError"),
    "429": errorResponse("RateLimitError"),
  },
  rateLimit: {
    category: "standard",
    maxRequests: 30,
    windowMs: 60000,
  },
});

generator.addPOST("/subscription/upgrade", {
  tags: ["Subscriptions"],
  summary: "Upgrade subscription tier",
  description:
    "Initiates a subscription upgrade to a higher tier with billing information",
  security: [{ clerkAuth: [] }],
  requestBody: {
    description: "Subscription upgrade request",
    required: true,
    content: {
      "application/json": {
        schema: generator.zodToSchema(
          z.object({
            tier: z.string(),
            billingCycle: z.enum(["monthly", "yearly"]),
          }),
        ),
      },
    },
  },
  responses: {
    "200": successResponse(
      "Subscription upgrade initiated successfully",
      generator.zodToSchema(
        z.object({
          checkoutUrl: z.string(),
          sessionId: z.string(),
        }),
      ),
    ),
    "400": errorResponse("ValidationError"),
    "401": errorResponse("AuthenticationError"),
    "429": errorResponse("RateLimitError"),
    "500": errorResponse("DatabaseError"),
  },
  rateLimit: {
    category: "moderate",
    maxRequests: 10,
    windowMs: 60000,
  },
});

// =============================================================================
// EXPORT SPECIFICATION
// =============================================================================

export function generateAPIDocumentation(): string {
  return generator.toJSON();
}

export function generateOpenAPISpec(): any {
  return generator.generate();
}

export default generator;
