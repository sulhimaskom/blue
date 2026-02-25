# ADR-006: Webhook Reliability Pattern

> **Status**: Accepted  
> **Date**: 2026-02-25  
> **Author**: Technical Writer  
> **Reviewer**: Architecture Team

## Context

The platform receives webhooks from multiple external services (Stripe, Clerk) that represent critical business events (payments, user sign-ups). Failed webhook processing can result in lost data inconsistencies revenue or.

## Decision

We will implement a **three-tier webhook reliability architecture**:

### Architecture

```
Incoming Webhook
       ↓
[1] Signature Verification (Cryptographic HMAC)
       ↓
[2] Rate Limiting (Redis-based)
       ↓
[3] Queue Processing (Exponential Backoff)
       ↓
[4] Event Handler (Business Logic)
```

### Key Features

| Feature                        | Implementation                                        |
| ------------------------------ | ----------------------------------------------------- |
| **Idempotency**                | Automatic deduplication prevents duplicate processing |
| **Queue-Based**                | Asynchronous processing with retry logic              |
| **Exponential Backoff**        | 1s → 2s → 4s → ... → 60s (max 10 attempts)            |
| **Dead Letter Queue**          | Failed events isolated for manual review              |
| **Cryptographic Verification** | HMAC signature validation                             |

### Retry Strategy

```typescript
{
  initialDelay: 1000,    // 1 second
  maxDelay: 60000,        // 1 minute
  maxAttempts: 10,
  backoffMultiplier: 2
}
```

### Implementation Pattern

```typescript
export const POST = (req: NextRequest) =>
  WebhookService.processWebhookWithReliability(req, {
    serviceName: 'Stripe',
    verifySignature: SecurityService.verifyStripeWebhook,
    useQueue: true,
    processEvent: async (event, context) => {
      // Business logic here
    },
  });
```

## Consequences

### Positive

- **Exactly-Once Processing**: No duplicate or missed events
- **Resilience**: Transient failures automatically retried
- **Auditability**: Dead letter queue for manual intervention
- **Security**: Cryptographic verification prevents spoofing

### Negative

- **Complexity**: Queue system adds architectural complexity
- **Latency**: Async processing adds delay to event handling
- **Monitoring**: Additional monitoring needed for queue health

## Test Coverage

- 5 test suites, 46 tests (100% pass rate)
- Signature verification tests
- Retry logic tests
- Idempotency tests
- Dead letter queue tests

## References

- `lib/services/webhook-service.ts` - Implementation
- `lib/services/webhook-queue-service.ts` - Queue processing
- `app/api/webhooks/stripe/route.ts` - Stripe handler
- `app/api/webhooks/clerk/route.ts` - Clerk handler

---

**Related ADRs**: ADR-001, ADR-003
