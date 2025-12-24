# API Documentation

> **The Architect Platform RESTful API** - Complete reference for all endpoints, authentication, and integration patterns.

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

---

## 📋 Endpoints Overview

| Category       | Endpoint                        | Auth        | Credits | Description              |
| -------------- | ------------------------------- | ----------- | ------- | ------------------------ |
| **Blueprints** | `GET /blueprints`               | ✅ Required | -       | List user blueprints     |
|                | `POST /blueprints`              | ✅ Required | 1       | Generate new blueprint   |
|                | `GET /blueprints/[id]`          | ✅ Required | -       | Get specific blueprint   |
|                | `PUT /blueprints/[id]`          | ✅ Required | -       | Update blueprint         |
| **Deployment** | `POST /deploy/[id]`             | ✅ Required | -       | Deploy to GitHub         |
| **Credits**    | `GET /credits`                  | ✅ Required | -       | User credit balance      |
| **System**     | `GET /health`                   | ❌ Optional | -       | System health status     |
|                | `GET /metrics`                  | ❌ Optional | -       | Performance metrics      |
| **Monitoring** | `GET /circuit-breakers/metrics` | ❌ Optional | -       | Circuit breaker status   |
|                | `POST /circuit-breakers/reset`  | ❌ Optional | -       | Reset circuit breakers   |
|                | `GET /cache/metrics`            | ❌ Optional | -       | Caching performance      |
|                | `GET /cache/enhanced-metrics`   | ❌ Optional | -       | Advanced cache analytics |
| **Webhooks**   | `POST /webhooks/clerk`          | ❌ N/A      | -       | Clerk user sync          |
|                | `POST /webhooks/stripe`         | ❌ N/A      | -       | Stripe payment events    |

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

### Credit System

Some operations require user credits:

- **Blueprint Generation**: 1 credit per blueprint
- **Credits Deducted**: Automatically on successful operations
- **Insufficient Credits**: Returns 402 Payment Required error

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

**API Version**: v1.0  
**Last Updated**: 2025-12-24  
**Production Status**: ✅ Ready for enterprise use
