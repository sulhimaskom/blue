# Webhook Events and Configuration API

## Overview

The Architect Platform provides a comprehensive webhook system for real-time event notifications and third-party integrations. Webhooks enable external systems to receive instant notifications when specific events occur within the platform.

## Features

- **Multi-Service Support**: Platform events, Clerk authentication, Stripe payments, and GitHub integrations
- **Flexible Filtering**: Subscribe to specific events with filter expressions
- **Automatic Retry**: Built-in retry logic with exponential backoff for failed deliveries
- **Signature Validation**: HMAC-SHA256 signed payloads for security
- **Dead Letter Queue**: Failed events are tracked and can be retried
- **Real-time Monitoring**: Queue statistics and delivery history tracking

## Webhook Configuration Endpoints

### Create Webhook Configuration

`POST /api/webhooks/configure`

Create a new webhook configuration for receiving event notifications.

**Authentication**: Required (Clerk)  
**Rate Limit**: Moderate (10 requests/minute)  
**Credits Required**: 10 credits

**Request Body:**
```json
{
  "name": "My Webhook",
  "url": "https://your-app.com/webhooks/architect",
  "secret": "your-webhook-secret-at-least-32-chars",
  "eventTypes": ["project.created", "project.updated"],
  "isActive": true,
  "retryCount": 3,
  "timeoutSeconds": 30
}
```

**Parameters:**
- `name` (string, required, 1-100 chars) - Display name for the webhook
- `url` (string, required) - HTTPS URL for receiving webhook events
- `secret` (string, required, min 32 chars) - Signing secret for HMAC validation
- `eventTypes` (array, required, min 1 item) - List of event types to subscribe to
- `isActive` (boolean, optional) - Enable/disable webhook (default: true)
- `retryCount` (number, optional, 0-10) - Maximum retry attempts (default: 3)
- `timeoutSeconds` (number, optional, 5-300) - Request timeout in seconds (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_uuid",
    "name": "My Webhook",
    "url": "https://your-app.com/webhooks/architect",
    "eventTypes": ["project.created", "project.updated"],
    "isActive": true,
    "retryCount": 3,
    "timeoutSeconds": 30,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Webhook configuration created successfully"
}
```

### List Webhook Configurations

`GET /api/webhooks/configure`

Retrieve all webhook configurations for the authenticated user.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "webhook_uuid",
      "name": "My Webhook",
      "url": "https://your-app.com/webhooks/architect",
      "eventTypes": ["project.created", "project.updated"],
      "isActive": true,
      "retryCount": 3,
      "timeoutSeconds": 30,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Webhook configurations retrieved successfully"
}
```

### Get Webhook Configuration

`GET /api/webhooks/configure/[id]`

Retrieve details of a specific webhook configuration.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_uuid",
    "name": "My Webhook",
    "url": "https://your-app.com/webhooks/architect",
    "eventTypes": ["project.created", "project.updated"],
    "isActive": true,
    "retryCount": 3,
    "timeoutSeconds": 30,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Webhook configuration retrieved successfully"
}
```

### Update Webhook Configuration

`PUT /api/webhooks/configure/[id]`

Update an existing webhook configuration. Note: The `secret` field cannot be updated via this endpoint; use the rotate-secret endpoint instead.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Request Body:**
```json
{
  "name": "Updated Webhook Name",
  "url": "https://your-app.com/webhooks/architect-v2",
  "eventTypes": ["project.created", "project.updated", "project.deleted"],
  "isActive": false,
  "retryCount": 5,
  "timeoutSeconds": 60
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_uuid",
    "name": "Updated Webhook Name",
    "url": "https://your-app.com/webhooks/architect-v2",
    "eventTypes": ["project.created", "project.updated", "project.deleted"],
    "isActive": false,
    "retryCount": 5,
    "timeoutSeconds": 60,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Webhook configuration updated successfully"
}
```

### Delete Webhook Configuration

`DELETE /api/webhooks/configure/[id]`

Delete a webhook configuration. All associated subscriptions will be deleted.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_uuid"
  },
  "message": "Webhook configuration deleted successfully"
}
```

### Test Webhook Delivery

`POST /api/webhooks/configure/[id]/test`

Test webhook delivery with a sample event payload.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Request Body:**
```json
{
  "eventType": "project.created",
  "payload": {
    "projectId": "test_project",
    "projectName": "Test Project",
    "userId": 12345
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "delivered": true,
    "statusCode": 200,
    "responseTime": 123
  },
  "message": "Webhook test delivered successfully"
}
```

### Rotate Webhook Secret

`POST /api/webhooks/configure/[id]/rotate-secret`

Rotate the webhook signing secret for enhanced security. The old secret will become invalid immediately.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_uuid",
    "secret": "new-webhook-secret-at-least-32-chars",
    "rotatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Webhook secret rotated successfully"
}
```

**Important:** The new secret is only shown once. Save it securely and update your webhook handler immediately.

## Webhook Subscription Endpoints

### Create Event Subscription

`POST /api/webhooks/[id]/events`

Subscribe to specific event types for a webhook configuration.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Request Body:**
```json
{
  "webhookConfigurationId": "webhook_uuid",
  "eventType": "project.created",
  "filterExpression": "data.userId == 12345"
}
```

**Parameters:**
- `webhookConfigurationId` (string, required) - UUID of the webhook configuration
- `eventType` (enum, required) - One of the available event types (see Event Types section)
- `filterExpression` (string, optional, max 255 chars) - Filter expression to subset events

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_uuid",
    "webhookConfigurationId": "webhook_uuid",
    "eventType": "project.created",
    "filterExpression": "data.userId == 12345",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Webhook subscription created successfully"
}
```

### List Subscriptions

`GET /api/webhooks/subscriptions`

List webhook subscriptions with optional filtering.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Query Parameters:**
- `webhookId` (string, required) - Filter by webhook configuration ID
- `eventType` (string, optional) - Filter by event type
- `active` (boolean, optional) - Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "subscription_uuid",
        "webhookConfigurationId": "webhook_uuid",
        "eventType": "project.created",
        "filterExpression": "data.userId == 12345",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "filters": {
      "webhookId": "webhook_uuid",
      "eventType": "project.created",
      "active": true
    }
  },
  "message": "Webhook subscriptions retrieved successfully"
}
```

### Update Subscription

`PUT /api/webhooks/subscriptions/[id]`

Update an existing webhook subscription.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Request Body:**
```json
{
  "filterExpression": "data.userId == 67890",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_uuid",
    "filterExpression": "data.userId == 67890",
    "isActive": false,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Webhook subscription updated successfully"
}
```

### Delete Subscription

`DELETE /api/webhooks/subscriptions/[id]`

Delete a webhook subscription.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "subscription_uuid"
  },
  "message": "Webhook subscription deleted successfully"
}
```

## Webhook Monitoring Endpoints

### Get Queue Statistics

`GET /api/webhooks/monitor`

Retrieve webhook queue statistics and monitoring data.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "queue": {
      "size": 15,
      "processingStats": {
        "processedEventsCount": 1250
      },
      "deadLetterQueue": {
        "size": 3,
        "events": [
          {
            "id": "event_uuid",
            "serviceName": "webhook_delivery",
            "eventType": "project.created",
            "attemptCount": 3,
            "createdAt": "2024-01-01T00:00:00.000Z",
            "processedAt": "2024-01-01T00:01:30.000Z"
          }
        ]
      }
    }
  },
  "message": "Webhook queue statistics retrieved successfully"
}
```

### Retry Dead Letter Queue

`POST /api/webhooks/monitor`

Retry failed webhook events from the dead letter queue (admin operation).

**Authentication**: Admin token required  
**Rate Limit**: Moderate (10 requests/minute)

**Headers:**
```
Authorization: Bearer <WEBHOOK_ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "retried": 2,
    "failed": 1
  },
  "message": "Retried 2 dead letter events"
}
```

### Get Delivery History

`GET /api/webhooks/history`

Retrieve webhook event delivery history.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Query Parameters:**
- `configId` (string, optional) - Filter by webhook configuration ID
- `limit` (number, optional) - Number of results to return (default: 50)
- `offset` (number, optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event_uuid",
        "webhookId": "webhook_uuid",
        "eventType": "project.created",
        "status": "success",
        "attemptCount": 1,
        "responseCode": 200,
        "deliveredAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 125
    }
  },
  "message": "Webhook delivery history retrieved successfully"
}
```

### Get Event Details

`GET /api/webhooks/history/[id]`

Retrieve detailed information about a specific webhook event.

**Authentication**: Required  
**Rate Limit**: Standard (30 requests/minute)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event_uuid",
    "webhookId": "webhook_uuid",
    "eventType": "project.created",
    "payload": {
      "projectId": "proj_abc123",
      "projectName": "My Project"
    },
    "status": "success",
    "attemptCount": 1,
    "responseCode": 200,
    "responseBody": "OK",
    "deliveredAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Webhook event details retrieved successfully"
}
```

### Retry Failed Event

`POST /api/webhooks/retry`

Retry a failed webhook event.

**Authentication**: Required  
**Rate Limit**: Moderate (10 requests/minute)  
**Credits Required**: 2 credits

**Request Body:**
```json
{
  "eventId": "event_uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "event_uuid",
    "status": "retrying",
    "attemptCount": 2
  },
  "message": "Webhook event retry initiated"
}
```

## Webhook Ingestion Endpoints

### Handle Clerk Webhooks

`POST /api/webhooks/clerk`

Receive and process Clerk authentication webhooks.

**Authentication**: None (public endpoint)  
**Rate Limit**: Webhook (100 requests/minute)  
**Security**: Requires Clerk signature verification

**Supported Events:**
- `user.created`
- `user.updated`
- `user.deleted`
- `user.email.created`
- `user.email.verified`
- `email.created`

**Response:**
```json
{
  "success": true,
  "data": {
    "eventType": "user.created",
    "processed": true
  },
  "message": "Clerk webhook processed successfully"
}
```

### Handle Stripe Webhooks

`POST /api/webhooks/stripe`

Receive and process Stripe payment and subscription webhooks.

**Authentication**: None (public endpoint)  
**Rate Limit**: Webhook (100 requests/minute)  
**Security**: Requires Stripe signature verification

**Supported Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Response:**
```json
{
  "success": true,
  "data": {
    "eventType": "payment_intent.succeeded",
    "processed": true
  },
  "message": "Stripe webhook processed successfully"
}
```

## Webhook Event Types

### Platform Events

#### Blueprint Events

**blueprint.created**
- Triggered when a new blueprint is generated
- Payload: `{ projectId, projectName, contentMarkdown, structuredData, version, userId }`

**blueprint.updated**
- Triggered when a blueprint is modified
- Payload: Same as `blueprint.created`

#### Project Events

**project.created**
- Triggered when a new project is created
- Payload: `{ projectId, projectName, projectDescription?, userId, timestamp }`

**project.updated**
- Triggered when project details are modified
- Payload: `{ projectId, projectName, projectDescription?, userId, timestamp, updatedFields[] }`

**project.deleted**
- Triggered when a project is soft-deleted
- Payload: `{ projectId, projectName, userId, timestamp, deletedAt }`

**project.deployed**
- Triggered when a project is deployed
- Payload: `{ projectId, projectName, deploymentUrl?, status, userId }`

#### Credit Events

**credits.consumed**
- Triggered when credits are consumed
- Payload: `{ userId, creditsConsumed, creditsRemaining, threshold }`

**credit.low_balance**
- Triggered when credit balance falls below threshold
- Payload: `{ userId, currentBalance, threshold, warningLevel }`

**credit.depleted**
- Triggered when credit balance reaches zero
- Payload: `{ userId, depletedAt }`

**credit.purchased**
- Triggered when credits are purchased
- Payload: `{ userId, creditsPurchased, paymentId, newBalance }`

**credit.usage_spike**
- Triggered when unusual credit usage is detected
- Payload: `{ userId, spikeDetectedAt, spikeMultiplier, baselineUsage }`

**credit.renewed**
- Triggered when subscription credits are renewed
- Payload: `{ userId, renewedAt, creditsAdded, previousBalance }`

#### Performance Events

**performance.api_response_slow**
- Triggered when API response times exceed threshold
- Payload: `{ endpoint, responseTime, threshold, timestamp }`

**performance.cache_hit_rate_low**
- Triggered when cache hit rate drops below threshold
- Payload: `{ cacheKey, hitRate, threshold, timestamp }`

**performance.circuit_breaker_tripped**
- Triggered when a circuit breaker activates
- Payload: `{ serviceName, reason, trippedAt, resetTime }`

**performance.database_query_slow**
- Triggered when database query times exceed threshold
- Payload: `{ query, executionTime, threshold, timestamp }`

**performance.memory_high**
- Triggered when memory usage exceeds threshold
- Payload: `{ memoryUsage, threshold, timestamp }`

**performance.error_rate_high**
- Triggered when error rate exceeds threshold
- Payload: `{ errorRate, threshold, timeWindow, timestamp }`

**performance.cpu_high**
- Triggered when CPU usage exceeds threshold
- Payload: `{ cpuUsage, threshold, timestamp }`

**performance.health_score_low**
- Triggered when system health score drops below threshold
- Payload: `{ healthScore, threshold, factors[], timestamp }`

#### Webhook System Events

**webhook.failed**
- Triggered when a webhook delivery fails after all retries
- Payload: `{ webhookConfigurationId, eventType, errorMessage, retryCount }`

### Clerk Authentication Events

**user.created**
- Triggered when a new Clerk user is created
- Payload: `{ id, email_addresses[], first_name?, last_name?, username?, created_at, updated_at }`

**user.updated**
- Triggered when a Clerk user is updated
- Payload: Same as `user.created`

**user.deleted**
- Triggered when a Clerk user is deleted
- Payload: Same as `user.created`

**user.email.created**
- Triggered when an email address is added to a user
- Payload: `{ id, email_address, verification? }`

**user.email.verified**
- Triggered when an email address is verified
- Payload: Same as `user.email.created`

**email.created**
- Alternative event for email creation
- Payload: Same as `user.email.created`

### Stripe Payment Events

**payment_intent.succeeded**
- Triggered when a payment intent succeeds
- Payload: `{ id, amount, currency, status, metadata, created, customer?, description? }`

**payment_intent.payment_failed**
- Triggered when a payment intent fails
- Payload: Same as `payment_intent.succeeded`

**invoice.payment_succeeded**
- Triggered when an invoice payment succeeds
- Payload: `{ id, amount_paid, currency, status, subscription?, created, metadata, customer? }`

**invoice.payment_failed**
- Triggered when an invoice payment fails
- Payload: Same as `invoice.payment_succeeded`

**customer.subscription.created**
- Triggered when a subscription is created
- Payload: `{ id, customer_id, status, items[], created, metadata }`

**customer.subscription.updated**
- Triggered when a subscription is updated
- Payload: Same as `customer.subscription.created`

**customer.subscription.deleted**
- Triggered when a subscription is deleted
- Payload: Same as `customer.subscription.created`

### GitHub Integration Events

**github.push**
- Triggered when code is pushed to a repository
- Payload: `{ repository, pusher, commits[], ref, before, after }`

**github.pull_request.opened**
- Triggered when a pull request is opened
- Payload: `{ number, title, user, repository, head, base, created_at }`

**github.pull_request.closed**
- Triggered when a pull request is closed
- Payload: Same as `github.pull_request.opened`

**github.issues.opened**
- Triggered when an issue is opened
- Payload: `{ number, title, user, repository, created_at, body? }`

**github.issues.closed**
- Triggered when an issue is closed
- Payload: Same as `github.issues.opened`

## Filter Expressions

Filter expressions allow you to receive only the events that match specific criteria.

### Supported Operators

- Equality: `==`
- Inequality: `!=`
- Greater than: `>`
- Less than: `<`
- Contains (strings): `.contains()`
- Logical AND: `&&`
- Logical OR: `||`

### Examples

**Filter by user ID:**
```
data.userId == 12345
```

**Filter by project ID:**
```
data.projectId == "proj_abc123"
```

**Filter by project name pattern:**
```
data.projectName.contains("Important")
```

**Filter by credit threshold:**
```
data.creditsRemaining < 10
```

**Combined filters:**
```
data.userId == 12345 && data.projectName.contains("Test")
```

**Multiple OR conditions:**
```
data.eventType == "project.created" || data.eventType == "project.updated"
```

## Webhook Payload Structure

All webhook payloads follow a consistent structure:

```json
{
  "id": "evt_abc123",
  "type": "project.created",
  "created": 1704067200000,
  "data": {
    // Event-specific data
    "projectId": "proj_abc123",
    "projectName": "My Project"
  }
}
```

**Fields:**
- `id` (string) - Unique event identifier
- `type` (string) - Event type identifier
- `created` (number) - Unix timestamp in milliseconds
- `data` (object) - Event-specific payload

## Security

### Signature Verification

All webhook deliveries include an HMAC-SHA256 signature in the `X-Webhook-Signature` header.

**Verification Steps:**
1. Extract the signature from the `X-Webhook-Signature` header
2. Compute HMAC-SHA256 of the request body using your webhook secret
3. Compare the computed signature with the received signature

**Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, 'your-secret');
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
});
```

**Example (Python):**
```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

@app.post('/webhook')
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, 'your-secret'):
        return 'Invalid signature', 401
    
    # Process webhook
```

### Rate Limiting

Webhook endpoints are protected by rate limiting to ensure system stability:

| Endpoint Category | Rate Limit |
| ----------------- | ---------- |
| Configuration (POST) | 10 requests/minute |
| Configuration (GET) | 30 requests/minute |
| Subscriptions | 10 requests/minute |
| Monitoring | 30 requests/minute |
| Retry | 10 requests/minute |
| Ingestion | 100 requests/minute |

### Subscription Tier Multipliers

Rate limits are multiplied based on subscription tier:
- **Free**: 1x base limits
- **Pro**: 5x base limits
- **Enterprise**: 10x base limits

## Error Handling

### Retry Logic

Failed webhook deliveries are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 5 seconds delay
- Attempt 3: 15 seconds delay
- Maximum: 3 retries (configurable)

After all retries are exhausted, events are moved to the dead letter queue.

### Error Status Codes

| Status Code | Description |
| ----------- | ----------- |
| 200 | Webhook delivered successfully |
| 400 | Invalid request payload |
| 401 | Invalid webhook signature |
| 404 | Webhook configuration not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Dead Letter Queue

Failed events are stored in the dead letter queue and can be:
- Manually retried via `/api/webhooks/retry`
- Batch retried via `POST /api/webhooks/monitor` (admin)
- Monitored via `GET /api/webhooks/monitor`

## Best Practices

1. **Always verify signatures** - Never trust webhook payloads without signature validation
2. **Use HTTPS endpoints** - All webhook URLs must use HTTPS
3. **Implement idempotency** - Use event IDs to prevent duplicate processing
4. **Respond quickly** - Return a 200 status within 30 seconds to avoid timeouts
5. **Store event logs** - Keep a record of received events for debugging and auditing
6. **Handle errors gracefully** - Implement robust error handling in your webhook handler
7. **Monitor delivery** - Use the monitoring endpoints to track webhook health
8. **Rotate secrets regularly** - Use the rotate-secret endpoint periodically for security

## Integration Examples

### Node.js Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  // Verify signature
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body.toString();
  const secret = process.env.WEBHOOK_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Parse event
  const event = JSON.parse(payload);
  
  // Handle event types
  switch (event.type) {
    case 'project.created':
      console.log('Project created:', event.data.projectName);
      break;
    case 'project.updated':
      console.log('Project updated:', event.data.projectName);
      break;
    case 'credits.consumed':
      console.log('Credits consumed:', event.data.creditsConsumed);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }
  
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
```

### Python Webhook Handler

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    secret = 'your-webhook-secret'
    
    if not verify_signature(payload, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event = request.json
    
    # Handle event types
    if event['type'] == 'project.created':
        print(f"Project created: {event['data']['projectName']}")
    elif event['type'] == 'project.updated':
        print(f"Project updated: {event['data']['projectName']}")
    elif event['type'] == 'credits.consumed':
        print(f"Credits consumed: {event['data']['creditsConsumed']}")
    
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

### Database Sync Integration

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  
  try {
    switch (type) {
      case 'project.created':
      case 'project.updated':
        await pool.query(`
          INSERT INTO projects (id, name, description, user_id, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = $2, description = $3, updated_at = NOW()
        `, [data.projectId, data.projectName, data.projectDescription, data.userId]);
        break;
      
      case 'project.deleted':
        await pool.query(`
          UPDATE projects
          SET deleted_at = $1
          WHERE id = $2
        `, [data.deletedAt, data.projectId]);
        break;
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal error');
  }
});

app.listen(3000);
```

## Monitoring and Debugging

### Delivery Status Tracking

Use the history endpoints to track webhook delivery:

```bash
# Get recent deliveries for a webhook
curl -H "Authorization: Bearer <token>" \
  "https://api.architect-platform.com/api/webhooks/history?configId=webhook_uuid&limit=10"

# Get details of a specific event
curl -H "Authorization: Bearer <token>" \
  "https://api.architect-platform.com/api/webhooks/history/event_uuid"
```

### Queue Monitoring

Monitor webhook queue health:

```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.architect-platform.com/api/webhooks/monitor"
```

This returns queue size, dead letter queue size, and recent failed events.

### Test Webhook

Test webhook delivery before subscribing to production events:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "project.created", "payload": {"test": true}}' \
  "https://api.architect-platform.com/api/webhooks/configure/webhook_uuid/test"
```

## Troubleshooting

### Webhook Not Delivered

1. Check the delivery history endpoint for error details
2. Verify your webhook URL is accessible and returns 200 status
3. Ensure your webhook signature verification is correct
4. Check that the event type is subscribed to
5. Verify filter expressions are not blocking events

### Signature Verification Failed

1. Ensure you're using the correct webhook secret
2. Verify you're computing HMAC-SHA256 (not MD5 or other algorithms)
3. Check you're using the raw request body (not parsed JSON)
4. Ensure both signatures are in the same format (hex string)

### Rate Limit Exceeded

1. Check your subscription tier for rate limit multipliers
2. Implement exponential backoff in your webhook handler
3. Consider batch processing for high-volume events
4. Use filter expressions to reduce unnecessary webhook deliveries

## Related Documentation

- [Project Lifecycle Webhook Events](./project-lifecycle-events.md)
- [API Reference](../API.md)
- [SDK Reference - TypeScript/JavaScript](../SDK_REFERENCE.md)
- [SDK Reference - Python](../SDK_REFERENCE_PYTHON.md)
- [Enterprise Deployment Guide](../ENTERPRISE_DEPLOYMENT_GUIDE.md)
