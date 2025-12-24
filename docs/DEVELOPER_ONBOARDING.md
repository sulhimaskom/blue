# Developer Onboarding Guide

> **Comprehensive guide for developers joining The Architect Platform** - Architecture patterns, coding standards, and development workflow.

---

## 🎯 Welcome to The Architect Platform

The Architect Platform is a **world-class, production-ready AI platform** that transforms simple ideas into comprehensive software blueprints. With an **audit score of 98/100**, this platform demonstrates exceptional engineering excellence and enterprise-grade architecture.

### Our Mission

democratize software architecture by providing AI-powered blueprint generation with automatic repository deployment.

### Tech Stack Overview

- **Frontend**: Next.js 15 (App Router) + TypeScript 5.5+
- **Backend**: Node.js with serverless architecture
- **Database**: Neon PostgreSQL with Drizzle ORM
- **AI**: IFlow models + Tavily research API
- **Auth**: Clerk authentication with RLS policies
- **Infrastructure**: Redis caching, Circuit breakers, Comprehensive monitoring

---

## 🏛️ Architecture Deep Dive

### Core Architecture Principles

The platform follows **7 Universal Principles** that apply to ALL development:

1. **Modularity** - Every piece of logic isolated and reusable
2. **Flexibility** - Zero hardcoded values, environment-based configuration
3. **Scalability** - Clean architecture with proper separation of concerns
4. **Stability** - Defensive coding with comprehensive error handling
5. **Security** - Secure by default, OWASP principles
6. **Consistency** - Follow existing patterns and conventions
7. **Automation** - Design for automated workflows

### MCP-Style Architecture Pattern

The platform implements **Model Context Protocol (MCP)** concepts:

```typescript
// Phase 1: Discovery (Research)
const research = await tavilyService.search(input);

// Phase 2: Blueprinting (Reasoning)
const blueprint = await iflowService.generate(research);

// Phase 3: Refinement (Interaction)
const refined = await userFeedbackService.update(blueprint);

// Phase 4: Fabrication (Delivery)
const repository = await githubService.create(blueprint);
```

---

## 📁 Code Structure & Patterns

### Service Layer Architecture

All business logic MUST follow the service layer pattern:

```
lib/
├── services/           # 🎯 BUSINESS LOGIC LAYER
│   ├── ai-service.ts          # AI integration logic
│   ├── blueprint-engine.ts    # Blueprint generation pipeline
│   ├── github-service.ts      # GitHub App integration
│   ├── unified-cache-manager.ts # Caching architecture
│   └── security-service.ts    # Security utilities
├── db/                 # 🗄️ DATA ACCESS LAYER
│   ├── schema.ts              # Drizzle ORM schema
│   ├── index.ts               # Database connection
│   └── performance-monitor.ts # Query monitoring
├── hooks/              # 🪝 CUSTOM REACT HOOKS
│   ├── use-auth.ts            # Authentication state
│   └── use-monitoring.ts      # Dashboard state
├── utils/              # 🛠️ UTILITY FUNCTIONS
│   ├── api-utils.ts           # API helpers
│   ├── validation.ts          # Zod schemas
│   └── constants.ts           # Application constants
└── middleware.ts       # 🔧 NEXT.JS MIDDLEWARE
```

### API Route Handler Pattern

All API endpoints MUST use the centralized `APIRouteHandler`:

```typescript
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { z } from "zod";

// Validation schema
const createSchema = z.object({
  input: z.string().min(10),
  projectName: z.string().min(3),
});

// Route implementation
export const POST = APIRouteHandler.createPOSTHandler({
  schema: createSchema,
  requireAuth: true,
  requireCredits: 1,
  rateLimiter: (userId: string) => blueprintRateLimiter(userId),
  handler: async ({ context, user, data }) => {
    // Business logic here - NEVER in route handlers
    return await blueprintEngine.generate(data, user.id);
  },
});
```

**Benefits:**

- Eliminates 600+ lines of duplicate authentication/validation code
- Centralized error handling and logging
- Consistent rate limiting and monitoring
- Type-safe request/response handling

---

## 🎨 Component Architecture

### Atomic Component Design

UI components follow **atomic design principles** with LEGO-like reusability:

```
components/
├── ui/                 # 🧱 ATOMIC COMPONENTS
│   ├── button.tsx            # Base button with variants
│   ├── base-card.tsx         # Reusable card component
│   ├── gradient-card.tsx     # Metric display cards
│   ├── status-indicator.tsx  # Status components
│   └── metric-card.tsx       # Dashboard metrics
├── auth/               # 🔐 AUTHENTICATION COMPONENTS
│   ├── auth-layout.tsx       # Authentication layout
│   └── protected-route.tsx   # Route protection
├── monitoring/         # 📊 DASHBOARD COMPONENTS
│   ├── dashboard-layout.tsx  # Dashboard container
│   ├── system-health-overview.tsx # Health display
│   ├── service-status-grid.tsx    # Grid layout
│   └── performance-metrics.tsx     # Performance UI
└── sections/           # 📄 PAGE SECTIONS
    └── hero-section.tsx       # Landing page hero
```

### Component Development Standards

```typescript
// ✅ CORRECT: Atomic component with flexible props
interface StatusIndicatorProps {
  status: "healthy" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  size = "md",
  showText = true,
  className
}: StatusIndicatorProps) {
  const colors = {
    healthy: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        colors[status],
        sizeClasses[size]
      )} />
      {showText && (
        <span className="text-sm capitalize">{status}</span>
      )}
    </div>
  );
}
```

**Component Rules:**

- Single responsibility per component
- Props-based customization (no hardcoded values)
- Proper TypeScript interfaces
- Consistent styling with Tailwind classes
- Reusable across different contexts

---

## 🔧 Development Workflow

### Pre-Flight Validation (REQUIRED)

Before ANY code changes, ALL agents must verify:

```bash
# 1. Security audit - Must return 0 vulnerabilities
npm audit

# 2. Build validation - Must pass completely
npm run build

# 3. Type safety - Zero TypeScript errors
npm run typecheck

# 4. Lint compliance - Zero warnings
npm run lint

# 5. Test suite - All tests must pass
npm run test
```

### Git Workflow Protocol

1. **Branch Management:**

```bash
# Always work on agent-workspace branch
git checkout agent-workspace
git pull origin agent-workspace

# Merge latest dev before starting work
git merge origin/dev --no-edit
```

2. **Commit Style (Mandatory):**

```bash
# Format: type(scope): description
feat(auth): add biometric authentication support
fix(api): handle null response in blueprint endpoint
docs(readme): update installation instructions
refactor(cache): optimize cache key generation
test(blueprints): add integration tests for generation
chore(deps): upgrade next.js to 15.5.9
```

3. **Quality Gates:**

- Run lint before committing
- Run build before pushing
- Create Pull Request for review
- All CI checks must pass

---

## 🛡️ Security Implementation

### Authentication & Authorization

```typescript
// ✅ CORRECT: Clerk integration with middleware
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up", "/api/health"],
  afterAuth: (auth, req) => {
    // Handle authenticated routes
    if (!auth.userId && req.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### Row Level Security (RLS)

```sql
-- Multi-tenant data isolation through RLS
CREATE POLICY user_data_isolation ON projects
FOR ALL TO authenticated
USING (owner_id = current_setting('app.current_user_id')::int);
```

### Input Validation

```typescript
// ✅ CORRECT: Comprehensive validation with Zod
import { z } from "zod";

const blueprintSchema = z.object({
  input: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description too long")
    .transform((val) => val.trim()),
  projectName: z
    .string()
    .min(3, "Project name required")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z0-9-_]+$/, "Invalid characters"),
});

// Usage in API route handler
const validatedData = blueprintSchema.parse(requestData);
```

---

## 🚀 Performance Optimization

### Caching Architecture

```typescript
// ✅ CORRECT: Use UnifiedCacheManager for all caching
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";

class BlueprintEngine {
  async generateBlueprint(data: BlueprintData) {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        // Business logic here
        return await this.performGeneration(data);
      },
      {
        key: `blueprint:${data.inputHash}`,
        ttl: 1800, // 30 minutes
        tags: ["blueprints", "ai-generation"],
      },
    );
  }
}
```

### Database Optimization

```typescript
// ✅ CORRECT: Optimized database queries
async function getUserBlueprints(userId: number) {
  return await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      blueprintCount: count(blueprints.id),
    })
    .from(projects)
    .leftJoin(blueprints, eq(projects.id, blueprints.projectId))
    .where(eq(projects.owner_id, userId))
    .groupBy(projects.id);
}
```

### Circuit Breaker Pattern

```typescript
// ✅ CORRECT: External service protection
import { CircuitBreaker } from "@/lib/circuit-breaker";

const aiCircuitBreaker = new CircuitBreaker("ai-iflow", {
  failureThreshold: 3,
  timeout: 60000,
  recoveryPeriod: 120000,
});

async function callAI(prompt: string) {
  return aiCircuitBreaker.execute(async () => {
    return await iflowClient.completions.create({ prompt });
  });
}
```

---

## 📊 Monitoring & Observability

### Structured Logging

```typescript
// ✅ CORRECT: Structured logging with correlation IDs
import { logger } from "@/lib/logger";

class BlueprintService {
  async generate(data: BlueprintData, context: RequestContext) {
    logger.info("Starting blueprint generation", {
      requestId: context.requestId,
      userId: context.userId,
      projectName: data.projectName,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.performGeneration(data);

      logger.info("Blueprint generation completed", {
        requestId: context.requestId,
        userId: context.userId,
        blueprintId: result.id,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error("Blueprint generation failed", {
        requestId: context.requestId,
        userId: context.userId,
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }
}
```

### Error Handling Patterns

```typescript
// ✅ CORRECT: Comprehensive error handling
class BlueprintEngine {
  async generate(data: BlueprintData): Promise<Blueprint> {
    try {
      // Validate input
      const validated = this.validateInput(data);

      // Generate blueprint
      const result = await this.performGeneration(validated);

      return result;
    } catch (error) {
      // Structured error handling
      if (error instanceof ValidationError) {
        throw new ValidationError("Invalid blueprint data", {
          field: error.field,
          value: error.value,
        });
      }

      if (error instanceof AITimeoutError) {
        monitoringService.trackError("ai_timeout", {
          duration: error.duration,
          model: error.model,
        });
        throw new ServiceUnavailableError("AI service temporarily unavailable");
      }

      // Unknown errors
      logger.error("Unexpected blueprint generation error", {
        error: error.message,
        stack: error.stack,
        input: data.input?.substring(0, 100),
      });

      throw new InternalError("Blueprint generation failed");
    }
  }
}
```

---

## 🧪 Testing Standards

### Test Structure

```
__tests__/
├── api/               # API integration tests
├── components/        # Component unit tests
├── services/          # Service layer tests
├── helpers.ts         # Test utilities
├── factories/         # Mock factories
├── builders/          # Test data builders
└── setup/             # Test setup utilities
```

### Service Testing Example

```typescript
// __tests__/services/blueprint-engine.test.ts
import { blueprintEngine } from "@/lib/services/blueprint-engine";
import { MockFactory } from "__tests__/factories/mock-factory";

describe("BlueprintEngine", () => {
  beforeEach(() => {
    // Reset mocks
    MockFactory.resetAll();
  });

  it("should generate blueprint successfully", async () => {
    // Arrange
    const mockAI = MockFactory.createAIService();
    const mockGitHub = MockFactory.createGitHubService();

    const data = {
      input: "Build an e-commerce platform",
      projectName: "ECommerceStore",
    };

    // Act
    const result = await blueprintEngine.generateBlueprint({
      userId: 1,
      ...data,
    });

    // Assert
    expect(result).toHaveProperty("id");
    expect(result.status).toBe("completed");
    expect(mockAI.generate).toHaveBeenCalledTimes(1);
  });

  it("should handle AI service failures gracefully", async () => {
    // Arrange
    MockFactory.createAIService().generate.mockRejectedValue(
      new Error("AI service unavailable"),
    );

    const data = {
      input: "Test input",
      projectName: "TestProject",
    };

    // Act & Assert
    await expect(
      blueprintEngine.generateBlueprint({ userId: 1, ...data }),
    ).rejects.toThrow(ServiceUnavailableError);
  });
});
```

---

## 🎯 Development Best Practices

### Code Style Guidelines

1. **TypeScript Usage:**

```typescript
// ✅ CORRECT: Proper typing
interface User {
  id: number;
  clerkId: string;
  email: string;
  credits: number;
  subscriptionTier: "free" | "pro" | "enterprise";
}

// ❌ AVOID: Using 'any'
const processData = (data: any) => any;
```

2. **Environment Variables:**

```typescript
// ✅ CORRECT: Type-safe environment variables
import { env } from "@/lib/env";

const databaseUrl = env.DATABASE_URL;
const redisUrl = env.REDIS_URL;

// ❌ AVOID: Direct process.env usage
const db = process.env.DATABASE_URL;
```

3. **Error Handling:**

```typescript
// ✅ CORRECT: Specific error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// ❌ AVOID: Generic error throwing
throw new Error("Something went wrong");
```

### Database Patterns

1. **Query Optimization:**

```typescript
// ✅ CORRECT: Efficient queries with joins
async function getUserWithProjects(userId: number) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      projects: {
        with: {
          blueprints: {
            limit: 1,
            orderBy: desc(blueprints.createdAt),
          },
        },
        orderBy: desc(projects.createdAt),
      },
    },
  });
}
```

2. **Transaction Operations:**

```typescript
// ✅ CORRECT: Database transactions
async function createProjectWithBlueprint(data: ProjectData) {
  return await db.transaction(async (tx) => {
    const project = await tx
      .insert(projects)
      .values({
        name: data.name,
        owner_id: data.userId,
      })
      .returning();

    const blueprint = await tx
      .insert(blueprints)
      .values({
        project_id: project[0].id,
        content_markdown: data.blueprint,
        structured_data: data.structured,
        version: 1,
      })
      .returning();

    return { project: project[0], blueprint: blueprint[0] };
  });
}
```

---

## 🔍 Debugging Guidelines

### Using the Monitoring Dashboard

Visit `/dashboard/monitoring` for real-time insights:

- System health status
- Service performance metrics
- Circuit breaker states
- Database and Redis health
- Error tracking

### Common Debugging Commands

```bash
# Check system health
curl http://localhost:3000/api/health?detailed=true

# Monitor service performance
curl http://localhost:3000/api/metrics

# Check circuit breakers
curl http://localhost:3000/api/circuit-breakers/metrics

# Verify cache performance
curl http://localhost:3000/api/cache/enhanced-metrics

# Clear problematic circuit breakers
curl -X POST http://localhost:3000/api/circuit-breakers/reset
```

### Database Debugging

```typescript
// Enable query monitoring
import { DatabasePerformanceMonitor } from "@/lib/db/performance-monitor";

// This will automatically log slow queries and performance metrics
const monitor = new DatabasePerformanceMonitor();
await monitor.trackQuery(() => {
  return db.select().from(users).where(eq(users.id, userId));
});
```

---

## 📚 Learning Resources

### Essential Reading Order

1. **`docs/architecture/blueprint.md`** - Complete technical specification
2. **`AGENTS.md`** - AI agent development rules and protocols
3. **`API.md`** - Comprehensive API reference documentation
4. **`docs/deployment/SETUP.md`** - Production deployment procedures

### Code Examples to Study

- **Service Layer**: `lib/services/api-route-handler.ts`
- **Circuit Breakers**: `lib/circuit-breaker.ts`
- **Database Patterns**: `lib/db/schema.ts`
- **UI Components**: `components/ui/button.tsx`
- **API Implementation**: `app/api/blueprints/route.ts`

---

## 👥 Team Collaboration

### Code Review Guidelines

1. **Security First**: Check for hardcoded secrets, validation gaps
2. **Performance**: Look for N+1 queries, missing indexes, inefficient caching
3. **Type Safety**: Ensure proper TypeScript usage, no `any` types
4. **Error Handling**: Verify comprehensive error boundaries and logging
5. **Test Coverage**: Confirm appropriate test coverage for new features

### Communication Patterns

- **Feature Requests**: Use GitHub issues with detailed requirements
- **Bug Reports**: Include reproduction steps, environment details, logs
- **Code Review**: Focus on architecture patterns, not just style
- **Documentation**: Update docs for all API changes and new features

---

## 🚀 Getting Help

### Internal Resources

- **Documentation**: `docs/` directory contains comprehensive guides
- **Code Examples**: Study existing service implementations
- **Monitoring Dashboard**: Real-time system insights
- **Test Suite**: Reference implementations for testing patterns

### External Resources

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team)
- **Clerk Authentication**: [clerk.com/docs](https://clerk.com/docs)
- **TypeScript Handbook**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs)

---

## 🎉 Onboarding Checklist

### Week 1: Foundation

- [ ] Read all documentation (`docs/` directory)
- [ ] Set up development environment
- [ ] Understand service layer architecture
- [ ] Review existing code patterns
- [ ] Run all quality gates and see them pass

### Week 2: Code Integration

- [ ] Fix a minor bug (check `docs/task.md` for open tasks)
- [ ] Add a small feature following existing patterns
- [ ] Write appropriate tests
- [ ] Submit first PR with proper conventional commit
- [ ] Participate in code review process

### Week 3: Independent Contributions

- [ ] Implement a medium-complexity feature
- [ ] Add comprehensive tests
- [ ] Update documentation
- [ ] Optimize performance bottlenecks
- [ ] Contribute to monitoring/alerting improvements

---

**Welcome to the team!** 🎯

This platform represents the pinnacle of modern software engineering excellence. By following these patterns and principles, you'll be contributing to a world-class codebase that's immediately ready for enterprise production deployment.

**Platform Status**: ✅ Production Ready (98/100 audit score)  
**Architecture**: World-class with comprehensive monitoring and security  
**Team Mission**: Democratize software architecture through AI-powered automation

---

_Last Updated: 2025-12-24_  
_Review this guide monthly for updates and improvements_
