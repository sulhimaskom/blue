# Project Lifecycle Webhook Events

This document describes the webhook events emitted for project lifecycle operations in the architect platform.

## Overview

The platform emits webhook events for all project lifecycle operations, enabling real-time notifications and integration with external systems. These events follow the existing webhook infrastructure and can be filtered by project ID, user ID, or other fields.

## Event Types

### project.created

Triggered when a new project is created.

**Payload Structure:**
```typescript
{
  id: string;                    // Event ID
  type: "project.created";       // Event type
  created: number;               // Event timestamp
  data: {
    projectId: string;           // Project ID
    projectName: string;         // Project name
    projectDescription?: string; // Project description (optional)
    userId: number;              // User ID who created the project
    timestamp: number;           // Creation timestamp
  };
}
```

**Example:**
```json
{
  "id": "evt_123456789",
  "type": "project.created",
  "created": 1704067200000,
  "data": {
    "projectId": "proj_abc123",
    "projectName": "My New Project",
    "projectDescription": "A sample project for testing",
    "userId": 12345,
    "timestamp": 1704067200000
  }
}
```

### project.updated

Triggered when project details are modified (name, description, etc.).

**Payload Structure:**
```typescript
{
  id: string;                    // Event ID
  type: "project.updated";       // Event type
  created: number;               // Event timestamp
  data: {
    projectId: string;           // Project ID
    projectName: string;         // Updated project name
    projectDescription?: string; // Updated project description (optional)
    userId: number;              // User ID who updated the project
    timestamp: number;           // Update timestamp
    updatedFields: string[];     // List of fields that were updated
  };
}
```

**Example:**
```json
{
  "id": "evt_123456790",
  "type": "project.updated",
  "created": 1704067260000,
  "data": {
    "projectId": "proj_abc123",
    "projectName": "My Updated Project",
    "projectDescription": "Updated description",
    "userId": 12345,
    "timestamp": 1704067260000,
    "updatedFields": ["name", "description"]
  }
}
```

### project.deleted

Triggered when a project is soft-deleted (non-destructive).

**Payload Structure:**
```typescript
{
  id: string;                    // Event ID
  type: "project.deleted";       // Event type
  created: number;               // Event timestamp
  data: {
    projectId: string;           // Project ID
    projectName: string;         // Project name at time of deletion
    userId: number;              // User ID who deleted the project
    timestamp: number;           // Deletion timestamp
    deletedAt: string;           // ISO string of deletion time
  };
}
```

**Example:**
```json
{
  "id": "evt_123456791",
  "type": "project.deleted",
  "created": 1704067320000,
  "data": {
    "projectId": "proj_abc123",
    "projectName": "My Updated Project",
    "userId": 12345,
    "timestamp": 1704067320000,
    "deletedAt": "2024-01-01T12:02:00.000Z"
  }
}
```

## Subscription and Filtering

### Subscribing to Project Events

To receive project lifecycle events, subscribe to the specific event types:

```bash
curl -X POST https://api.architect-platform.com/api/webhooks/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookConfigurationId": "webhook_123",
    "eventType": "project.created",
    "filterExpression": "data.userId == 12345"
  }'
```

### Filter Expressions

Project events can be filtered using expressions based on the event data:

**By User ID:**
```
data.userId == 12345
```

**By Project ID:**
```
data.projectId == "proj_abc123"
```

**By Project Name Pattern:**
```
data.projectName.contains("Test")
```

**By Description:**
```
data.projectDescription != null
```

**Combined Filters:**
```
data.userId == 12345 && data.projectName.contains("Important")
```

## Integration Examples

### Slack Notification

```javascript
// Webhook handler for project events
app.post('/webhook/architect', (req, res) => {
  const { type, data } = req.body;
  
  switch (type) {
    case 'project.created':
      slack.notify(`🆕 New project "${data.projectName}" created by ${data.userId}`);
      break;
    case 'project.updated':
      slack.notify(`📝 Project "${data.projectName}" updated by ${data.userId}`);
      break;
    case 'project.deleted':
      slack.notify(`🗑️ Project "${data.projectName}" deleted by ${data.userId}`);
      break;
  }
  
  res.status(200).send('OK');
});
```

### Database Sync

```javascript
// Sync project data to external database
app.post('/webhook/projects', async (req, res) => {
  const { type, data } = req.body;
  
  switch (type) {
    case 'project.created':
    case 'project.updated':
      await externalDb.projects.upsert({
        id: data.projectId,
        name: data.projectName,
        description: data.projectDescription,
        user_id: data.userId,
        updated_at: new Date(data.timestamp)
      });
      break;
    case 'project.deleted':
      await externalDb.projects.update(
        { id: data.projectId },
        { deleted_at: data.deletedAt }
      );
      break;
  }
  
  res.status(200).send('OK');
});
```

### Analytics Tracking

```javascript
// Track project metrics in analytics service
app.post('/webhook/analytics', (req, res) => {
  const { type, data } = req.body;
  
  const eventData = {
    event_type: type,
    project_id: data.projectId,
    user_id: data.userId,
    timestamp: data.timestamp,
    properties: {
      project_name: data.projectName,
      has_description: !!data.projectDescription,
      updated_fields: data.updatedFields
    }
  };
  
  analytics.track(eventData);
  res.status(200).send('OK');
});
```

## Error Handling

Webhook delivery follows the existing retry and error handling patterns:

- **Retry Logic**: Failed deliveries are retried up to 3 times with exponential backoff
- **Error Notifications**: Failed webhook events trigger `webhook.failed` events
- **Graceful Degradation**: Project operations continue even if webhook delivery fails

## Rate Limiting

Project webhook events are subject to standard rate limits:
- **Standard Rate**: 30 requests per minute for project events
- **Burst Rate**: Up to 60 requests during high activity periods
- **User Isolation**: Rate limits are applied per user ID

## Security

- **Authentication**: All webhook deliveries include signature validation
- **Data Filtering**: Sensitive information is never included in webhook payloads
- **Audit Trail**: All webhook deliveries are logged with correlation IDs

## Related Documentation

- [Webhook Infrastructure Overview](webhook-infrastructure.md)
- [Event Subscription API](event-subscription-api.md)
- [Filter Expression Syntax](filter-expressions.md)
- [Webhook Monitoring and Debugging](webhook-monitoring.md)