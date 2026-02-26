# ADR-012: Rate Limiting Architecture

> **Status**: Accepted  
> **Date**: 2026-02-26  
> **Author**: Technical Writer  
> **Reviewer**: Architecture Team

## Context

The platform exposes 70+ API endpoints that handle sensitive operations including:

- AI-powered blueprint generation (expensive compute)
- GitHub repository deployments (external API calls)
- Payment processing (financial transactions)
- User authentication (security-critical)

Without rate limiting, the platform is vulnerable to:

- **Denial of Service (DoS)**: Malicious or accidental abuse
- **Resource Exhaustion**: Excessive AI API calls incurring costs
- **Cascading Failures**: External service overload affecting all users
- **Billing Abuse**: Uncontrolled API calls leading to unexpected costs

## Decision

We implemented a **tiered, Redis-backed rate limiting architecture** with the following characteristics:

### Rate Limit Categories

| Category       | Requests/Min | Use Case                           |
| -------------- | ------------ | ---------------------------------- |
| **strict**     | 3            | AI generation, deployments         |
| **moderate**   | 10           | Write operations                   |
| **standard**   | 30           | Read operations with caching       |
| **permissive** | 60           | Public endpoints (health, metrics) |
| **webhook**    | 100          | Incoming webhooks                  |

### Subscription Tier Multipliers

Rate limits scale with subscription tier to support tiered access:

- **Free**: 1x (base limits)
- **Pro**: 5x (5x base limits)
- **Enterprise**: 10x (10x base limits)

### Fail-Closed Security Model

Critical endpoints fail securely when Redis is unavailable:

- `/credits` - Payment processing
- `/subscription` - Subscription management
- `/deploy` - GitHub deployments
- `/webhooks/stripe` - Payment webhooks
- `/webhooks/clerk` - Authentication webhooks

When Redis fails, these endpoints return `503 Service Unavailable` instead of allowing unlimited access.

### Implementation

The architecture centers on `lib/rate-limit-config.ts`:

```typescript
// Pre-configured rate limiters
export const RateLimiters = {
  strict: () => getRateLimiter('strict'),
  moderate: () => getRateLimiter('moderate'),
  standard: () => getRateLimiter('standard'),
  permissive: () => getRateLimiter('permissive'),
  webhook: () => getRateLimiter('webhook'),

  // Fail-closed versions for critical endpoints
  strictFailClosed: () => getRateLimiter('strict', 'free', true),

  // Tier-aware rate limiters
  forTier: (tier, category) => getRateLimiter(category, tier),
};
```

### Endpoint Integration

All API routes use the rate limiter via APIRouteHandler:

```typescript
export const POST = APIRouteHandler.createPOSTHandler({
  rateLimiter: (identifier: string) => RateLimiters.strict()(identifier),
  requireAuth: true,
  handler: async ({ context, user }) => {
    // Handler logic
  },
});
```

## Consequences

### Positive

- **DoS Protection**: Mitigates both accidental and malicious abuse
- **Cost Control**: Prevents runaway AI API costs
- **Fair Usage**: Subscription tiers enable predictable resource allocation
- **Security**: Fail-closed model prevents data exposure during outages
- **Observability**: Built-in metrics for monitoring usage patterns
- **Developer Experience**: Simple, self-documenting configuration

### Negative

- **Complexity**: Requires Redis for production deployments
- **Latency**: Small overhead per request (~1-2ms)
- **Edge Cases**: Requires careful handling of distributed Redis state

## References

- [Rate Limit Configuration](../lib/rate-limit-config.ts)
- [API Route Handler Pattern](ADR-002-api-route-handler-pattern.md)
- [Circuit Breaker Implementation](ADR-003-circuit-breaker-implementation.md)
- [OWASP Rate Limiting Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html#rate-limming)
