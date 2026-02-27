# API Routes Architecture

> **Comprehensive guide to The Architect Platform's API layer**

## Overview

The Architect Platform implements a **unified RESTful API** using Next.js 15 App Router. All 92 API endpoints follow consistent patterns for authentication, rate limiting, error handling, and response formatting.

## Architecture Principles

### 1. Service Layer Pattern

All business logic is isolated in `lib/services/`. API routes are thin wrappers that:
- Validate authentication
- Apply rate limiting
- Delegate to services
- Format responses

**Rule**: Zero business logic in route handlers.

### 2. APIRouteHandler Factory

All routes use the `APIRouteHandler` factory for consistent behavior:

```typescript
// GET handler example
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async ({ context, user }) => {
    const data = await someService.getData(user.id);
    return { data };
  },
});

// POST handler example
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  schema: mySchema,
  rateLimiter: RateLimiters.moderate(),
  handler: async ({ context, user, body }) => {
    const result = await someService.create(body);
    return { data: result };
  },
});
```

### 3. Route Categories

| Directory | Count | Purpose | Example |
|-----------|-------|---------|---------|
| `/api/blueprints/*` | 12 | Blueprint management | Create, read, update, delete, versions |
| `/api/projects/*` | 8 | Project operations | CRUD, templates, cloning |
| `/api/credits/*` | 2 | Credit system | Balance, usage history |
| `/api/subscription/*` | 5 | Billing & plans | Tiers, upgrade, billing history |
| `/api/webhooks/*` | 14 | Webhook management | Configuration, events, retry |
| `/api/performance/*` | 12 | Monitoring & optimization | Metrics, cache, deployments |
| `/api/teams/*` | 6 | Team collaboration | Members, projects, usage |
| `/api/deploy/*` | 7 | GitHub deployment | Deploy, rollback, promote |
| `/api/user/*` | 4 | User settings | Preferences, notifications |
| `/api/enterprise/*` | 5 | Enterprise features | Themes, analytics |
| `/api/activity/*` | 2 | User activity | Feed, summary |
| `/api/ai/*` | 1 | AI services | Test generation |
| `/api/notifications/*` | 4 | Notification system | Read, preferences |
| `/api/cache/*` | 2 | Cache management | Metrics, enhanced metrics |
| `/api/circuit-breakers/*` | 2 | Circuit breaker control | Metrics, reset |
| `/api/health` | 1 | System health check | Status endpoint |
| `/api/metrics` | 1 | Performance metrics | System metrics |
| `/api/validate` | 1 | Request validation | Input validation |
| `/api/stripe/*` | 1 | Payment webhooks | Stripe integration |
| `/api/openapi/*` | 2 | API documentation | OpenAPI spec |

**Total**: 93 API routes across 20 functional domains

## Authentication

### Default Behavior

By default, all routes require authentication:

```typescript
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true, // Default - authentication required
  handler: async ({ context, user }) => {
    // user.id is guaranteed to be present
  },
});
```

### Public Endpoints

Explicitly mark public endpoints:

```typescript
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: false, // Public endpoint
  rateLimiter: RateLimiters.permissive(),
  handler: async ({ context }) => {
    // No user context available
  },
});
```

### Authentication Flow

1. **Middleware** (`middleware.ts`) validates Clerk session
2. **APIRouteHandler** extracts user context from session
3. **Services** receive `userId` for data access control
4. **Row Level Security** (RLS) policies enforce at database level

## Rate Limiting

### Rate Limiter Categories

```typescript
// Rate limiters by sensitivity
RateLimiters.strict()     // 3 req/min - AI generation, deployment
RateLimiters.moderate()   // 10 req/min - Write operations
RateLimiters.standard()   // 30 req/min - Read operations
RateLimiters.permissive() // 60 req/min - Public endpoints
RateLimiters.webhook()    // 100 req/min - Incoming webhooks
```

### Configuration

```typescript
export const POST = APIRouteHandler.createPOSTHandler({
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context }) => {
    // Rate limit applied automatically
  },
});
```

Rate limits include headers in responses:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Request Validation

### Zod Schema Validation

POST and PUT handlers support automatic body validation:

```typescript
import { z } from 'zod';

const blueprintSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  features: z.array(z.string()).optional(),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: blueprintSchema,
  handler: async ({ body }) => {
    // body is typed and validated
    // TypeScript knows: body.name, body.description, body.features
  },
});
```

Validation errors return 400 with structured error:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Required" }
  ]
}
```

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": { /* route-specific data */ },
  "message": "Optional success message"
}
```

### Error Response

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional error details (dev only)"
}
```

### Custom Status Codes

Throw specific errors for appropriate status codes:

```typescript
throw new ValidationError("Invalid input"); // 400
throw new AuthenticationError("Unauthorized"); // 401
throw new AuthorizationError("Forbidden"); // 403
throw new NotFoundError("Resource not found"); // 404
throw new RateLimitError("Too many requests"); // 429
throw new DatabaseError("Database error"); // 500
```

## Dynamic Routes

### Pattern: `/api/resource/[id]/`

Dynamic routes with parameters use manual export pattern:

```typescript
// app/api/blueprints/[id]/route.ts
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    handler: async ({ context, user }) => {
      const blueprint = await blueprintService.getById(id, user.id);
      return { data: blueprint };
    },
  })(req);
}
```

### Nested Dynamic Routes

For deeply nested resources:

```typescript
// /api/blueprints/[id]/versions/[versionId]/route.ts
interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id, versionId } = await params;
  // Handle nested resource access
}
```

## Error Handling

### Service Layer Errors

Services throw typed errors:

```typescript
// In service
if (!blueprint) {
  throw new NotFoundError(`Blueprint ${id} not found`);
}

if (blueprint.userId !== userId) {
  throw new AuthorizationError("Access denied");
}
```

APIRouteHandler catches and formats errors automatically.

### Logging

All errors are logged with context:

```typescript
logger.apiError(
  "Blueprint fetch failed",
  requestId,
  error,
  { blueprintId: id, userId: user.id }
);
```

### User Action Logging

Log significant user actions:

```typescript
logger.userAction(
  "blueprint_created",
  user.id,
  { blueprintId: result.id, name: body.name }
);
```

## Caching

### Cached GET Handlers

For cacheable endpoints:

```typescript
export const GET = APIRouteHandler.createCachedGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async ({ context, user }) => {
    return { data: await getCachedData(user.id) };
  },
}, {
  ttl: 60, // 60 seconds
  tags: ["resource-tag"],
});
```

Cache headers added automatically:
- `Cache-Control`: Max-age directive
- `ETag`: Content-based tag
- `Last-Modified`: Timestamp

### Simple Cached Handlers

For public cacheable data:

```typescript
export const GET = APIRouteHandler.createSimpleCachedGETHandler({
  requireAuth: false,
  handler: async () => {
    return { data: await getPublicData() };
  },
}, {
  ttl: 300, // 5 minutes
  tags: ["public-data"],
});
```

## Testing

### Test Pattern

```typescript
// __tests__/api/blueprints.test.ts
describe("Blueprints API", () => {
  it("should create blueprint", async () => {
    const response = await fetch("/api/blueprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Blueprint",
        description: "Test description",
      }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Test Blueprint");
  });
});
```

### Mock Pattern

```typescript
// Mock service layer
jest.mock("@/lib/services/blueprint-service", () => ({
  blueprintService: {
    create: jest.fn().mockResolvedValue({
      id: "123",
      name: "Test",
    }),
  },
}));
```

## Security Best Practices

### 1. Always Validate Authentication

```typescript
// ❌ Never
export const GET = async () => {
  const userId = getUserIdFromSomewhere(); // Insecure
};

// ✅ Always
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  handler: async ({ user }) => {
    const userId = user.id; // Secure, from verified session
  },
});
```

### 2. Always Use Rate Limiting

```typescript
// ❌ Never
export const POST = APIRouteHandler.createPOSTHandler({
  handler: async () => { /* no rate limit */ },
});

// ✅ Always
export const POST = APIRouteHandler.createPOSTHandler({
  rateLimiter: RateLimiters.moderate(),
  handler: async () => { /* rate limited */ },
});
```

### 3. Validate All Inputs

```typescript
// ❌ Never
export const POST = APIRouteHandler.createPOSTHandler({
  handler: async ({ body }) => {
    const name = body.name; // No validation
  },
});

// ✅ Always
const schema = z.object({ name: z.string().min(1) });

export const POST = APIRouteHandler.createPOSTHandler({
  schema,
  handler: async ({ body }) => {
    const name = body.name; // Validated and typed
  },
});
```

### 4. Use Row Level Security

All database queries must respect RLS policies:

```typescript
// Service layer
async getById(id: string, userId: string) {
  return db.query.blueprints.findFirst({
    where: and(
      eq(blueprints.id, id),
      eq(blueprints.userId, userId) // RLS enforcement
    ),
  });
}
```

## Adding New Routes

### 1. Create Route File

```typescript
// app/api/my-resource/route.ts
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { myService } from "@/lib/services/my-service";

export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async ({ context, user }) => {
    const data = await myService.list(user.id);
    return { data };
  },
});

export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  schema: mySchema,
  rateLimiter: RateLimiters.moderate(),
  handler: async ({ context, user, body }) => {
    const result = await myService.create(body, user.id);
    return { data: result, message: "Created successfully" };
  },
});
```

### 2. Add Tests

```typescript
// __tests__/api/my-resource.test.ts
describe("My Resource API", () => {
  it("should list resources", async () => {
    // Test implementation
  });

  it("should create resource", async () => {
    // Test implementation
  });
});
```

### 3. Update Documentation

Add to `/docs/API.md` and update this README if introducing new patterns.

## Conventions

### Naming

- **Files**: `kebab-case.ts` (e.g., `route.ts`, `my-resource/route.ts`)
- **Exports**: `GET`, `POST`, `PUT`, `DELETE` (uppercase HTTP methods)
- **Schemas**: `{resource}Schema` (e.g., `blueprintSchema`)
- **Services**: Descriptive names (e.g., `getBlueprintById`, `createProject`)

### Structure

```
app/api/
├── resource/           # Resource collection
│   ├── route.ts       # GET list, POST create
│   └── [id]/          # Individual resource
│       ├── route.ts   # GET, PUT, DELETE
│       └── sub-resource/  # Nested resources
├── other-resource/
└── README.md          # This file
```

## References

- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [APIRouteHandler Implementation](../lib/services/api-route-handler.ts)
- [Rate Limit Configuration](../lib/rate-limit-config.ts)
- [Service Types](../lib/services/service-types.ts)
- [Main API Documentation](../../docs/API.md)

---

**Last Updated**: 2026-02-27  
**Route Count**: 93 endpoints  
**Route Count**: 92 endpoints  
**Coverage**: 100% authenticated, 100% rate limited
