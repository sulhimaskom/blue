# The Architect Platform - API Reference

> **Version**: 1.0.0
> **Base URL**: `https://api.architectplatform.com/api`
> **Last Updated**: January 17, 2026
> **Maintainer**: Integration Engineering Team

---

## Quick Start

### 1. Authentication

All API requests require authentication via Clerk JWT:

```bash
curl -X GET https://api.architectplatform.com/api/blueprints \
  -H "Authorization: Bearer <your-clerk-jwt-token>"
```

Get your JWT token from Clerk after user authentication.

### 2. Rate Limits

Rate limits are applied per endpoint and vary by subscription tier:

| Category       | Free Tier | Pro Tier | Enterprise Tier |
| -------------- | --------- | -------- | -------------- |
| **Strict**     | 3/min     | 15/min   | 30/min         |
| **Moderate**   | 10/min    | 50/min   | 100/min        |
| **Standard**   | 30/min    | 150/min  | 300/min        |
| **Permissive** | 60/min    | 300/min  | 600/min        |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1737112800
```

### 3. Response Format

All API responses follow a unified format:

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Detailed error information (development mode only)"
}
```

---

## API Endpoints

### Projects

#### Get All Projects

Retrieve all projects for the authenticated user.

```http
GET /projects
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "E-commerce Platform",
        "description": "Modern e-commerce platform with AI recommendations",
        "status": "draft",
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-01-15T10:30:00Z"
      }
    ],
    "message": "Projects retrieved successfully"
  }
}
```

---

#### Create Project

Create a new project.

```http
POST /projects
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Request Body**:
```json
{
  "name": "E-commerce Platform",
  "description": "Modern e-commerce platform with AI recommendations"
}
```

**Validation**:
- `name`: 3-100 characters required
- `description`: Optional string

**Response**:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "E-commerce Platform",
      "description": "Modern e-commerce platform with AI recommendations",
      "status": "draft",
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    },
    "message": "Project created successfully"
  }
}
```

---

### Blueprints

#### Get All Blueprints

Retrieve all blueprints with user credits and subscription information.

```http
GET /blueprints
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "E-commerce Platform",
        "description": "Modern e-commerce platform with AI recommendations",
        "status": "draft",
        "blueprintCount": 2,
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-01-15T10:30:00Z"
      }
    ],
    "credits": 50,
    "subscriptionTier": "pro",
    "performanceMetrics": {
      "projectsQuery": {
        "optimizedQueryTime": 45,
        "improvementPercentage": 35
      },
      "countsQuery": {
        "optimizedQueryTime": 12,
        "improvementPercentage": 40
      }
    }
  }
}
```

---

#### Generate Blueprint

Generate a new blueprint using AI analysis and market research.

```http
POST /blueprints
```

**Authentication**: Required  
**Rate Limit**: Strict (3/min)  
**Subscription Multipliers**: Pro (15/min), Enterprise (30/min)  
**Credits Required**: 1 credit

**Request Body**:
```json
{
  "input": "I want a marketplace for rare sneakers with AI-powered authentication and NFT integration",
  "projectName": "SneakerMarketplace"
}
```

**Validation**:
- `input`: 10-1000 characters required
- `projectName`: 3-100 characters required

**Response**:
```json
{
  "success": true,
  "data": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "blueprintId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "generating",
    "estimatedDuration": 15000,
    "message": "Blueprint successfully generated using AI analysis and market research."
  }
}
```

**Notes**:
- AI generation includes market research via Tavily API
- Blueprint creation takes 10-20 seconds typically
- Credits are deducted upon successful generation
- Blueprint status can be checked via GET /blueprints/[id]

---

#### Get Blueprint by ID

Retrieve a specific blueprint.

```http
GET /blueprints/{id}
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Path Parameters**:
- `id`: Blueprint UUID

**Response**:
```json
{
  "success": true,
  "data": {
    "blueprint": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "version": 1,
      "contentMarkdown": "# Sneaker Marketplace Blueprint...",
      "structuredData": {
        "stack": {
          "backend": "Node.js",
          "frontend": "Next.js 15",
          "database": "Neon PostgreSQL"
        },
        "features": [
          "AI-powered authentication",
          "NFT integration",
          "Real-time bidding"
        ]
      },
      "marketResearch": {
        "totalAddressableMarket": 1000000000,
        "competitors": [
          {
            "name": "StockX",
            "marketShare": 0.35
          }
        ]
      },
      "createdAt": "2026-01-15T10:35:00Z",
      "updatedAt": "2026-01-15T10:35:00Z"
    },
    "message": "Blueprint retrieved successfully"
  }
}
```

---

#### Update Blueprint

Refine an existing blueprint based on feedback.

```http
PUT /blueprints/{id}
```

**Authentication**: Required  
**Rate Limit**: Moderate (10/min)  
**Subscription Multipliers**: Pro (50/min), Enterprise (100/min)

**Path Parameters**:
- `id`: Blueprint UUID

**Request Body**:
```json
{
  "feedback": "Add mobile app support with React Native"
}
```

**Validation**:
- `feedback`: 10-1000 characters required

**Response**:
```json
{
  "success": true,
  "data": {
    "blueprintId": "660e8400-e29b-41d4-a716-446655440000",
    "version": 2,
    "status": "refining",
    "message": "Blueprint refinement initiated"
  }
}
```

---

### Deployment

#### Deploy Repository

Deploy a project to GitHub.

```http
POST /deploy/{id}
```

**Authentication**: Required  
**Rate Limit**: Strict (3/min)  
**Subscription Multipliers**: Pro (15/min), Enterprise (30/min)  
**Credits Required**: 5 credits

**Path Parameters**:
- `id`: Project UUID

**Request Body**:
```json
{
  "githubOrg": "mycompany",
  "repoName": "sneaker-marketplace",
  "isPrivate": false
}
```

**Validation**:
- `githubOrg`: 2+ characters required
- `repoName`: 3-100 characters required
- `isPrivate`: Boolean (default: false)

**Response**:
```json
{
  "success": true,
  "data": {
    "repositoryUrl": "https://github.com/mycompany/sneaker-marketplace",
    "deploymentStatus": "completed",
    "blueprintInjected": true,
    "message": "Repository successfully deployed to GitHub"
  }
}
```

**Notes**:
- Uses GitHub App API (preferred) or personal access token fallback
- Automatically injects `docs/architecture/blueprint.md` into repo
- Project status must be "completed" or "deployed"
- Deployment typically takes 5-10 seconds

---

### Credits

#### Get Credits Information

Retrieve current credits balance and transaction history.

```http
GET /credits
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "credits": 50,
    "subscriptionTier": "pro",
    "transactions": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "amount": 1000,
        "creditsAdded": 10,
        "createdAt": "2026-01-15T09:00:00Z",
        "paymentId": "pi_3abc123xyz"
      }
    ],
    "pricing": {
      "creditValue": "$0.10 per credit",
      "packages": [
        {
          "amount": 10,
          "credits": 100,
          "price": "$10.00"
        },
        {
          "amount": 50,
          "credits": 500,
          "price": "$50.00",
          "savings": 0
        },
        {
          "amount": 100,
          "credits": 1100,
          "price": "$100.00",
          "savings": 10
        }
      ]
    },
    "stripeConfig": {
      "configured": true,
      "publishableKey": "pk_live_abc123xyz"
    }
  }
}
```

---

#### Add Credits

Purchase credits via Stripe payment.

```http
POST /credits
```

**Authentication**: Required  
**Rate Limit**: Moderate (10/min)  
**Subscription Multipliers**: Pro (50/min), Enterprise (100/min)

**Request Body**:
```json
{
  "amount": 1000,
  "paymentMethodId": "pm_1abc123xyz",
  "confirmImmediate": false
}
```

**Validation**:
- `amount`: Integer between 100 and 100000 (in cents: $1.00 - $1,000.00)
- `paymentMethodId`: Stripe payment method ID required
- `confirmImmediate`: Boolean (default: false)

**Response (Payment Required)**:
```json
{
  "success": true,
  "data": {
    "requiresAction": true,
    "stripeClientSecret": "pi_3abc123xyz_secret_xyz",
    "paymentIntentId": "pi_3abc123xyz",
    "amount": 10.00,
    "paymentStatus": "requires_payment_method",
    "publishableKey": "pk_live_abc123xyz",
    "message": "Payment initiated. Please confirm the payment to add credits."
  }
}
```

**Response (Immediate Confirmation)**:
```json
{
  "success": true,
  "data": {
    "transactionId": "770e8400-e29b-41d4-a716-446655440000",
    "creditsAdded": 10,
    "totalCredits": 60,
    "amount": 10.00,
    "subscriptionTier": "pro",
    "paymentId": "pi_3abc123xyz",
    "stripeClientSecret": "pi_3abc123xyz_secret_xyz",
    "paymentStatus": "succeeded",
    "message": "Credits added successfully via Stripe payment."
  }
}
```

**Notes**:
- 1 credit = $0.10 USD (10 credits per $1)
- Minimum purchase: $1.00 (10 credits)
- Maximum purchase: $1,000.00 (10,000 credits)
- Development mode: Credits added immediately without payment
- Production mode: Stripe payment processing required

---

### Performance & Monitoring

#### Get Performance Metrics

Retrieve system performance metrics and optimization insights.

```http
GET /performance
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "systemMetrics": {
      "apiResponseTime": {
        "p50": 85,
        "p95": 142,
        "p99": 189
      },
      "cacheHitRate": 0.73,
      "databaseQueryTime": 45,
      "errorRate": 0.002
    },
    "optimizationRecommendations": [
      {
        "category": "cache",
        "recommendation": "Increase TTL for AI responses",
        "expectedImprovement": "15-20% faster responses"
      },
      {
        "category": "database",
        "recommendation": "Add composite index on projects.status",
        "expectedImprovement": "25-30% faster queries"
      }
    ],
    "healthScore": 96
  }
}
```

---

#### Get Cache Metrics

Retrieve detailed cache performance metrics.

```http
GET /cache/metrics
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "aiCacheStats": {
      "hitRate": 0.78,
      "totalRequests": 12450,
      "cacheHits": 9711,
      "cacheMisses": 2739,
      "averageHitTime": 12,
      "averageMissTime": 1850,
      "memoryUsage": "45.2 MB"
    },
    "dataCacheKeys": 1450,
    "performanceMetrics": {
      "totalCacheHits": 15670,
      "totalCacheMisses": 4560,
      "overallHitRate": 0.77,
      "avgResponseTime": 45,
      "cacheSize": "128.5 MB"
    },
    "tags": ["ai-response", "blueprint", "user-data", "metrics"]
  }
}
```

---

#### Get Circuit Breaker Metrics

Retrieve circuit breaker health and status for external services.

```http
GET /circuit-breakers/metrics
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "circuitBreakers": [
      {
        "service": "AI_IFLOW",
        "state": "CLOSED",
        "failureCount": 0,
        "failureThreshold": 5,
        "lastFailureTime": null,
        "nextRetryTime": null,
        "health": "HEALTHY"
      },
      {
        "service": "RESEARCH_TAVILY",
        "state": "CLOSED",
        "failureCount": 1,
        "failureThreshold": 3,
        "lastFailureTime": "2026-01-15T10:25:00Z",
        "nextRetryTime": null,
        "health": "HEALTHY"
      }
    ],
    "overallHealth": "HEALTHY",
    "activeCircuitBreakers": 2
  }
}
```

**Circuit States**:
- `CLOSED`: Normal operation, requests allowed
- `OPEN`: Failure threshold exceeded, requests blocked
- `HALF_OPEN`: Testing recovery, limited requests allowed

---

### Enterprise

#### Get Enterprise Themes

Retrieve enterprise theme configurations.

```http
GET /enterprise/themes
```

**Authentication**: Required  
**Rate Limit**: Standard (30/min)  
**Subscription Multipliers**: Pro (150/min), Enterprise (300/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "customerId": "customer_abc123",
        "primaryColor": "#2563eb",
        "secondaryColor": "#7c3aed",
        "logoUrl": "https://cdn.example.com/logo.png",
        "customCss": ".button { border-radius: 8px; }",
        "isActive": true,
        "createdAt": "2026-01-15T10:00:00Z",
        "updatedAt": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

#### Create Enterprise Theme

Create a custom enterprise theme.

```http
POST /enterprise/themes
```

**Authentication**: Required  
**Rate Limit**: Moderate (10/min)  
**Subscription Multipliers**: Pro (50/min), Enterprise (100/min)

**Request Body**:
```json
{
  "customerId": "customer_abc123",
  "primaryColor": "#2563eb",
  "secondaryColor": "#7c3aed",
  "logoUrl": "https://cdn.example.com/logo.png",
  "customCss": ".button { border-radius: 8px; }"
}
```

**Validation**:
- `customerId`: Required string
- `primaryColor`: Hex color code required
- `secondaryColor`: Hex color code required
- `logoUrl`: Optional URL string
- `customCss`: Optional CSS string

**Response**:
```json
{
  "success": true,
  "data": {
    "theme": {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "customerId": "customer_abc123",
      "primaryColor": "#2563eb",
      "secondaryColor": "#7c3aed",
      "logoUrl": "https://cdn.example.com/logo.png",
      "customCss": ".button { border-radius: 8px; }",
      "isActive": true,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    },
    "message": "Enterprise theme created successfully"
  }
}
```

---

### Webhooks

#### Webhook Processing

The platform processes webhooks from external services:

**Stripe Webhooks**:
- Endpoint: `POST /webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.updated`
- Signature verification required

**Clerk Webhooks**:
- Endpoint: `POST /webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Signature verification required

**Webhook Reliability**:
- Queue-based processing with retry logic
- Exponential backoff for failed deliveries
- Idempotency guarantees
- Automatic retry up to 3 times

---

### Health & Metrics

#### Health Check

Public health check endpoint for monitoring.

```http
GET /health
```

**Authentication**: Not required  
**Rate Limit**: Permissive (60/min)  
**Subscription Multipliers**: Pro (300/min), Enterprise (600/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-15T10:30:00Z",
    "version": "1.0.0",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "aiService": "healthy",
      "githubApi": "healthy"
    }
  }
}
```

---

#### System Metrics

Public system metrics for monitoring dashboards.

```http
GET /metrics
```

**Authentication**: Not required  
**Rate Limit**: Permissive (60/min)  
**Subscription Multipliers**: Pro (300/min), Enterprise (600/min)

**Response**:
```json
{
  "success": true,
  "data": {
    "uptime": 0.9999,
    "requestsPerMinute": 156,
    "errorRate": 0.002,
    "responseTime": {
      "p50": 85,
      "p95": 142,
      "p99": 189
    },
    "activeUsers": 45,
    "totalProjects": 1240,
    "totalBlueprints": 3850,
    "creditsIssued": 125000
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Detailed error information (development mode only)"
}
```

### HTTP Status Codes

| Status Code | Description |
| ----------- | ----------- |
| `200` | Request successful |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

### Error Types

**ValidationError (400)**: Request validation failed

```json
{
  "success": false,
  "error": "Input must be at least 10 characters"
}
```

**AuthenticationError (401)**: Invalid or missing authentication

```json
{
  "success": false,
  "error": "Authentication required"
}
```

**AuthorizationError (403)**: Insufficient permissions

```json
{
  "success": false,
  "error": "You do not have permission to access this resource"
}
```

**NotFoundError (404)**: Resource not found

```json
{
  "success": false,
  "error": "Project not found"
}
```

**RateLimitError (429)**: Rate limit exceeded

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

Headers included:
```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1737112800
Retry-After: 60
```

**DatabaseError (500)**: Database operation failed

```json
{
  "success": false,
  "error": "Database operation failed. Please try again."
}
```

---

## Best Practices

### 1. Error Handling

Always check the `success` field in responses:

```javascript
const response = await fetch('/api/blueprints', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

if (!data.success) {
  console.error('Error:', data.error);
  return;
}

console.log('Success:', data.data);
```

### 2. Rate Limiting

Monitor rate limit headers to avoid 429 errors:

```javascript
const response = await fetch('/api/blueprints', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (parseInt(remaining) < 5) {
  // Back off until reset time
  const waitTime = parseInt(reset) * 1000 - Date.now();
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

### 3. Caching

Leverage caching for frequently accessed data:

```javascript
// Client-side caching with Cache-Control
const response = await fetch('/api/credits', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'max-age=300' // Cache for 5 minutes
  }
});
```

### 4. Webhook Handling

Implement idempotency for webhook handlers:

```javascript
// Store processed webhook IDs to avoid duplicate processing
const processedWebhooks = new Set();

function handleWebhook(webhookId, data) {
  if (processedWebhooks.has(webhookId)) {
    return; // Already processed
  }

  // Process webhook
  processPayment(data);

  // Mark as processed
  processedWebhooks.add(webhookId);
}
```

### 5. Pagination

For large datasets, use pagination parameters:

```javascript
// Example: Get projects with pagination
const response = await fetch('/api/projects?page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

console.log(`Showing ${data.data.projects.length} of ${data.data.totalProjects} projects`);
```

---

## SDK Integration

### JavaScript/TypeScript

```typescript
import { ArchitectClient } from '@architect/sdk';

const client = new ArchitectClient({
  baseUrl: 'https://api.architectplatform.com/api',
  apiKey: 'your-clerk-jwt-token'
});

// Create project
const project = await client.projects.create({
  name: 'E-commerce Platform',
  description: 'Modern e-commerce platform'
});

// Generate blueprint
const blueprint = await client.blueprints.generate({
  input: 'I want a marketplace for rare sneakers',
  projectName: 'SneakerMarketplace'
});

// Deploy repository
const deployment = await client.deployments.deploy(project.id, {
  githubOrg: 'mycompany',
  repoName: 'sneaker-marketplace'
});
```

### Python

```python
from architect_sdk import ArchitectClient

client = ArchitectClient(
    base_url='https://api.architectplatform.com/api',
    api_key='your-clerk-jwt-token'
)

# Create project
project = client.projects.create(
    name='E-commerce Platform',
    description='Modern e-commerce platform'
)

# Generate blueprint
blueprint = client.blueprints.generate(
    input='I want a marketplace for rare sneakers',
    project_name='SneakerMarketplace'
)

# Deploy repository
deployment = client.deployments.deploy(
    project_id=project.id,
    github_org='mycompany',
    repo_name='sneaker-marketplace'
)
```

---

## Support & Resources

### Documentation

- [Architecture Blueprint](./blueprint.md) - Internal architecture documentation
- [Integration Patterns](./integration-patterns.md) - Resilience and reliability patterns
- [Developer Portal](https://developer.architectplatform.com) - Tutorials and guides

### Support

- **Email**: support@architectplatform.com
- **Documentation**: https://docs.architectplatform.com
- **Status Page**: https://status.architectplatform.com

### Changelog

| Version | Date | Changes |
| ------- | ---- | ------- |
| 1.0.0 | 2026-01-17 | Initial API release with all core endpoints |

---

## License & Terms

- **API License**: MIT
- **Terms of Service**: https://architectplatform.com/terms
- **Privacy Policy**: https://architectplatform.com/privacy

---

**Document Status**: ✅ Active  
**Next Review**: February 17, 2026  
**Maintainer**: Integration Engineering Team
