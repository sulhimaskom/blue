# API Documentation

> **The Architect Platform RESTful API** - Complete reference for all endpoints, authentication, and integration patterns with enterprise-grade SDKs and deployment guides.

## 📚 Documentation Navigation

| Document                                                            | Purpose                                          | Audience                    |
| ------------------------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| **[SDK Reference - TypeScript/JavaScript](./SDK_REFERENCE.md)**     | Complete TypeScript/JavaScript SDK documentation | Frontend/Node.js Developers |
| **[SDK Reference - Python](./SDK_REFERENCE_PYTHON.md)**             | Complete Python SDK documentation                | Backend/Python Developers   |
| **[Enterprise Deployment Guide](./ENTERPRISE_DEPLOYMENT_GUIDE.md)** | Production deployment and integration patterns   | DevOps/Platform Engineers   |
| **[API Reference](./API.md)**                                       | RESTful API endpoints and patterns               | All Developers              |

---

## 🚀 Quick API Start

### Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication

- **Required**: Most endpoints require Clerk authentication
- **Header**: `Authorization: Bearer <clerk_session_token>`
- **Rate Limiting**: Redis-based distributed rate limiting per endpoint

### Rate Limiting

All API endpoints are protected by rate limiting to ensure system stability and prevent abuse:

| Category       | Max Requests | Time Window | Description                  |
| -------------- | ------------ | ----------- | ---------------------------- |
| **Strict**     | 3 requests   | 1 minute    | AI generation, deployment    |
| **Moderate**   | 10 requests  | 1 minute    | Write operations             |
| **Standard**   | 30 requests  | 1 minute    | Read operations with caching |
| **Permissive** | 60 requests  | 1 minute    | Public health/metrics        |
| **Webhook**    | 100 requests | 1 minute    | Incoming webhook processing  |

**Subscription Tier Multipliers:**

- **Free**: 1x base limits
- **Pro**: 5x base limits
- **Enterprise**: 10x base limits

**Rate Limit Headers:**
When rate limits are enforced, responses include:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets

**Response on Rate Limit Exceeded:**

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in X seconds."
}
```

---

## 📋 Endpoints Overview

| Category            | Endpoint                                   | Auth        | Credits | Rate Limit | Description              |
| ------------------- | ------------------------------------------ | ----------- | ------- | ---------- | ------------------------ |
| **Blueprints**      | `GET /blueprints`                          | ✅ Required | -       | Standard   | List user blueprints     |
|                     | `POST /blueprints`                         | ✅ Required | 1       | Strict     | Generate new blueprint   |
|                     | `GET /blueprints/[id]`                     | ✅ Required | -       | Standard   | Get specific blueprint   |
|                     | `PUT /blueprints/[id]`                     | ✅ Required | -       | Moderate   | Update blueprint         |
| **Deployment**      | `POST /deploy/[id]`                        | ✅ Required | -       | Strict     | Deploy to GitHub         |
| **Credits**         | `GET /credits`                             | ✅ Required | -       | Standard   | User credit balance      |
|                     | `POST /credits`                            | ✅ Required | -       | Moderate   | Purchase credits         |
| **System**          | `GET /health`                              | ❌ Optional | -       | Permissive | System health status     |
|                     | `GET /metrics`                             | ❌ Optional | -       | Permissive | Performance metrics      |
| **Monitoring**      | `GET /circuit-breakers/metrics`            | ❌ Optional | -       | Standard   | Circuit breaker status   |
|                     | `POST /circuit-breakers/reset`             | ❌ Optional | -       | Moderate   | Reset circuit breakers   |
|                     | `GET /cache/metrics`                       | ❌ Optional | -       | Standard   | Caching performance      |
|                     | `GET /cache/enhanced-metrics`              | ❌ Optional | -       | Standard   | Advanced cache analytics |
| **Webhooks**        | `POST /webhooks/clerk`                     | ❌ N/A      | -       | Webhook    | Clerk user sync          |
|                     | `POST /webhooks/stripe`                    | ❌ N/A      | -       | Webhook    | Stripe payment events    |
| **Enterprise**      | `GET /enterprise/themes`                   | ❌ Optional | -       | Standard   | List all themes          |
|                     | `POST /enterprise/themes`                  | ❌ Optional | -       | Moderate   | Create theme             |
|                     | `GET /enterprise/themes/[id]`              | ❌ Optional | -       | Standard   | Get specific theme       |
|                     | `PUT /enterprise/themes/[id]`              | ❌ Optional | -       | Moderate   | Update theme             |
|                     | `DELETE /enterprise/themes/[id]`           | ❌ Optional | -       | Moderate   | Delete theme             |
|                     | `POST /enterprise/themes/[id]/activate`    | ❌ Optional | -       | Moderate   | Activate theme           |
| **Performance**     | `GET /performance`                         | ❌ Optional | -       | Standard   | Performance report       |
|                     | `GET /performance/advanced-monitoring`     | ❌ Optional | -       | Standard   | Advanced monitoring      |
|                     | `POST /performance/advanced-monitoring`    | ❌ Optional | -       | Moderate   | Trigger optimization     |
|                     | `GET /performance/ai-cache-optimization`   | ❌ Optional | -       | Standard   | AI cache metrics         |
|                     | `GET /performance/optimization`            | ❌ Optional | -       | Standard   | Optimization data        |
|                     | `GET /performance/predictive-optimization` | ❌ Optional | -       | Standard   | Predictive optimization  |
|                     | `GET /performance/predictive`              | ❌ Optional | -       | Standard   | Predictive analysis      |
| **Projects**        | `GET /projects`                            | ✅ Required | -       | Standard   | List all projects        |
|                     | `POST /projects`                           | ✅ Required | -       | Moderate   | Create project           |
|                     | `GET /projects/[id]`                       | ✅ Required | -       | Standard   | Get specific project     |
|                     | `PUT /projects/[id]`                       | ✅ Required | -       | Moderate   | Update project           |
|                     | `DELETE /projects/[id]`                    | ✅ Required | -       | Moderate   | Delete project           |
|                     | `GET /projects/[id]/blueprints`            | ✅ Required | -       | Standard   | Get project blueprints   |
| **Validation**      | `POST /validate`                           | ❌ Optional | -       | Standard   | Validate blueprint data  |
| **Webhook Monitor** | `GET /webhooks/monitor`                    | ❌ Optional | -       | Standard   | Queue monitoring         |
|                     | `POST /webhooks/monitor`                   | ✅ Required | -       | Moderate   | Retry dead letter queue  |

---

## 🔐 Authentication & Authorization

### Clerk Integration

All protected endpoints require valid Clerk authentication:

```typescript
// Headers required for protected endpoints
headers: {
  "Authorization": "Bearer <clerk_session_token>",
  "Content-Type": "application/json"
}
```

---

## 🎨 Enterprise Theme Management

### GET /enterprise/themes

List all enterprise themes for white-label customization.

**Request:**

```http
GET /api/enterprise/themes
```

**Response:**

```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "customerId": "acme-corp",
        "brandName": "ACME Corporation",
        "primaryColor": "#1e40af",
        "secondaryColor": "#3b82f6",
        "accentColor": "#60a5fa",
        "logoUrl": "https://acme.com/logo.png",
        "faviconUrl": "https://acme.com/favicon.ico",
        "customCSS": {},
        "isActive": true,
        "createdAt": "2025-12-24T10:00:00Z"
      }
    ],
    "activeTheme": {
      "customerId": "acme-corp",
      "brandName": "ACME Corporation",
      "primaryColor": "#1e40af",
      "isActive": true
    },
    "total": 1
  }
}
```

---

### POST /enterprise/themes

Create a new enterprise theme for white-label customization.

**Request:**

```http
POST /api/enterprise/themes
Content-Type: application/json

{
  "brandName": "ACME Corporation",
  "primaryColor": "#1e40af",
  "secondaryColor": "#3b82f6",
  "accentColor": "#60a5fa",
  "logoUrl": "https://acme.com/logo.png",
  "faviconUrl": "https://acme.com/favicon.ico",
  "customCSS": {
    "primaryButton": "background-color: #1e40af;"
  },
  "isActive": false
}
```

**Parameters:**

- `brandName` (string, required) - Brand/company name
- `primaryColor` (string, required) - Hex color code (#RRGGBB)
- `secondaryColor` (string, required) - Hex color code (#RRGGBB)
- `accentColor` (string, required) - Hex color code (#RRGGBB)
- `logoUrl` (string, optional) - URL to logo image
- `faviconUrl` (string, optional) - URL to favicon
- `customCSS` (object, optional) - Custom CSS overrides
- `isActive` (boolean, optional) - Whether to activate immediately (default: false)

**Response:**

```json
{
  "success": true,
  "data": {
    "theme": {
      "customerId": "acme-corp",
      "brandName": "ACME Corporation",
      "primaryColor": "#1e40af",
      "secondaryColor": "#3b82f6",
      "accentColor": "#60a5fa",
      "logoUrl": "https://acme.com/logo.png",
      "isActive": false,
      "createdAt": "2025-12-24T10:00:00Z"
    },
    "message": "Enterprise theme created successfully"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error or duplicate theme
- `500 Internal Server Error` - Theme storage error

---

### GET /enterprise/themes/[customerId]

Get details of a specific enterprise theme.

**Request:**

```http
GET /api/enterprise/themes/acme-corp
```

**Response:**

```json
{
  "success": true,
  "data": {
    "customerId": "acme-corp",
    "brandName": "ACME Corporation",
    "primaryColor": "#1e40af",
    "secondaryColor": "#3b82f6",
    "accentColor": "#60a5fa",
    "logoUrl": "https://acme.com/logo.png",
    "faviconUrl": "https://acme.com/favicon.ico",
    "customCSS": {},
    "isActive": true,
    "createdAt": "2025-12-24T10:00:00Z"
  }
}
```

---

### PUT /enterprise/themes/[customerId]

Update an existing enterprise theme.

**Request:**

```http
PUT /api/enterprise/themes/acme-corp
Content-Type: application/json

{
  "primaryColor": "#2563eb",
  "secondaryColor": "#3b82f6",
  "accentColor": "#6366f1"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "customerId": "acme-corp",
    "brandName": "ACME Corporation",
    "primaryColor": "#2563eb",
    "secondaryColor": "#3b82f6",
    "accentColor": "#6366f1",
    "logoUrl": "https://acme.com/logo.png",
    "isActive": true,
    "updatedAt": "2025-12-24T11:00:00Z"
  },
  "message": "Theme updated successfully"
}
```

---

### DELETE /enterprise/themes/[customerId]

Delete an enterprise theme.

**Request:**

```http
DELETE /api/enterprise/themes/acme-corp
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "customerId": "acme-corp"
  },
  "message": "Theme deleted successfully"
}
```

---

### POST /enterprise/themes/[customerId]/activate

Activate a specific enterprise theme as the active white-label theme.

**Request:**

```http
POST /api/enterprise/themes/acme-corp/activate
```

**Response:**

```json
{
  "success": true,
  "data": {
    "activated": true,
    "customerId": "acme-corp",
    "activatedAt": "2025-12-24T12:00:00Z"
  },
  "message": "Enterprise theme activated successfully"
}
```

---

## ⚡ Performance Monitoring

### GET /performance

Get comprehensive system performance report with cache and database metrics.

**Request:**

```http
GET /api/performance?includeCache=true&includeDb=true&detailed=true
```

**Query Parameters:**

- `includeCache` (boolean, optional) - Include cache performance metrics
- `includeDb` (boolean, optional) - Include database performance metrics
- `detailed` (boolean, optional) - Include detailed performance report

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-12-24T10:00:00Z",
  "performanceScore": 92,
  "metrics": {
    "cache": {
      "totalRequests": 1250,
      "cacheHits": 975,
      "cacheMisses": 275,
      "avgCacheTime": 15,
      "avgDbTime": 45,
      "hitRate": 0.78,
      "performanceImprovement": 65,
      "cachePatterns": [],
      "recommendations": [
        "Consider pre-warming cache for frequently accessed patterns"
      ]
    },
    "database": {
      "totalQueries": 1250,
      "successRate": 99.2,
      "averageDuration": 45,
      "slowQueries": [],
      "recentErrors": [],
      "queryStats": {
        "user_lookup": { "count": 450, "avgDuration": 12, "errorRate": 0 },
        "blueprint_select": {
          "count": 300,
          "avgDuration": 25,
          "errorRate": 0.01
        }
      }
    }
  },
  "recommendations": [
    "Cache performance is excellent (78% hit rate)",
    "Database queries are performing optimally",
    "System performance score: 92/100"
  ]
}
```

---

### GET /performance/ai-cache-optimization

Get AI service cache optimization metrics and cost savings.

**Request:**

```http
GET /api/performance/ai-cache-optimization
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "aiCacheOptimization": {
      "totalRequests": 250,
      "cacheHits": 175,
      "cacheMisses": 75,
      "hitRate": 0.7,
      "estimatedCostSavings": 35.5,
      "patterns": {
        "marketplace": { "hitRate": 0.85, "savings": 12.25 },
        "ecommerce": { "hitRate": 0.8, "savings": 10.5 },
        "saas": { "hitRate": 0.75, "savings": 8.75 }
      }
    }
  }
}
```

---

### GET /performance/optimization

Get performance optimization recommendations and data.

**Request:**

```http
GET /api/performance/optimization
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "optimization": {
      "database": {
        "recommendations": [
          "Consider adding index on projects.status for dashboard queries",
          "Optimize user lookup queries with connection pooling"
        ],
        "potentialImprovement": "15-20%"
      },
      "cache": {
        "recommendations": [
          "Increase AI cache TTL from 30min to 45min for better hit rate",
          "Pre-warm cache for top 5 blueprint patterns"
        ],
        "potentialImprovement": "10-15%"
      },
      "ai": {
        "recommendations": [
          "Implement request deduplication for concurrent identical requests",
          "Add adaptive timeout based on pattern complexity"
        ],
        "potentialImprovement": "5-10%"
      }
    }
  }
}
```

---

### GET /performance/predictive-optimization

Get predictive performance optimization analysis.

**Request:**

```http
GET /api/performance/predictive-optimization
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "predictions": {
      "nextHour": {
        "expectedLoad": "medium",
        "predictedRequests": 150,
        "recommendations": [
          "Pre-warm cache for expected marketplace patterns",
          "Scale database connections to 20"
        ]
      },
      "next24Hours": {
        "expectedLoad": "high",
        "predictedRequests": 3600,
        "recommendations": [
          "Enable predictive cache pre-warming",
          "Consider scaling to 2 instances"
        ]
      },
      "anomalies": [],
      "healthScore": 92
    }
  }
}
```

---

### GET /performance/predictive

Get predictive performance analysis with trends and forecasts.

**Request:**

```http
GET /api/performance/predictive
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "predictiveAnalysis": {
      "currentPerformance": {
        "apiResponseTime": 125,
        "cacheHitRate": 0.78,
        "databaseQueryTime": 45,
        "healthScore": 92
      },
      "predictions": {
        "responseTime": {
          "current": 125,
          "predicted": 130,
          "trend": "stable",
          "confidence": 0.85
        },
        "cacheHitRate": {
          "current": 0.78,
          "predicted": 0.82,
          "trend": "improving",
          "confidence": 0.78
        }
      },
      "optimizations": [
        {
          "type": "cache",
          "priority": "high",
          "description": "Extend AI cache TTL for marketplace patterns",
          "expectedImpact": "+5% hit rate"
        },
        {
          "type": "database",
          "priority": "medium",
          "description": "Add composite index on dashboard queries",
          "expectedImpact": "-20ms query time"
        }
      ],
      "anomalies": []
    }
  }
}
```

---

## 📊 Webhook Queue Monitoring

### GET /webhooks/monitor

Get webhook queue statistics and monitoring data.

**Request:**

```http
GET /api/webhooks/monitor
```

**Response:**

```json
{
  "success": true,
  "data": {
    "queue": {
      "size": 5,
      "processingStats": {
        "processedEventsCount": 1250
      },
      "deadLetterQueue": {
        "size": 2,
        "events": [
          {
            "id": "webhook_abc123",
            "serviceName": "Stripe",
            "eventType": "payment_intent.succeeded",
            "attemptCount": 5,
            "createdAt": "2025-12-24T09:00:00Z",
            "processedAt": null
          }
        ]
      }
    }
  }
}
```

**Metrics Provided:**

- Queue size (pending events)
- Processed events count
- Dead letter queue size and events
- Retry attempt counts
- Event timestamps

---

### POST /webhooks/monitor

Retry failed webhook events from dead letter queue (admin operation).

**Request:**

```http
POST /api/webhooks/monitor
Authorization: Bearer <admin_token>
```

**Headers:**

- `Authorization: Bearer <admin_token>` - Admin authentication token (WEBHOOK_ADMIN_TOKEN env var)

**Response:**

```json
{
  "success": true,
  "data": {
    "retried": 2,
    "failed": 0,
    "message": "Retried 2 dead letter events"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing admin token
- `500 Internal Server Error` - Retry operation failed

---

## 📊 Blueprint Management

### GET /blueprints

List all blueprints for the authenticated user.

**Request:**

```http
GET /api/blueprints
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "E-commerce Platform",
      "description": "AI-generated e-commerce blueprint",
      "status": "completed",
      "createdAt": "2025-12-24T10:00:00Z",
      "version": 1
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `500 Internal Server Error` - Database connection issues

---

### POST /blueprints

Generate a new AI blueprint from user input.

**Request:**

```http
POST /api/blueprints
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": "I want to build a marketplace for rare sneakers with user authentication and payment processing",
  "projectName": "SneakerMarket"
}
```

**Parameters:**

- `input` (string, required) - 10-1000 characters, project description
- `projectName` (string, required) - 3-100 characters, project name

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "SneakerMarket",
    "status": "generating",
    "createdAt": "2025-12-24T10:00:00Z",
    "estimatedCompletion": "2025-12-24T10:02:00Z"
  },
  "message": "Blueprint generation started successfully"
}
```

**Rate Limiting:**

- 3 requests per minute per user
- Circuit breaker protection for AI services
- Automatic retry with exponential backoff

**Error Responses:**

- `400 Bad Request` - Input validation errors
- `401 Unauthorized` - Invalid authentication
- `402 Payment Required` - Insufficient credits
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - AI services unavailable

---

### GET /blueprints/[id]

Get detailed information about a specific blueprint.

**Request:**

```http
GET /api/blueprints/uuid
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "SneakerMarket",
    "description": "AI-generated e-commerce blueprint for sneaker marketplace",
    "status": "completed",
    "contentMarkdown": "# SneakerMarket Blueprint\n\n## Architecture...",
    "structuredData": {
      "techStack": ["Next.js", "PostgreSQL", "Stripe"],
      "features": ["User Auth", "Payments", "Marketplace"],
      "monetization": "Commission-based"
    },
    "marketResearch": {
      "marketSize": "$2.5B",
      "competitors": ["StockX", "GOAT"],
      "opportunities": ["Niche authentication", "Virtual try-on"]
    },
    "version": 1,
    "createdAt": "2025-12-24T10:00:00Z",
    "updatedAt": "2025-12-24T10:02:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `404 Not Found` - Blueprint not found or access denied
- `500 Internal Server Error` - Database error

---

### PUT /blueprints/[id]

Update an existing blueprint with user feedback.

**Request:**

```http
PUT /api/blueprints/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "feedback": "Add mobile app support and implement real-time notifications",
  "refineType": "enhancement"
}
```

**Parameters:**

- `feedback` (string, required) - User refinement request
- `refineType` (string, optional) - Type of refinement (enhancement, feature, fix)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "refining",
    "version": 2,
    "estimatedCompletion": "2025-12-24T10:05:00Z"
  },
  "message": "Blueprint refinement started"
}
```

---

## 📁 Project Management

### GET /projects

List all projects for the authenticated user.

**Request:**

```http
GET /api/projects
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "E-commerce Platform",
        "description": "AI-generated e-commerce platform",
        "status": "draft",
        "repoUrl": null,
        "createdAt": "2025-12-24T10:00:00Z"
      }
    ],
    "message": "Projects retrieved successfully"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `500 Internal Server Error` - Database error

---

### POST /projects

Create a new project.

**Request:**

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My E-commerce Project",
  "description": "Building a marketplace for rare sneakers"
}
```

**Parameters:**

- `name` (string, required) - 3-100 characters, project name
- `description` (string, optional) - Project description

**Response:**

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "My E-commerce Project",
      "description": "Building a marketplace for rare sneakers",
      "status": "draft",
      "createdAt": "2025-12-24T10:00:00Z"
    },
    "message": "Project created successfully"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (name length, etc.)
- `401 Unauthorized` - Invalid authentication
- `500 Internal Server Error` - Database error

---

### GET /projects/[id]

Get details of a specific project with blueprint count.

**Request:**

```http
GET /api/projects/uuid
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "E-commerce Platform",
      "description": "AI-generated e-commerce platform",
      "status": "completed",
      "repoUrl": "https://github.com/myorg/ecommerce-platform",
      "blueprintCount": 3,
      "createdAt": "2025-12-24T10:00:00Z"
    },
    "message": "Project retrieved successfully"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `404 Not Found` - Project not found or access denied
- `500 Internal Server Error` - Database error

---

### PUT /projects/[id]

Update an existing project.

**Request:**

```http
PUT /api/projects/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "Updated Project Name",
      "description": "Updated description",
      "status": "draft",
      "createdAt": "2025-12-24T10:00:00Z"
    },
    "message": "Project updated successfully"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `404 Not Found` - Project not found or access denied
- `500 Internal Server Error` - Database error

---

### DELETE /projects/[id]

Delete a project and all associated blueprints.

**Request:**

```http
DELETE /api/projects/uuid
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "E-commerce Platform",
      "status": "draft",
      "createdAt": "2025-12-24T10:00:00Z"
    },
    "message": "Project deleted successfully"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid authentication
- `404 Not Found` - Project not found or access denied
- `500 Internal Server Error` - Database error

---

### GET /projects/[id]/blueprints

Get all blueprints for a specific project.

**Request:**

```http
GET /api/projects/uuid/blueprints
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "blueprints": [
      {
        "id": "uuid",
        "projectId": "project_uuid",
        "name": "Initial Blueprint",
        "version": 1,
        "status": "completed",
        "createdAt": "2025-12-24T10:00:00Z"
      }
    ],
    "total": 1
  }
}
```

---

## 🚀 Deployment

### POST /deploy/[id]

Deploy blueprint to GitHub repository.

**Request:**

```http
POST /api/deploy/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "githubOrg": "myorganization",
  "repoName": "sneaker-market",
  "isPrivate": false
}
```

**Parameters:**

- `githubOrg` (string, required) - Target GitHub organization
- `repoName` (string, required) - Repository name (3-100 chars)
- `isPrivate` (boolean, optional) - Repository visibility (default: false)

**Response:**

```json
{
  "success": true,
  "data": {
    "repository": {
      "id": 12345,
      "name": "sneaker-market",
      "fullName": "myorganization/sneaker-market",
      "htmlUrl": "https://github.com/myorganization/sneaker-market",
      "isPrivate": false
    },
    "deployment": {
      "status": "completed",
      "commitSha": "abc123def456",
      "branch": "main"
    }
  },
  "message": "Repository created and blueprint deployed successfully"
}
```

**GitHub Integration:**

- Uses GitHub App API for higher rate limits
- Automatic blueprint.md injection to repository
- Comprehensive error handling and fallback to PAT
- Circuit breaker protection for GitHub API

**Error Responses:**

- `400 Bad Request` - Invalid repository details
- `401 Unauthorized` - Invalid authentication or GitHub permissions
- `402 Payment Required` - Insufficient credits
- `409 Conflict` - Repository already exists
- `422 Unprocessable Entity` - GitHub API validation error
- `503 Service Unavailable` - GitHub API unavailable

---

## 💳 Credits

### GET /credits

Get user credit balance and transaction history.

**Request:**

```http
GET /api/credits
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "credits": 25,
    "subscriptionTier": "pro",
    "transactions": [
      {
        "id": "uuid",
        "amount": 1000,
        "creditsAdded": 10,
        "type": "purchase",
        "stripePaymentId": "pi_1234567890",
        "createdAt": "2025-12-24T09:00:00Z"
      },
      {
        "id": "uuid",
        "amount": -100,
        "creditsAdded": null,
        "type": "usage",
        "description": "Blueprint generation",
        "createdAt": "2025-12-24T10:00:00Z"
      }
    ]
  }
}
```

---

## 🏥 System Health

### GET /health

Get system health status and service availability.

**Request:**

```http
GET /api/health
# Optional: ?detailed=true for comprehensive health check
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-24T10:00:00Z",
    "services": {
      "database": {
        "service": "database",
        "status": "healthy",
        "responseTime": 12,
        "metadata": {
          "connections": 5,
          "maxConnections": 50,
          "idleTimeout": 15
        }
      },
      "redis": {
        "service": "redis",
        "status": "healthy",
        "responseTime": 3,
        "metadata": {
          "connected": true,
          "memoryUsage": "25MB"
        }
      },
      "ai-iflow": {
        "service": "ai-iflow",
        "status": "healthy",
        "responseTime": 245,
        "metadata": {
          "circuitState": "CLOSED",
          "successRate": "98%"
        }
      },
      "research-tavily": {
        "service": "research-tavily",
        "status": "healthy",
        "responseTime": 189,
        "metadata": {
          "circuitState": "CLOSED",
          "successRate": "95%"
        }
      },
      "github-api": {
        "service": "github-api",
        "status": "healthy",
        "responseTime": 156,
        "metadata": {
          "circuitState": "CLOSED",
          "successRate": "100%"
        }
      }
    },
    "system": {
      "uptime": 86400,
      "version": "1.0.0",
      "nodeVersion": "v20.11.0",
      "environment": "production"
    }
  }
}
```

**Caching:**

- Response cached for 15 seconds
- ETag support for conditional requests
- Cache invalidation on service state changes

---

## 📈 Performance Metrics

### GET /metrics

Get detailed system performance metrics.

**Request:**

```http
GET /api/metrics
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "api": {
      "requestsPerMinute": 45,
      "averageResponseTime": 125,
      "errorRate": 0.02,
      "statusCodes": {
        "200": 43,
        "400": 1,
        "500": 1
      }
    },
    "database": {
      "connectionPool": {
        "active": 5,
        "idle": 10,
        "total": 15,
        "max": 50
      },
      "queries": {
        "total": 1250,
        "slow": 2,
        "averageTime": 12
      }
    },
    "cache": {
      "hitRate": 0.78,
      "missRate": 0.22,
      "evictions": 15,
      "memoryUsage": "125MB"
    },
    "ai": {
      "iflow": {
        "requests": 25,
        "successRate": 0.96,
        "averageTime": 1250
      },
      "tavily": {
        "requests": 12,
        "successRate": 0.98,
        "averageTime": 890
      }
    }
  }
}
```

**Caching:**

- Response cached for 10 seconds
- Real-time performance monitoring
- Historical trend analysis

---

## ⚡ Circuit Breaker Management

### GET /circuit-breakers/metrics

Get circuit breaker status for all external services.

**Request:**

```http
GET /api/circuit-breakers/metrics
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "circuitBreakers": {
      "ai-iflow": {
        "state": "CLOSED",
        "failureCount": 0,
        "successCount": 45,
        "totalCalls": 45,
        "totalFailures": 0,
        "totalSuccesses": 45,
        "successRate": 1.0,
        "isAvailable": true,
        "config": {
          "failureThreshold": 3,
          "timeout": 60000,
          "recoveryPeriod": 120000
        }
      },
      "research-tavily": {
        "state": "CLOSED",
        "failureCount": 1,
        "successCount": 23,
        "totalCalls": 24,
        "totalFailures": 1,
        "totalSuccesses": 23,
        "successRate": 0.96,
        "isAvailable": true,
        "config": {
          "failureThreshold": 5,
          "timeout": 45000,
          "recoveryPeriod": 180000
        }
      }
    }
  }
}
```

### POST /circuit-breakers/reset

Manually reset circuit breakers (admin operation).

**Request:**

```http
POST /api/circuit-breakers/reset
Content-Type: application/json

{
  "service": "ai-iflow" // Optional: reset specific service
}
```

**Response:**

```json
{
  "success": true,
  "message": "Circuit breaker reset successfully",
  "data": {
    "resetService": "ai-iflow",
    "newState": "CLOSED",
    "resetAt": "2025-12-24T10:00:00Z"
  }
}
```

---

## 🗄️ Caching Analytics

### GET /cache/metrics

Get basic caching performance metrics.

**Request:**

```http
GET /api/cache/metrics
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "performance": {
      "hitRate": 0.78,
      "missRate": 0.22,
      "totalRequests": 1250,
      "cacheHits": 975,
      "cacheMisses": 275
    },
    "patterns": {
      "ai-responses": {
        "hitRate": 0.85,
        "estimatedSavings": "$12.50"
      },
      "research-data": {
        "hitRate": 0.72,
        "estimatedSavings": "$8.25"
      }
    }
  }
}
```

### GET /cache/enhanced-metrics

Get comprehensive caching analytics with intelligent insights.

**Request:**

```http
GET /api/cache/enhanced-metrics
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-12-24T10:00:00Z",
    "performance": {
      "hitRate": 0.78,
      "p95ResponseTime": 45,
      "p99ResponseTime": 125,
      "throughput": 1250,
      "costSavings": 25.75
    },
    "patterns": {
      "blueprint-marketplace": {
        "hitRate": 0.92,
        "estimatedSavings": "$15.75",
        "recommendations": ["Extend TTL to 45min"]
      },
      "blueprint-ecommerce": {
        "hitRate": 0.88,
        "estimatedSavings": "$12.25",
        "recommendations": ["Pre-warm during peak hours"]
      }
    },
    "health": {
      "redis": {
        "status": "healthy",
        "memoryUsage": "45%",
        "connectionPool": 8
      },
      "grade": "A+",
      "recommendations": [
        "Consider increasing connection pool during peak hours",
        "Pattern pre-warming is performing excellently"
      ]
    }
  }
}
```

---

## 🔗 Webhooks

### POST /webhooks/clerk

Handle Clerk user synchronization events.

**Request:**

```http
POST /api/webhooks/clerk
Content-Type: application/json
Clerk-Signature: <signature>

{
  "type": "user.created",
  "data": {
    "id": "user_12345",
    "email_addresses": ["user@example.com"],
    "created_at": 1672531200000
  }
}
```

**Security:**

- Webhook signature verification
- Event type validation
- Automatic user creation/update

### POST /webhooks/stripe

Handle Stripe payment and subscription events.

**Request:**

```http
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 1000,
      "currency": "usd"
    }
  }
}
```

---

## 🚨 Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "input",
      "issue": "Input must be at least 10 characters"
    },
    "requestId": "req_abc123def456",
    "timestamp": "2025-12-24T10:00:00Z"
  }
}
```

### Common Error Codes

| Code                   | HTTP Status | Description                        |
| ---------------------- | ----------- | ---------------------------------- |
| `VALIDATION_ERROR`     | 400         | Request validation failed          |
| `UNAUTHORIZED`         | 401         | Authentication required or invalid |
| `INSUFFICIENT_CREDITS` | 402         | Not enough credits for operation   |
| `NOT_FOUND`            | 404         | Resource not found                 |
| `RATE_LIMITED`         | 429         | Too many requests                  |
| `SERVICE_UNAVAILABLE`  | 503         | External service unavailable       |
| `INTERNAL_ERROR`       | 500         | Server error                       |

---

## 🔧 Integration Examples

### JavaScript/TypeScript Client

```typescript
class ArchitectPlatformAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async generateBlueprint(input: string, projectName: string) {
    const response = await fetch(`${this.baseUrl}/blueprints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input, projectName }),
    });

    return response.json();
  }

  async deployToGitHub(blueprintId: string, org: string, repoName: string) {
    const response = await fetch(`${this.baseUrl}/deploy/${blueprintId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ githubOrg: org, repoName, isPrivate: false }),
    });

    return response.json();
  }
}
```

### cURL Examples

```bash
# Generate Blueprint
curl -X POST https://your-domain.com/api/blueprints \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"input":"Build a fitness tracking app","projectName":"FitTracker"}'

# Get System Health
curl https://your-domain.com/api/health?detailed=true

# Deploy to GitHub
curl -X POST https://your-domain.com/api/deploy/uuid \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"githubOrg":"myorg","repoName":"my-repo","isPrivate":false}'
```

---

## 📊 Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1672531200
```

### Endpoint-Specific Limits

- **Blueprint Generation**: 3 requests/minute
- **General API**: 100 requests/minute
- **Health Checks**: No limit
- **Metrics**: 10 requests/minute

---

## 🔍 Monitoring & Debugging

### Request Tracing

Every API response includes a `requestId` for tracing:

```json
{
  "requestId": "req_abc123def456",
  "timestamp": "2025-12-24T10:00:00Z"
}
```

### Structured Logging

All API operations are logged with:

- Correlation IDs
- User actions
- Performance metrics
- Error details

---

## 🏢 Enterprise Integration

### Official SDKs

We provide production-ready SDKs for TypeScript/JavaScript and Python with comprehensive type safety, error handling, and enterprise features.

#### TypeScript/JavaScript SDK

```bash
# Install the official SDK
npm install @architect-platform/sdk
# or
yarn add @architect-platform/sdk
# or
pnpm add @architect-platform/sdk
```

```typescript
import { ArchitectPlatform } from "@architect-platform/sdk";

// Initialize with enterprise configuration
const client = new ArchitectPlatform({
  apiKey: process.env.ARCHITECT_API_KEY,
  baseUrl: "https://api.architect-platform.com",
  timeout: 120000, // 2 minutes
  retryAttempts: 3, // Automatic retry
  enableLogging: true, // Development logging
  webhookSecret: process.env.WEBHOOK_SECRET, // Webhook validation
});

// Generate blueprint with enterprise features
const blueprint = await client.blueprints.generate({
  input: "AI-powered SaaS platform for project management",
  projectName: "ProjectAI",
  options: {
    timeout: 180000, // Extended timeout
    retryAttempts: 5, // More retries for enterprises
    enableCache: true, // Intelligent caching
    priority: "high", // Enterprise priority queue
    metadata: {
      industry: "fintech",
      enterpriseId: "acme-corp",
    },
  },
});

// Monitor with webhook notifications
await client.blueprints.generate({
  input: "Enterprise AI platform",
  projectName: "EnterpriseAI",
  webhooks: {
    onCompleted: "https://your-app.com/webhooks/blueprint-completed",
    onFailed: "https://your-app.com/webhooks/blueprint-failed",
  },
});
```

**📖 Complete TypeScript SDK Reference:** [See detailed documentation](./SDK_REFERENCE.md)

#### Python SDK

```bash
# Install the official Python SDK
pip install architect-platform-sdk
# or with poetry
poetry add architect-platform-sdk
# or with conda
conda install -c conda-forge architect-platform-sdk
```

```python
import asyncio
from architect_platform import ArchitectPlatform, ArchitectConfig

# Enterprise configuration
config = ArchitectConfig(
    api_key=os.getenv("ARCHITECT_API_KEY"),
    base_url="https://api.architect-platform.com",
    timeout=180.0,          # 3 minutes for enterprise workloads
    retry_attempts=5,       # Enterprise-grade retry
    enable_logging=True,    # Comprehensive logging
    webhook_secret=os.getenv("WEBHOOK_SECRET"),
    custom_headers={
        "X-Enterprise-ID": "acme-corp",
        "X-Client-Version": "1.0.0",
    },
)

async def enterprise_workflow():
    client = ArchitectPlatform(config)

    # Generate with enterprise features
    blueprint = await client.blueprints.generate(
        input="Machine learning platform for predictive analytics",
        project_name="PredictML",
        options=GenerationOptions(
            timeout=300.0,      # 5 minutes for complex projects
            retry_attempts=8,
            priority="high",
            metadata={
                "industry": "healthcare",
                "compliance": ["HIPAA", "SOC2"],
                "target_users": "10000-50000",
            },
        )
    )

    # Deploy with enterprise GitHub configuration
    deployment = await client.deployments.to_github(
        blueprint_id=blueprint.id,
        options=GitHubDeploymentOptions(
            github_org="acme-corp",
            repo_name="predictml-platform",
            is_private=True,
            collaborators=["ml-engineer", "devops-lead"],
            topics=["ml-platform", "enterprise", "ai"],
        )
    )

    return deployment

# Run enterprise workflow
result = asyncio.run(enterprise_workflow())
```

**📖 Complete Python SDK Reference:** [See detailed documentation](./SDK_REFERENCE_PYTHON.md)

### SDK Features Comparison

| Feature                    | TypeScript SDK       | Python SDK             | Description                       |
| -------------------------- | -------------------- | ---------------------- | --------------------------------- |
| **Type Safety**            | ✅ Native TypeScript | ✅ Full Type Hints     | Compile-time error prevention     |
| **Async Support**          | ✅ Promises/Await    | ✅ Async/Await         | Non-blocking operations           |
| **Retry Logic**            | ✅ Configurable      | ✅ Exponential Backoff | Automatic failure recovery        |
| **Circuit Breaker**        | ✅ Built-in          | ✅ Built-in            | Service degradation protection    |
| **Webhook Validation**     | ✅ HMAC-SHA256       | ✅ HMAC-SHA256         | Secure webhook processing         |
| **Performance Monitoring** | ✅ Detailed Metrics  | ✅ Detailed Metrics    | Real-time performance data        |
| **Batch Operations**       | ✅ Optimized         | ✅ Concurrent          | Bulk processing efficiency        |
| **Enterprise Features**    | ✅ Complete          | ✅ Complete            | Priority queues, custom headers   |
| **Development Tools**      | ✅ Mocking/Testing   | ✅ Mocking/Testing     | Comprehensive development support |

### Enterprise Features

**Webhook Management:**

```typescript
// Configure webhooks for real-time updates
await client.webhooks.configure({
  url: "https://your-app.com/webhooks/architect",
  events: ["blueprint.completed", "deployment.ready", "error.occurred"],
  secret: "webhook-secret-key",
  retry_policy: {
    max_attempts: 5,
    backoff_strategy: "exponential",
  },
});
```

**Bulk Operations:**

```typescript
// Batch blueprint generation for enterprise workflows
const batch = await client.blueprints.batchGenerate([
  { input: "E-commerce platform", projectName: "ShopPlus" },
  { input: "Learning management system", projectName: "EduLearn" },
  { input: "Healthcare portal", projectName: "HealthConnect" },
]);
```

---

## 🛡️ Security & Compliance

### Data Protection

- **Encryption**: All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- **Data Retention**: Blueprint data retained for 365 days, then archived
- **GDPR Compliance**: Full data portability and deletion capabilities
- **SOC 2 Type II**: Compliance documentation available for enterprise customers

### API Security

**Authentication Methods:**

```http
# Method 1: Clerk Session Token (Recommended)
Authorization: Bearer <clerk_session_token>

# Method 2: API Key (Service-to-Service)
X-API-Key: sk_arch_live_1234567890abcdef

# Method 3: JWT (Enterprise SSO)
Authorization: Bearer <jwt_token>
```

**Rate Limiting Tiers:**

| Tier       | Requests/Minute | Burst | Features                          |
| ---------- | --------------- | ----- | --------------------------------- |
| Free       | 10              | 20    | Basic blueprint generation        |
| Pro        | 100             | 200   | Priority queue, advanced features |
| Enterprise | 1000            | 2000  | Dedicated resources, SLA          |

**Input Validation & Sanitization:**

All inputs are automatically:

- Validated against Zod schemas
- Sanitized for XSS prevention
- Size-limited to prevent abuse
- Scanned for malicious patterns

---

## 📊 Analytics & Insights

### Usage Analytics

```typescript
// Get detailed usage analytics
const analytics = await client.analytics.getUsage({
  dateRange: "2025-12-01:2025-12-31",
  granularity: "day",
  metrics: ["blueprints_generated", "credits_used", "api_calls"],
});

console.log("Blueprints generated:", analytics.blueprintsGenerated);
console.log("Total cost:", analytics.totalCost);
console.log("Popular patterns:", analytics.topPatterns);
```

### Performance Monitoring

```typescript
// Real-time performance monitoring
const monitoring = await client.monitoring.getMetrics({
  services: ["ai-iflow", "research-tavily", "github-api"],
  timeWindow: "1h",
  includeAlerts: true,
});

// Alert on performance degradation
if (monitoring.aiIflow.averageResponseTime > 3000) {
  await client.alerts.create({
    type: "performance_degradation",
    service: "ai-iflow",
    threshold: 3000,
    currentValue: monitoring.aiIflow.averageResponseTime,
  });
}
```

---

## 🚀 Production Deployment Guide

### Environment Setup

**Required Environment Variables:**

```bash
# Core Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_1234567890
CLERK_SECRET_KEY=sk_live_1234567890
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI Services
IFLOW_API_KEY=sk_iflow_1234567890
IFLOW_BASE_URL=https://api.models.dev/v1
TAVILY_API_KEY=tvly_1234567890

# Infrastructure
REDIS_URL=redis://user:pass@host:6379
GITHUB_ACCESS_TOKEN=github_pat_1234567890

# Monitoring (Optional)
SENTRY_DSN=https://1234567890@o123456.ingest.sentry.io/123456
```

**Docker Deployment:**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build application
COPY . .
RUN npm run build

# Production image
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: architect-platform
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
          image: architect-platform:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: architect-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: architect-secrets
                  key: redis-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
```

### Scaling Considerations

**Horizontal Scaling:**

- **App Instances**: 3-5 instances per 10,000 MAU
- **Database**: Read replicas for read-heavy workloads
- **Redis**: Cluster mode for high availability
- **CDN**: CloudFlare for static asset delivery

**Performance Optimization:**

```typescript
// Enable advanced caching for production
const cacheConfig = {
  aiResponses: {
    ttl: 1800000, // 30 minutes
    maxSize: 1000,
    strategy: "lru",
  },
  apiResponses: {
    ttl: 15000, // 15 seconds
    enableCompression: true,
    varyHeaders: ["authorization"],
  },
};
```

---

## 🔧 Advanced Configuration

### Custom AI Models

```typescript
// Configure custom AI models for specific use cases
const customConfig = {
  aiModels: {
    "architect-advanced": {
      provider: "iflow",
      model: "claude-3-opus",
      temperature: 0.1,
      maxTokens: 4000,
      systemPrompt: "You are an expert software architect...",
    },
    "analyst-research": {
      provider: "tavily",
      searchDepth: "advanced",
      includeDomains: ["github.com", "stackoverflow.com", "medium.com"],
      excludeDomains: ["spam-site.com"],
    },
  },
};
```

### Blueprint Templates

```typescript
// Create custom blueprint templates
const template = await client.templates.create({
  name: "SaaS Starter",
  category: "business",
  structure: {
    techStack: ["Next.js", "PostgreSQL", "Stripe", "Clerk"],
    features: ["Authentication", "Payments", "Dashboard"],
    architecture: "microservices",
  },
  customizations: {
    databases: ["postgresql", "mysql", "mongodb"],
    authProviders: ["clerk", "auth0", "firebase"],
    deployment: ["vercel", "aws", "digitalocean"],
  },
});
```

---

## 📈 Monitoring & Observability

### OpenTelemetry Integration

```typescript
import { trace } from "@opentelemetry/api";

// Automatic distributed tracing
const tracer = trace.getTracer("architect-platform");

const span = tracer.startSpan("blueprint-generation");
try {
  const blueprint = await generateBlueprint(input);
  span.setAttributes({
    "blueprint.id": blueprint.id,
    "blueprint.type": blueprint.type,
    "generation.time": blueprint.generationTime,
  });
  return blueprint;
} finally {
  span.end();
}
```

### Prometheus Metrics

```typescript
// Custom metrics for monitoring
const blueprintGenerationCounter = new Counter({
  name: "blueprint_generations_total",
  help: "Total number of blueprint generations",
  labelNames: ["status", "user_tier"],
});

const blueprintGenerationDuration = new Histogram({
  name: "blueprint_generation_duration_seconds",
  help: "Blueprint generation duration",
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
```

---

## 🤝 Partner Integration

### Reseller API

```typescript
// Partner/reseller integration
const partnerClient = new ArchitectPartner({
  partnerId: "partner_12345",
  apiKey: "sk_partner_live_1234567890",
});

// Create customer account
const customer = await partnerClient.customers.create({
  email: "enterprise@example.com",
  tier: "enterprise",
  customLimits: {
    blueprintsPerMonth: 1000,
    apiCallsPerMinute: 5000,
  },
});

// Allocate credits
await partnerClient.credits.allocate({
  customerId: customer.id,
  amount: 10000,
  reason: "Enterprise package - Q1 2025",
});
```

### White-Label Solutions

```typescript
// White-label configuration
const whiteLabelConfig = {
  branding: {
    logo: "https://your-brand.com/logo.png",
    primaryColor: "#1e40af",
    customDomain: "platform.your-company.com",
  },
  features: {
    customModels: true,
    advancedAnalytics: true,
    prioritySupport: true,
  },
  limits: {
    storage: "1TB",
    bandwidth: "10TB/month",
    concurrentUsers: 100,
  },
};
```

---

## 📞 Support & SLA

### Support Channels

| Channel            | Response Time | Availability   |
| ------------------ | ------------- | -------------- |
| Basic Support      | 48 hours      | Business hours |
| Pro Support        | 24 hours      | 24/7           |
| Enterprise Support | 1 hour        | 24/7/365       |
| Dedicated Support  | 15 minutes    | 24/7/365       |

### SLA Tiers

**Uptime Guarantees:**

- **Basic**: 99.5% uptime
- **Pro**: 99.9% uptime
- **Enterprise**: 99.99% uptime
- **Dedicated**: 99.999% uptime

**Performance Guarantees:**

- **API Response Time**: <200ms (95th percentile)
- **Blueprint Generation**: <2 minutes (average)
- **Database Queries**: <50ms (average)

---

**API Version**: v1.0  
**Last Updated**: 2025-12-24  
**Production Status**: ✅ World-class enterprise ready  
**Compliance**: SOC 2 Type II, GDPR, CCPA  
**Support**: 24/7 enterprise support available
