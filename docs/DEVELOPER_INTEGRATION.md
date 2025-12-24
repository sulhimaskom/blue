# Developer Integration Guide

> **Complete Developer Onboarding & Integration Guide for The Architect Platform**  
> **Last Updated**: December 24, 2025  
> **Target Audience**: Developers, Integration Engineers, DevOps Engineers  
> **Prerequisites**: Node.js 20+, Git, Basic TypeScript knowledge

---

## 🚀 Quick Start Integration

### Integration in Under 5 Minutes

**Step 1: Get Your API Credentials**

```bash
# Sign up at https://architect-platform.com
# Navigate to Settings > API Keys
# Copy your Clerk public key and API key
```

**Step 2: Initialize Your Project**

```bash
# Create new project
npx create-next-app@latest my-architect-app --typescript --tailwind --app
cd my-architect-app

# Install SDK
npm install @architect-platform/sdk clerk

# Set environment variables
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here" > .env.local
echo "ARCHITECT_API_KEY=sk_live_your_api_key_here" >> .env.local
```

**Step 3: First Blueprint Generation**

```typescript
// app/page.tsx
import { ArchitectPlatform } from "@architect-platform/sdk";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { getToken } = useAuth();

  const generateBlueprint = async () => {
    const token = await getToken();
    const client = new ArchitectPlatform({ apiKey: token });

    const blueprint = await client.blueprints.generate({
      input: "AI-powered SaaS platform for project management",
      projectName: "ProjectAI",
    });

    console.log("Blueprint generated:", blueprint);
  };

  return (
    <div>
      <h1>Architect Platform Integration</h1>
      <button onClick={generateBlueprint}>
        Generate First Blueprint
      </button>
    </div>
  );
}
```

**Step 4: Run Your App**

```bash
npm run dev
# Visit http://localhost:3000
```

🎉 **Congratulations!** You've successfully integrated The Architect Platform.

---

## 🔧 Complete Integration Setup

### 1. Environment Configuration

**Required Environment Variables:**

```bash
# .env.local
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
CLERK_SECRET_KEY=sk_live_your_secret_key

# Architect Platform
ARCHITECT_API_KEY=sk_live_your_architect_api_key
NEXT_PUBLIC_ARCHITECT_URL=https://api.architect-platform.com

# Optional: Custom Environment
NODE_ENV=development
```

**Production Environment Variables:**

```bash
# Production (.env.production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_prod_your_key
CLERK_SECRET_KEY=sk_prod_your_secret
ARCHITECT_API_KEY=sk_prod_your_api_key
NEXT_PUBLIC_ARCHITECT_URL=https://api.architect-platform.com

# Infrastructure
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://user:pass@host:6379

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn
```

### 2. Client SDK Configuration

**Basic SDK Setup:**

```typescript
// lib/architect.ts
import { ArchitectPlatform } from "@architect-platform/sdk";

// Create singleton instance
const architectClient = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_API_KEY!,
  baseUrl:
    process.env.NEXT_PUBLIC_ARCHITECT_URL ||
    "https://api.architect-platform.com",
  timeout: 120000, // 2 minutes
  retryAttempts: 3,
  retryDelay: 1000,
});

export default architectClient;
```

**Advanced Configuration:**

```typescript
// lib/architect-advanced.ts
import { ArchitectPlatform } from "@architect-platform/sdk";

const architectClient = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_API_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_ARCHITECT_URL,
  timeout: 180000,
  retryAttempts: 5,
  retryDelay: (attempt) => Math.pow(2, attempt) * 1000, // Exponential backoff

  // Caching (Performance optimization)
  enableCache: true,
  cache_ttl: 300000, // 5 minutes
  maxSize: 500,

  // Environment-specific settings
  environment: process.env.NODE_ENV,
  debug: process.env.NODE_ENV === "development",

  // Custom headers
  headers: {
    "User-Agent": "MyApp/1.0",
    "X-Custom-Header": "custom-value",
  },
});

export default architectClient;
```

---

## 🔐 Authentication Integration

### Clerk Authentication Setup

**1. Clerk Provider Setup:**

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{ baseTheme: dark }}
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**2. Authentication Middleware:**

```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  ignoredRoutes: ["/api/webhooks(.*)"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**3. Protected API Routes:**

```typescript
// app/api/blueprints/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import architectClient from "@/lib/architect";

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { input, projectName } = await request.json();

    // Get Clerk session token for API authentication
    const token = await auth().getToken();
    const blueprint = await architectClient.blueprints.generate({
      input,
      projectName,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: blueprint,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Custom Authentication (API Key)

```typescript
// lib/custom-auth.ts
export class CustomAuth {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Verify API key with backend
  async verifyApiKey(): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      return result.valid;
    } catch {
      return false;
    }
  }

  // Get authenticated headers
  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }
}
```

---

## 🏗️ Blueprint Generation Integration

### Basic Blueprint Generation

```typescript
// components/BlueprintGenerator.tsx
"use client";

import { useState } from "react";
import architectClient from "@/lib/architect";

export function BlueprintGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async (input: string, projectName: string) => {
    setLoading(true);
    try {
      const blueprint = await architectClient.blueprints.generate({
        input,
        projectName,
        options: {
          enableMarketResearch: true,
          includeDeploymentGuide: true,
          technology: "modern",
        },
      });
      setResult(blueprint);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Your UI components */}
    </div>
  );
}
```

### Advanced Blueprint Generation

```typescript
// services/blueprint-service.ts
export class BlueprintService {
  constructor(private client: ArchitectPlatform) {}

  async generateAdvancedBlueprint(params: {
    input: string;
    projectName: string;
    industry?: string;
    technologies?: string[];
    compliance?: string[];
    deployment?: string[];
    budget?: number;
    timeline?: number;
  }) {
    return this.client.blueprints.generate({
      ...params,
      options: {
        enableMarketResearch: true,
        includeDeploymentGuide: true,
        includeSecurityPlan: true,
        includeMonitoring: true,
        industry: params.industry,
        compliance: params.compliance,
        deployment: params.deployment,
      },
      constraints: {
        budget: params.budget,
        timeline: params.timeline,
        teamSize: 5,
      },
    });
  }

  async getBlueprintStatus(blueprintId: string) {
    return this.client.blueprints.getStatus(blueprintId);
  }

  async refineBlueprint(
    blueprintId: string,
    feedback: string,
    refineType: "enhancement" | "feature" | "fix" = "enhancement",
  ) {
    return this.client.blueprints.refine(blueprintId, {
      feedback,
      refineType,
    });
  }

  async deployBlueprint(
    blueprintId: string,
    deployment: {
      githubOrg: string;
      repoName: string;
      isPrivate?: boolean;
    },
  ) {
    return this.client.deployments.create(blueprintId, deployment);
  }
}
```

### Blueprint Management Dashboard

```typescript
// app/dashboard/blueprints/page.tsx
"use client";

import { useEffect, useState } from "react";
import architectClient from "@/lib/architect";
import { BlueprintManager } from "@/components/BlueprintManager";

export default function BlueprintsDashboard() {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBlueprints() {
      try {
        const data = await architectClient.blueprints.list({
          limit: 20,
          sort: "createdAt",
          order: "desc",
        });
        setBlueprints(data.items);
      } catch (error) {
        console.error("Failed to load blueprints:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBlueprints();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Blueprints</h1>
      <BlueprintManager
        blueprints={blueprints}
        onUpdate={setBlueprints}
      />
    </div>
  );
}
```

---

## 🚀 Deployment Integration

### GitHub Integration Setup

```typescript
// services/github-service.ts
export class GitHub IntegrationService {
  constructor(private client: ArchitectPlatform) {}

  async deployToGitHub(params: {
    blueprintId: string;
    githubOrg: string;
    repoName: string;
    isPrivate?: boolean;
    description?: string;
  }) {
    return this.client.deployments.create(params.blueprintId, {
      githubOrg: params.githubOrg,
      repoName: params.repoName,
      isPrivate: params.isPrivate ?? false,
      repositorySettings: {
        description: params.description,
        homepage: "https://your-app.com",
        topics: ["generated-by-architect-platform"],
        autoInit: true,
      },
    });
  }

  async getDeploymentStatus(deploymentId: string) {
    return this.client.deployments.getStatus(deploymentId);
  }

  async getRepositoryInfo(blueprintId: string) {
    return this.client.deployments.getRepository(blueprintId);
  }
}
```

### Deployment Pipeline Component

```typescript
// components/DeploymentPipeline.tsx
"use client";

import { useState } from "react";
import { GitHubIntegrationService } from "@/services/github-service";

export function DeploymentPipeline({ blueprintId }: { blueprintId: string }) {
  const [deployment, setDeployment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [githubService] = useState(new GitHubIntegrationService(architectClient));

  const handleDeploy = async (config: {
    githubOrg: string;
    repoName: string;
    isPrivate: boolean;
  }) => {
    setLoading(true);
    try {
      const result = await githubService.deployToGitHub({
        blueprintId,
        ...config,
      });
      setDeployment(result);

      // Poll for deployment completion
      pollDeploymentStatus(result.deploymentId);
    } catch (error) {
      console.error("Deployment failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await githubService.getDeploymentStatus(deploymentId);
        setDeployment(prev => ({ ...prev, ...status }));

        if (status.status === "completed" || status.status === "failed") {
          clearInterval(interval);
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 5000);
  };

  return (
    <div className="deployment-pipeline">
      {/* Deployment UI components */}
    </div>
  );
}
```

---

## 📊 Monitoring & Analytics Integration

### Performance Monitoring

```typescript
// services/monitoring-service.ts
export class MonitoringService {
  constructor(private client: ArchitectPlatform) {}

  async getSystemHealth() {
    return this.client.monitoring.health({
      detailed: true,
      services: ["database", "redis", "ai-iflow", "github-api"],
    });
  }

  async getPerformanceMetrics(timeRange: "1h" | "24h" | "7d" = "1h") {
    return this.client.monitoring.metrics({
      timeRange,
      includeAlerts: true,
      granularity: "minute",
    });
  }

  async getCircuitBreakerStatus() {
    return this.client.monitoring.circuitBreakers({
      includeConfig: true,
      includeHistory: true,
    });
  }

  async getCacheAnalytics() {
    return this.client.monitoring.cache({
      detailed: true,
      includePatterns: true,
    });
  }
}
```

### Analytics Dashboard Component

```typescript
// components/AnalyticsDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { MonitoringService } from "@/services/monitoring-service";

export function AnalyticsDashboard() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monitoring] = useState(new MonitoringService(architectClient));

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [healthData, metricsData, cacheData] = await Promise.all([
          monitoring.getSystemHealth(),
          monitoring.getPerformanceMetrics(),
          monitoring.getCacheAnalytics(),
        ]);

        setHealth(healthData);
        setMetrics(metricsData);
        setCacheStats(cacheData);
      } catch (error) {
        console.error("Analytics loading failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();

    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [monitoring]);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="analytics-dashboard">
      {/* Analytics visualization components */}
    </div>
  );
}
```

---

## 🔒 Security Integration

### Secure API Integration

```typescript
// lib/secure-api.ts
export class SecureAPIClient {
  private client: ArchitectPlatform;
  private rateLimiter: Map<string, number> = new Map();

  constructor(apiKey: string, options: { maxRequestsPerMinute?: number } = {}) {
    this.client = new ArchitectPlatform({
      apiKey,
      rateLimiting: {
        maxRequests: options.maxRequestsPerMinute || 100,
        windowMs: 60000,
      },
    });
  }

  async secureRequest<T>(endpoint: string, data: any): Promise<T> {
    // Rate limiting
    if (!this.checkRateLimit()) {
      throw new Error("Rate limit exceeded");
    }

    // Input validation and sanitization
    const sanitizedData = this.validateAndSanitize(data);

    try {
      const response = await this.client.request(endpoint, sanitizedData);
      return this.validateResponse(response);
    } catch (error) {
      this.handleSecurityError(error);
      throw error;
    }
  }

  private validateAndSanitize(data: any): any {
    // Implement input validation logic
    if (typeof data === "string") {
      // Basic XSS prevention
      return data.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
    }
    if (typeof data === "object" && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.validateAndSanitize(value);
      }
      return sanitized;
    }
    return data;
  }

  private validateResponse(response: any): any {
    // Validate response structure
    if (!response || typeof response !== "object") {
      throw new Error("Invalid response format");
    }
    return response;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const requests = Array.from(this.rateLimiter.values()).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (requests.length >= 100) {
      return false;
    }

    this.rateLimiter.set(Math.random().toString(), now);
    return true;
  }

  private handleSecurityError(error: any): void {
    // Log security events
    console.error("Security error:", error);

    // In production, send to security monitoring
    if (process.env.NODE_ENV === "production") {
      // Send to security monitoring service
    }
  }
}
```

---

## 🧪 Testing Integration

### Test Environment Setup

```typescript
// __tests__/setup/architect-test.ts
import { ArchitectPlatform } from "@architect-platform/sdk";

export const testClient = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_TEST_API_KEY!,
  baseUrl: "https://api-test.architect-platform.com",
  timeout: 30000,
  retryAttempts: 1,
});

export const mockBlueprintResponse = {
  id: "test-blueprint-id",
  name: "Test Blueprint",
  status: "completed",
  contentMarkdown: "# Test Blueprint\n\n## Architecture...",
  structuredData: {
    techStack: ["Next.js", "PostgreSQL"],
    features: ["Auth", "Payments"],
  },
  createdAt: new Date().toISOString(),
};
```

### Integration Tests

```typescript
// __tests__/integration/blueprint-generation.test.ts
import { testClient, mockBlueprintResponse } from "../setup/architect-test";

describe("Blueprint Generation", () => {
  it("should generate blueprint successfully", async () => {
    const result = await testClient.blueprints.generate({
      input: "Test e-commerce platform",
      projectName: "TestCommerce",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name", "TestCommerce");
    expect(result.status).toBe("generating");
  });

  it("should handle invalid input gracefully", async () => {
    await expect(
      testClient.blueprints.generate({
        input: "", // Invalid: empty input
        projectName: "Test",
      }),
    ).rejects.toThrow("Input must be at least 10 characters");
  });

  it("should retrieve blueprint details", async () => {
    // First generate a blueprint
    const blueprint = await testClient.blueprints.generate({
      input: "Test application for integration testing",
      projectName: "TestApp",
    });

    // Then retrieve details
    const details = await testClient.blueprints.get(blueprint.id);

    expect(details).toHaveProperty("contentMarkdown");
    expect(details).toHaveProperty("structuredData");
    expect(details.structuredData).toHaveProperty("techStack");
  });

  it("should handle deployment to test repository", async () => {
    const blueprint = await testClient.blueprints.generate({
      input: "Test deployment blueprint",
      projectName: "TestDeploy",
    });

    const deployment = await testClient.deployments.create(blueprint.id, {
      githubOrg: "test-org",
      repoName: `test-repo-${Date.now()}`,
      isPrivate: true,
    });

    expect(deployment).toHaveProperty("deploymentId");
    expect(deployment.repository).toHaveProperty("url");
  });
});
```

### Performance Tests

```typescript
// __tests__/performance/generate-load.test.ts
import { testClient } from "../setup/architect-test";

describe("Load Testing", () => {
  it("should handle concurrent blueprint generation", async () => {
    const concurrentRequests = 10;
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      testClient.blueprints.generate({
        input: `Concurrent test blueprint ${i}`,
        projectName: `ConcurrentTest${i}`,
      }),
    );

    const results = await Promise.allSettled(requests);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    expect(successful).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate
    expect(failed).toBeLessThan(concurrentRequests * 0.2); // Less than 20% failure rate
  }, 60000); // 60 second timeout
});
```

---

## 🚨 Error Handling & Best Practices

### Comprehensive Error Handling

```typescript
// services/error-handler.ts
export class ArchitectErrorHandler {
  static handleBlueprintError(error: any): never {
    const errorMap = {
      VALIDATION_ERROR:
        "Invalid input provided. Please check your requirements.",
      INSUFFICIENT_CREDITS: "Insufficient credits. Please top up your account.",
      RATE_LIMITED: "Too many requests. Please wait before trying again.",
      SERVICE_UNAVAILABLE:
        "AI services temporarily unavailable. Please try again later.",
      UNAUTHORIZED: "Authentication failed. Please check your API key.",
    };

    const message =
      errorMap[error.code] || error.message || "An unexpected error occurred";

    console.error("Architect Platform Error:", {
      code: error.code,
      message,
      details: error.details,
      timestamp: new Date().toISOString(),
    });

    throw new Error(message);
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) break;

        // Don't retry on validation or auth errors
        if (
          ["VALIDATION_ERROR", "UNAUTHORIZED", "INSUFFICIENT_CREDITS"].includes(
            error.code,
          )
        ) {
          break;
        }

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.handleBlueprintError(lastError);
  }
}
```

### Usage with Error Handling

```typescript
// services/blueprint-service-enhanced.ts
export class EnhancedBlueprintService {
  constructor(private client: ArchitectPlatform) {}

  async generateSafely(params: { input: string; projectName: string }) {
    return ArchitectErrorHandler.withRetry(async () => {
      try {
        const blueprint = await this.client.blueprints.generate(params);
        return blueprint;
      } catch (error) {
        ArchitectErrorHandler.handleBlueprintError(error);
      }
    });
  }

  async deploySafely(
    blueprintId: string,
    deployment: {
      githubOrg: string;
      repoName: string;
      isPrivate?: boolean;
    },
  ) {
    return ArchitectErrorHandler.withRetry(async () => {
      try {
        const result = await this.client.deployments.create(
          blueprintId,
          deployment,
        );

        // Post-deployment validation
        if (!result.deploymentId) {
          throw new Error("Deployment failed to return valid deployment ID");
        }

        return result;
      } catch (error) {
        ArchitectErrorHandler.handleBlueprintError(error);
      }
    });
  }
}
```

---

## 🔧 Advanced Integration Patterns

### Custom Blueprint Templates

```typescript
// services/template-service.ts
export class TemplateService {
  constructor(private client: ArchitectPlatform) {}

  async createCustomTemplate(params: {
    name: string;
    category: string;
    industry: string;
    structure: any;
    customizations: any;
  }) {
    return this.client.templates.create({
      name: params.name,
      category: params.category,
      industry: params.industry,
      structure: params.structure,
      customizations: params.customizations,
      validation: {
        required: ["techStack", "features"],
        optional: ["deployment", "monitoring"],
      },
    });
  }

  async generateFromTemplate(templateId: string, customizations: any) {
    return this.client.blueprints.generateFromTemplate(
      templateId,
      customizations,
    );
  }

  async getIndustryTemplates(industry: string) {
    return this.client.templates.list({
      filters: { industry },
      sort: "popularity",
      limit: 20,
    });
  }
}
```

### Batch Operations

```typescript
// services/batch-service.ts
export class BatchService {
  constructor(private client: ArchitectPlatform) {}

  async batchGenerateBlueprints(
    projects: Array<{
      input: string;
      projectName: string;
    }>,
    concurrency: number = 3,
  ) {
    const results = [];

    for (let i = 0; i < projects.length; i += concurrency) {
      const batch = projects.slice(i, i + concurrency);
      const batchPromises = batch.map((project) =>
        this.client.blueprints.generate(project).catch((error) => ({
          error: error.message,
          project: project.projectName,
        })),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      total: projects.length,
      successful: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
      results,
    };
  }

  async batchDeploy(
    deployments: Array<{
      blueprintId: string;
      githubOrg: string;
      repoName: string;
    }>,
  ) {
    return this.client.deployments.batchCreate(deployments);
  }
}
```

---

## 📱 React Hooks Integration

### Blueprint Management Hooks

```typescript
// hooks/use-blueprints.ts
import { useState, useEffect, useCallback } from "react";
import architectClient from "@/lib/architect";

export function useBlueprints() {
  const [blueprints, setBlueprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBlueprints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await architectClient.blueprints.list({
        limit: 50,
        sort: "createdAt",
        order: "desc",
      });
      setBlueprints(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateBlueprint = useCallback(
    async (params: { input: string; projectName: string }) => {
      try {
        const blueprint = await architectClient.blueprints.generate(params);
        setBlueprints((prev) => [blueprint, ...prev]);
        return blueprint;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [],
  );

  const deleteBlueprint = useCallback(async (blueprintId: string) => {
    try {
      await architectClient.blueprints.delete(blueprintId);
      setBlueprints((prev) => prev.filter((b) => b.id !== blueprintId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  return {
    blueprints,
    loading,
    error,
    generateBlueprint,
    deleteBlueprint,
    refresh: loadBlueprints,
  };
}
```

### Real-time Updates Hook

```typescript
// hooks/use-realtime.ts
import { useState, useEffect } from "react";
import architectClient from "@/lib/architect";

export function useRealtimeUpdates(eventType: string) {
  const [updates, setUpdates] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = architectClient.realtime.connect(eventType);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setUpdates((prev) => [data, ...prev.slice(0, 99)]); // Keep last 100 updates
    };

    return () => eventSource.close();
  }, [eventType]);

  return { updates, connected };
}
```

---

## 🚀 Production Deployment Guide

### Docker Integration

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: architect-platform-integration
  labels:
    app: architect-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: architect-platform
  template:
    metadata:
      labels:
        app: architect-platform
    spec:
      containers:
        - name: app
          image: architect-platform-integration:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              valueFrom:
                secretKeyRef:
                  name: architect-secrets
                  key: clerk-public-key
            - name: CLERK_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: architect-secrets
                  key: clerk-secret-key
            - name: ARCHITECT_API_KEY
              valueFrom:
                secretKeyRef:
                  name: architect-secrets
                  key: architect-api-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: architect-platform-service
spec:
  selector:
    app: architect-platform
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

---

## 📚 Additional Resources

### Code Examples Repository

Complete integration examples available at:

- GitHub: https://github.com/architect-platform/examples
- Next.js Example: https://github.com/architect-platform/nextjs-example
- React Example: https://github.com/architect-platform/react-example
- Node.js Backend: https://github.com/architect-platform/nodejs-example

### Community & Support

- **Discord Community**: https://discord.gg/architect-platform
- **Stack Overflow**: Use tag `architect-platform`
- **GitHub Issues**: https://github.com/architect-platform/issues
- **Documentation**: https://docs.architect-platform.com

### SDK Documentation

- **TypeScript SDK**: https://docs.architect-platform.com/sdk/typescript
- **Python SDK**: https://docs.architect-platform.com/sdk/python
- **REST API**: https://docs.architect-platform.com/api/rest
- **GraphQL API**: https://docs.architect-platform.com/api/graphql

---

## 🎯 Integration Checklist

### Pre-Integration Checklist

- [ ] Get API credentials from Architect Platform dashboard
- [ ] Set up Clerk authentication for your application
- [ ] Install required dependencies (`@architect-platform/sdk`, `@clerk/nextjs`)
- [ ] Configure environment variables
- [ ] Set up error handling and logging

### Post-Integration Checklist

- [ ] Implement blueprint generation workflow
- [ ] Add deployment integration
- [ ] Set up monitoring and analytics
- [ ] Write integration tests
- [ ] Configure production deployment
- [ ] Set up CI/CD pipeline

### Production Checklist

- [ ] Configure production environment variables
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting and caching
- [ ] Configure backup and disaster recovery
- [ ] Set up security monitoring
- [ ] Document integration architecture

---

**Integration Guide Version**: 2.0  
**Last Updated**: 2025-12-24  
**Platform Version**: 1.0.0+  
**SDK Compatibility**: 2.0.0+  
**Support**: support@architect-platform.com

**Happy Integration! 🚀**
