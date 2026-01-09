# TypeScript/JavaScript SDK Reference

> **Official Architect Platform SDK** - Enterprise-grade TypeScript/JavaScript client library with complete type safety, error handling, and production-ready examples.

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @architect-platform/sdk

# yarn
yarn add @architect-platform/sdk

# pnpm
pnpm add @architect-platform/sdk
```

### Basic Usage

```typescript
import { ArchitectPlatform } from "@architect-platform/sdk";

// Initialize with your API credentials
const client = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_API_KEY,
  baseUrl: "https://api.architect-platform.com",
  // Optional enterprise configuration
  timeout: 120000,
  retryAttempts: 3,
  enableLogging: process.env.NODE_ENV === "development",
});

// Generate your first blueprint
const blueprint = await client.blueprints.generate({
  input: "Build an AI-powered SaaS platform for project management",
  projectName: "ProjectAI",
});

console.log("Blueprint ID:", blueprint.id);
console.log("Status:", blueprint.status);
```

---

## 🔧 Configuration

### Core Options

```typescript
interface ArchitectPlatformConfig {
  // Required authentication
  apiKey: string;
  baseUrl?: string; // Default: 'https://api.architect-platform.com'

  // Performance tuning
  timeout?: number; // Default: 120000 (2 minutes)
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms

  // Development options
  enableLogging?: boolean; // Default: false
  logLevel?: "debug" | "info" | "warn" | "error"; // Default: 'info'

  // Enterprise features
  webhookSecret?: string; // For webhook signature validation
  customHeaders?: Record<string, string>; // Additional headers

  // Advanced options
  agent?: https.Agent; // Custom HTTPS agent
  fetch?: typeof fetch; // Custom fetch implementation
}
```

### Environment Setup

```typescript
// Development environment
const devClient = new ArchitectPlatform({
  apiKey: process.env.DEV_API_KEY,
  baseUrl: "http://localhost:3000/api",
  enableLogging: true,
  logLevel: "debug",
});

// Production environment
const prodClient = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_API_KEY,
  timeout: 180000, // Extended timeout for production workloads
  retryAttempts: 5, // More retries in production
  enableLogging: false, // Minimize production noise
});

// Enterprise with custom headers
const enterpriseClient = new ArchitectPlatform({
  apiKey: process.env.ENTERPRISE_API_KEY,
  customHeaders: {
    "X-Client-Version": "1.0.0",
    "X-Enterprise-ID": "acme-corp",
  },
  webhookSecret: process.env.WEBHOOK_SECRET,
});
```

---

## 🔐 Authentication & Security

### API Key Authentication

```typescript
import { ArchitectPlatform, ArchitectAuthError } from "@architect-platform/sdk";

try {
  const client = new ArchitectPlatform({
    apiKey: "sk_arch_live_1234567890abcdef",
  });

  // Test authentication
  await client.health.check();
  console.log("Authentication successful");
} catch (error) {
  if (error instanceof ArchitectAuthError) {
    console.error("Authentication failed:", error.message);
    console.error("Error code:", error.code);
  }
}
```

### JWT Token Authentication (Enterprise SSO)

```typescript
import { ArchitectPlatform } from "@architect-platform/sdk";

const client = new ArchitectPlatform({
  baseUrl: "https://enterprise.acme.com/api",
  customHeaders: {
    Authorization: `Bearer ${jwtToken}`,
    "X-Enterprise-ID": "acme-corp",
  },
});
```

### Webhook Signature Validation

```typescript
import { WebhookValidator } from "@architect-platform/sdk";

const validator = new WebhookValidator({
  secret: process.env.WEBHOOK_SECRET,
});

// Express.js webhook handler
app.post("/webhooks/architect", (req, res) => {
  try {
    const signature = req.headers["x-architect-signature"];
    const payload = req.body;

    const isValid = validator.verifySignature(payload, signature);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // Process webhook
    console.log("Webhook validated:", payload.type);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook validation error:", error);
    res.status(400).json({ error: "Webhook validation failed" });
  }
});
```

---

## 📊 Blueprint Management

### Generate New Blueprint

```typescript
import {
  ArchitectPlatform,
  BlueprintGenerationOptions,
} from "@architect-platform/sdk";

const client = new ArchitectPlatform(config);

// Basic blueprint generation
const basicBlueprint = await client.blueprints.generate({
  input: "Build an e-commerce platform with AI recommendations",
  projectName: "SmartCommerce",
});

// Advanced blueprint generation with options
const options: BlueprintGenerationOptions = {
  input: "Build a fintech platform for peer-to-peer lending",
  projectName: "LendFlow",
  timeout: 180000, // 3 minutes override
  retryAttempts: 5,
  enableCache: true,
  priority: "high", // For enterprise customers
  metadata: {
    industry: "fintech",
    targetMarket: "SMB",
    estimatedUsers: "10000-50000",
  },
};

const advancedBlueprint = await client.blueprints.generate(options);
console.log("Blueprint generation started:", advancedBlueprint.id);
```

### Monitor Blueprint Generation Progress

```typescript
// Poll for completion (basic approach)
const pollBlueprint = async (blueprintId: string) => {
  const blueprint = await client.blueprints.get(blueprintId);

  switch (blueprint.status) {
    case "generating":
      console.log(
        "Still generating... Estimated completion:",
        blueprint.estimatedCompletion,
      );
      return pollBlueprint(blueprintId); // Continue polling

    case "completed":
      console.log(
        "Blueprint ready! Content length:",
        blueprint.contentMarkdown.length,
      );
      return blueprint;

    case "failed":
      throw new Error(`Blueprint generation failed: ${blueprint.error}`);

    default:
      throw new Error(`Unknown blueprint status: ${blueprint.status}`);
  }
};

// Event-driven approach (recommended for enterprise)
const eventClient = new ArchitectPlatform({
  ...config,
  webhookUrl: "https://your-app.com/webhooks/blueprints",
});

await eventClient.blueprints.generate({
  input: "Build an AI-powered healthcare platform",
  projectName: "HealthAI",
  webhooks: {
    onCompleted: "https://your-app.com/webhooks/blueprint-completed",
    onFailed: "https://your-app.com/webhooks/blueprint-failed",
  },
});
```

### Refine Existing Blueprint

```typescript
const refinedBlueprint = await client.blueprints.refine(blueprintId, {
  feedback:
    "Add mobile app support with React Native and implement real-time notifications",
  refineType: "enhancement",
  priority: "high",
});

console.log("Refinement started:", refinedBlueprint.id);
```

### List and Search Blueprints

```typescript
// List all blueprints
const allBlueprints = await client.blueprints.list({
  page: 1,
  limit: 20,
});

console.log(`Found ${allBlueprints.total} blueprints`);

// Advanced search and filtering
const searchResults = await client.blueprints.list({
  search: "e-commerce", // Search in name and description
  status: "completed", // Filter by status
  dateRange: {
    from: "2025-01-01",
    to: "2025-01-31",
  },
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 50,
});

console.log("Search results:", searchResults.data.length);
```

---

## 🚀 Deployment Management

### Deploy to GitHub

```typescript
import { GitHubDeploymentOptions } from "@architect-platform/sdk";

const deploymentOptions: GitHubDeploymentOptions = {
  githubOrg: "acme-corp",
  repoName: "smart-commerce-platform",
  isPrivate: false,
  branch: "main",
  commitMessage: "Initial AI-generated platform deployment",
  enableIssues: true,
  enableWiki: true,
  enableDiscussions: false,
  collaborators: ["developer1", "developer2"], // GitHub usernames
  topics: ["ai-generated", "e-commerce", "react", "nextjs"],
};

const deployment = await client.deployments.toGitHub(
  blueprintId,
  deploymentOptions,
);

console.log("Repository created:", deployment.repository.htmlUrl);
console.log("Deployment status:", deployment.deployment.status);
```

### Monitor Deployment Progress

```typescript
const monitorDeployment = async (deploymentId: string) => {
  const status = await client.deployments.getStatus(deploymentId);

  if (status.deployment.status === "completed") {
    console.log("✅ Deployment completed successfully!");
    console.log("Repository URL:", status.deployment.repositoryUrl);
    console.log("Commit SHA:", status.deployment.commitSha);
  } else if (status.deployment.status === "failed") {
    console.error("❌ Deployment failed:", status.deployment.error);
  } else {
    console.log("⏳ Deployment in progress...");
    // Continue monitoring
  }
};
```

### Bulk Deployment (Enterprise Feature)

```typescript
const bulkDeployments = await client.deployments.bulk([
  {
    blueprintId: "blueprint-1",
    options: { githubOrg: "org-1", repoName: "project-1", isPrivate: true },
  },
  {
    blueprintId: "blueprint-2",
    options: { githubOrg: "org-2", repoName: "project-2", isPrivate: false },
  },
  {
    blueprintId: "blueprint-3",
    options: { githubOrg: "org-3", repoName: "project-3", isPrivate: true },
  },
]);

console.log(`Started ${bulkDeployments.length} deployments`);
```

---

## 📈 Project Management

### Create and Manage Projects

```typescript
// Create new project
const project = await client.projects.create({
  name: "Q1 2025 Innovation Pipeline",
  description: "AI-generated platform prototypes for Q1 2025",
  tags: ["innovation", "ai", "prototyping"],
  settings: {
    defaultBlueprintTemplate: "enterprise-saas",
    autoDeploy: false,
    notifyOnCompletion: true,
  },
});

// Add blueprints to project
await client.projects.addBlueprint(project.id, blueprintId);

// Get project with analytics
const projectDetails = await client.projects.get(project.id, {
  includeAnalytics: true,
  includeBlueprints: true,
});

console.log("Project stats:", {
  totalBlueprints: projectDetails.analytics.blueprintCount,
  completionRate: projectDetails.analytics.completionRate,
  totalCost: projectDetails.analytics.totalCost,
});
```

---

## 💳 Credits & Billing

### Monitor Credit Usage

```typescript
const credits = await client.credits.getBalance();

console.log("Available credits:", credits.credits);
console.log("Subscription tier:", credits.subscriptionTier);

// Get detailed usage analytics
const usage = await client.credits.getUsage({
  dateRange: "last-30-days",
  granularity: "day",
  groupBy: "operation",
});

console.log("Daily usage:", usage.dailyBreakdown);
console.log("Cost by operation:", usage.costByOperation);
```

### Enterprise Credit Management

```typescript
// Purchase credits programmatically (Enterprise)
const purchase = await client.credits.purchase({
  amount: 10000, // $100 USD
  paymentMethodId: "pm_stripe_1234567890",
  purchaseOrder: "PO-2025-001",
  billingEmail: "finance@acme.com",
});

// Set up automatic top-up
await client.credits.setAutoRecharge({
  threshold: 1000, // Auto-recharge when below 1000 credits
  amount: 5000, // Add 5000 credits
  paymentMethodId: "pm_stripe_1234567890",
});
```

---

## 📊 Performance & Monitoring

### System Health Monitoring

```typescript
// Basic health check
const health = await client.health.check();

if (health.status === "healthy") {
  console.log("All systems operational");
  console.log("Database latency:", health.services.database.responseTime);
  console.log("AI services status:", health.services.aiIflow.status);
}

// Detailed health with service breakdown
const detailedHealth = await client.health.check({ detailed: true });

// System health monitoring (enterprise)
const monitor = async () => {
  const health = await client.health.check({ detailed: true });

  // Alert on service degradation
  if (health.services.aiIflow.responseTime > 5000) {
    console.warn("⚠️ AI service degradation detected");
    await client.alerts.create({
      type: "service-degradation",
      service: "ai-iflow",
      threshold: 5000,
      currentValue: health.services.aiIflow.responseTime,
    });
  }

  // Alert on circuit breaker activation
  if (health.services.researchTavily.circuitState === "OPEN") {
    console.error("🚨 Research service circuit breaker is OPEN");
    // Implement fallback strategy
  }
};

// Set up monitoring interval
setInterval(monitor, 30000); // Check every 30 seconds
```

### Performance Analytics

```typescript
const performance = await client.monitoring.getPerformance({
  timeWindow: "1h",
  includeCacheMetrics: true,
  includeDatabaseMetrics: true,
  includeAIServices: true,
});

console.log("API performance:", {
  averageResponseTime: performance.api.averageResponseTime,
  requestsPerMinute: performance.api.requestsPerMinute,
  errorRate: performance.api.errorRate,
});

// AI service optimization recommendations
if (performance.ai.iflow.averageResponseTime > 2000) {
  console.log("💡 Recommendation: Consider AI service optimization");
}
```

### Custom Metrics & Alerting

```typescript
// Create custom performance alert
await client.monitoring.createAlert({
  name: "High API Response Time",
  metric: "api.response_time",
  threshold: 1000, // 1 second
  comparison: "greater_than",
  notificationChannels: ["email", "slack"],
  cooldownPeriod: 300, // 5 minutes
});

// Get performance trends
const trends = await client.monitoring.getTrends({
  metric: "ai.cache_hit_rate",
  timeRange: "7d",
  aggregation: "daily",
});

console.log("Cache hit rate trend:", trends.data);
```

---

## 🏥 Enterprise Features

### White-Label Theme Management

```typescript
import { EnterpriseTheme } from "@architect-platform/sdk";

const theme: EnterpriseTheme = {
  brandName: "ACME Corporation",
  primaryColor: "#1e40af",
  secondaryColor: "#3b82f6",
  accentColor: "#60a5fa",
  logoUrl: "https://acme.com/logo.png",
  faviconUrl: "https://acme.com/favicon.ico",
  customCSS: {
    primaryButton: "background-color: #1e40af; border-radius: 8px;",
    header: "box-shadow: 0 2px 4px rgba(0,0,0,0.1);",
  },
};

// Create enterprise theme
const createdTheme = await client.enterprise.themes.create(theme, {
  customerId: "acme-corp",
  activateImmediately: true,
});

// Update theme
await client.enterprise.themes.update("acme-corp", {
  primaryColor: "#2563eb",
  customCSS: {
    ...theme.customCSS,
    primaryButton: "background-color: #2563eb; border-radius: 12px;",
  },
});
```

### Advanced Analytics

```typescript
// Usage analytics for enterprise reporting
const analytics = await client.analytics.getUsage({
  dateRange: "2025-01-01:2025-01-31",
  granularity: "day",
  metrics: [
    "blueprints_generated",
    "credits_used",
    "api_calls",
    "deployment_success",
  ],
  groupBy: ["user_id", "project_id"],
  filters: {
    subscription_tier: ["enterprise", "pro"],
    industry: ["fintech", "healthcare"],
  },
});

// Export analytics data
const exportData = await client.analytics.export({
  format: "csv",
  dateRange: "last-90-days",
  metrics: ["all"],
  includeCostBreakdown: true,
});

// Real-time dashboard data
const dashboardData = await client.analytics.getDashboard({
  timeWindow: "24h",
  refreshInterval: 30, // seconds
  widgets: [
    "usage_trend",
    "cost_breakdown",
    "performance_metrics",
    "error_rate",
    "user_activity",
  ],
});
```

---

## 🛠️ Advanced Error Handling

### Comprehensive Error Management

```typescript
import {
  ArchitectPlatform,
  ArchitectError,
  ValidationError,
  RateLimitError,
  PaymentRequiredError,
  ServiceUnavailableError,
} from "@architect-platform/sdk";

const client = new ArchitectPlatform(config);

const handleErrors = async () => {
  try {
    const blueprint = await client.blueprints.generate({
      input: "Build a complex enterprise platform",
      projectName: "EnterpriseApp",
    });

    return blueprint;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error("❌ Validation Error:", error.message);
      console.error("Field errors:", error.details.fieldErrors);
      return null;
    } else if (error instanceof RateLimitError) {
      console.error("⏱️ Rate Limit Error:", error.message);
      console.error("Retry after:", error.retryAfter, "seconds");
      console.error("Limit:", error.limit, "requests per", error.window);

      // Implement exponential backoff
      const delay = Math.pow(2, error.retryAttempts) * 1000;
      setTimeout(() => handleErrors(), delay);
    } else if (error instanceof PaymentRequiredError) {
      console.error("💳 Payment Required:", error.message);
      console.error("Required credits:", error.requiredCredits);
      console.error("Available credits:", error.availableCredits);

      // Trigger credit purchase flow
      await triggerCreditPurchase();
    } else if (error instanceof ServiceUnavailableError) {
      console.error("🔧 Service Unavailable:", error.message);
      console.error("Affected services:", error.affectedServices);
      console.error("Estimated recovery:", error.estimatedRecoveryTime);

      // Implement fallback strategy
      return await fallbackStrategy();
    } else if (error instanceof ArchitectError) {
      console.error("🚨 Platform Error:", error.message);
      console.error("Error code:", error.code);
      console.error("Request ID:", error.requestId);

      // Log for debugging and support
      await client.support.logError(error);
    } else {
      console.error("❓ Unknown Error:", error);
      throw error; // Re-throw unexpected errors
    }
  }
};
```

### Retry and Circuit Breaker Patterns

```typescript
import { RetryConfig, CircuitBreakerConfig } from "@architect-platform/sdk";

const retryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    "ServiceUnavailableError",
    "RateLimitError",
    "NetworkError",
    "TimeoutError",
  ],
};

const circuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  monitoringPeriod: 120000,
  expectedRecoveryTime: 30000,
};

const resilientClient = new ArchitectPlatform({
  ...config,
  retry: retryConfig,
  circuitBreaker: circuitBreakerConfig,
});

// Custom retry logic for specific operations
const generateBlueprintWithRetry = async (
  input: string,
  projectName: string,
) => {
  return await resilientClient.blueprints.generate({
    input,
    projectName,
    retry: {
      maxAttempts: 10, // More retries for expensive operations
      baseDelay: 5000, // Longer base delay
      backoffMultiplier: 1.5,
    },
  });
};
```

---

## 🧪 Testing & Development

### Mocking for Unit Tests

```typescript
// Mock the SDK for testing
import { ArchitectPlatformMock } from "@architect-platform/sdk/testing";

const mockClient = new ArchitectPlatformMock();

// Configure mock responses
mockClient.blueprints.generate.mockResolvedValue({
  id: "test-blueprint-id",
  name: "Test Platform",
  status: "completed",
  contentMarkdown: "# Test Blueprint Content",
  structuredData: { techStack: ["Next.js", "PostgreSQL"] },
});

mockClient.blueprints.get.mockImplementation(async (id: string) => {
  if (id === "nonexistent") {
    throw new NotFoundError("Blueprint not found");
  }
  return {
    id,
    name: "Test Platform",
    status: "completed",
  };
});

// Test with Jests
test("should generate blueprint successfully", async () => {
  const result = await mockClient.blueprints.generate({
    input: "Test input",
    projectName: "TestProject",
  });

  expect(result.id).toBe("test-blueprint-id");
  expect(result.status).toBe("completed");
  expect(mockClient.blueprints.generate).toHaveBeenCalledWith({
    input: "Test input",
    projectName: "TestProject",
  });
});

test("should handle blueprint not found", async () => {
  await expect(mockClient.blueprints.get("nonexistent")).rejects.toThrow(
    NotFoundError,
  );
});
```

### Development Tools

```typescript
import { ArchitectPlatform, DevelopmentTools } from "@architect-platform/sdk";

const client = new ArchitectPlatform({
  ...config,
  enableLogging: true,
  logLevel: "debug",
});

// Request interceptor for debugging
client.interceptors.request.use((request) => {
  console.log("🔵 Request:", {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
  });
  return request;
});

// Response interceptor for debugging
client.interceptors.response.use((response) => {
  console.log("🟢 Response:", {
    status: response.status,
    headers: response.headers,
    duration: response.duration,
  });
  return response;
});

// Error interceptor for debugging
client.interceptors.error.use((error) => {
  console.error("🔴 Error:", {
    message: error.message,
    code: error.code,
    requestId: error.requestId,
    stack: error.stack,
  });
  return error;
});

// Performance monitoring
const perfTools = new DevelopmentTools(client);
perfTools.enablePerformanceMonitoring({
  logSlowRequests: true,
  slowRequestThreshold: 5000,
  logRequestDetails: true,
});
```

---

## 📚 Best Practices & Patterns

### Production Configuration

```typescript
// production-sdk-config.ts
export const productionConfig = {
  apiKey: process.env.ARCHITECT_API_KEY,
  baseUrl:
    process.env.ARCHITECT_BASE_URL || "https://api.architect-platform.com",
  timeout: 180000, // 3 minutes for production workloads
  retryAttempts: 5,
  retryDelay: 2000,
  enableLogging: false, // Minimize production noise

  // Custom headers for enterprise tracking
  customHeaders: {
    "X-Client-Version": require("../package.json").version,
    "X-Environment": process.env.NODE_ENV,
    "X-Instance-ID": process.env.INSTANCE_ID,
  },

  // Circuit breaker for resilience
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 120000,
  },
};

// Custom HTTP agent for enterprise networking
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

export const client = new ArchitectPlatform({
  ...productionConfig,
  agent: httpsAgent,
});
```

### Batch Operations Optimization

```typescript
// Efficient bulk blueprint generation
const generateBulkBlueprints = async (
  blueprintRequests: BlueprintRequest[],
) => {
  const BATCH_SIZE = 5; // Concurrent limit for optimal performance
  const results = [];

  for (let i = 0; i < blueprintRequests.length; i += BATCH_SIZE) {
    const batch = blueprintRequests.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map((request) =>
      client.blueprints.generate({
        ...request,
        timeout: 180000, // Longer timeout for complex blueprints
        retryAttempts: 3,
      }),
    );

    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);

    // Respect rate limits - small delay between batches
    if (i + BATCH_SIZE < blueprintRequests.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
};
```

### Cache Integration

```typescript
import Redis from "ioredis";
import { ArchitectPlatform } from "@architect-platform/sdk";

const redis = new Redis(process.env.REDIS_URL);

class CachedArchitectClient extends ArchitectPlatform {
  private cachePrefix = "architect-sdk:";
  private cacheExpiry = 300; // 5 minutes

  async getBlueprint(id: string, useCache = true): Promise<Blueprint> {
    if (useCache) {
      const cached = await redis.get(`${this.cachePrefix}blueprint:${id}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const blueprint = await super.blueprints.get(id);

    if (useCache && blueprint.status === "completed") {
      await redis.setex(
        `${this.cachePrefix}blueprint:${id}`,
        this.cacheExpiry,
        JSON.stringify(blueprint),
      );
    }

    return blueprint;
  }

  async invalidateBlueprintCache(id: string): Promise<void> {
    await redis.del(`${this.cachePrefix}blueprint:${id}`);
  }
}

const cachedClient = new CachedArchitectClient(config);
```

---

## 🔍 Troubleshooting & Support

### Common Issues and Solutions

#### Timeout Issues

```typescript
// Handle long-running blueprint generation
const blueprint = await client.blueprints.generate({
  input: "Complex enterprise platform",
  projectName: "EnterpriseApp",
  timeout: 300000, // 5 minutes
  retryAttempts: 1, // Fewer retries for long operations
});

// Monitor generation progress
const monitorGeneration = async (blueprintId: string) => {
  const maxWaitTime = 600000; // 10 minutes max
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await client.blueprints.get(blueprintId);

    if (status.status === "completed") return status;
    if (status.status === "failed") throw new Error("Generation failed");

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Generation timeout");
};
```

#### Rate Limiting

```typescript
// Implement graceful rate limiting
const generateWithRateLimiting = async (requests: BlueprintRequest[]) => {
  const results = [];

  for (const request of requests) {
    try {
      const result = await client.blueprints.generate(request);
      results.push({ success: true, data: result });
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(`Rate limited. Waiting ${error.retryAfter}s...`);
        await new Promise((resolve) =>
          setTimeout(resolve, error.retryAfter * 1000),
        );

        // Retry the request
        const result = await client.blueprints.generate(request);
        results.push({ success: true, data: result });
      } else {
        results.push({ success: false, error: error.message });
      }
    }
  }

  return results;
};
```

### Debug Mode

```typescript
// Enable comprehensive debugging
const debugClient = new ArchitectPlatform({
  ...config,
  enableLogging: true,
  logLevel: "debug",
  interceptors: {
    request: [
      (request) => {
        console.log("🚀 SDK Request:", {
          method: request.method,
          url: request.url,
          headers: { ...request.headers, Authorization: "[REDACTED]" },
          body: request.body,
          timestamp: new Date().toISOString(),
        });
        return request;
      },
    ],
    response: [
      (response) => {
        console.log("✅ SDK Response:", {
          status: response.status,
          headers: response.headers,
          duration: response.duration,
          timestamp: new Date().toISOString(),
        });
        return response;
      },
    ],
    error: [
      (error) => {
        console.error("❌ SDK Error:", {
          name: error.constructor.name,
          message: error.message,
          code: error.code,
          requestId: error.requestId,
          timestamp: new Date().toISOString(),
        });
        throw error;
      },
    ],
  },
});
```

### Support Integration

```typescript
// Generate comprehensive error reports
const generateSupportReport = async (error: ArchitectError) => {
  const systemInfo = {
    sdkVersion: require("@architect-platform/sdk/package.json").version,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    environment: process.env.NODE_ENV,
  };

  const diagnosticInfo = {
    errorMessage: error.message,
    errorCode: error.code,
    requestId: error.requestId,
    timestamp: new Date().toISOString(),
    systemInfo,
    lastRequests: await client.getDiagnostics().getRecentErrors(10),
    currentConfig: client.getConfig({ sensitiveDataRedacted: true }),
  };

  console.error("🆘 Diagnostic Report:");
  console.error(JSON.stringify(diagnosticInfo, null, 2));

  // Optionally send to support
  if (process.env.ARCHITECT_SUPPORT_WEBHOOK) {
    await fetch(process.env.ARCHITECT_SUPPORT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diagnosticInfo),
    });
  }
};
```

---

## 📄 Changelog & Versioning

### Version 1.0.0 Features

- ✅ Complete TypeScript support with strict typing
- ✅ All API endpoints covered
- ✅ Enterprise-grade error handling
- ✅ Retry and circuit breaker patterns
- ✅ Webhook signature validation
- ✅ Performance monitoring and analytics
- ✅ Development tools and mocking support
- ✅ Comprehensive documentation

### Migration Guide

```typescript
// From 0.x to 1.x
// Old:
const client = new ArchitectClient("api-key");

// New:
const client = new ArchitectPlatform({
  apiKey: "api-key",
  timeout: 120000,
  retryAttempts: 3,
});

// Old method names have been updated for consistency
// client.generateBlueprint() → client.blueprints.generate()
// client.deployGithub() → client.deployments.toGitHub()
```

---

## 🤝 Community & Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/architect-platform/sdk/issues)
- **Documentation**: [Full API reference](https://docs.architect-platform.com/sdk)
- **Community Discord**: [Join our developer community](https://discord.gg/architect-platform)
- **Enterprise Support**: enterprise@architect-platform.com

---

## 📜 License

MIT License - see [LICENSE](https://github.com/architect-platform/sdk/blob/main/LICENSE) file for details.

---

_This SDK is officially maintained by the Architect Platform team and follows semantic versioning for predictable updates._
