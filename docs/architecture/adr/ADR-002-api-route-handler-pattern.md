# ADR-002: API Route Handler Pattern

> **Status**: Accepted  
> **Date**: 2026-02-25  
> **Author**: Technical Writer  
> **Reviewer**: Architecture Team

## Context

The platform needs consistent API endpoint patterns that provide authentication, rate limiting, error handling, and response formatting without duplicating code across 70+ routes.

## Decision

We will use a **dual-pattern approach** based on use case requirements:

### Pattern A: APIRouteHandler (59 routes) - Standard CRUD & Business Logic

```typescript
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user }) => {
    return { data: 'response' };
  },
});
```

**Features**:

- Automatic authentication (Clerk JWT)
- Automatic rate limiting
- Automatic error handling
- Unified response format

### Pattern B: Manual Response Formatting (17 routes) - Specialized Endpoints

Used for:

- **Webhooks**: Signature-based authentication
- **Monitoring**: Response-level caching with UnifiedCacheManager

```typescript
export async function GET(req: NextRequest) {
  return withRateLimiter(req, 'standard', async () => {
    return UnifiedCacheManager.withCache(
      req,
      async () => {
        /* business logic */
      },
      { ttl: 30, tags: ['monitoring'], varyBy: [] }
    );
  });
}
```

## Consequences

### Positive

- **Consistency**: 76 routes follow predictable patterns
- **Security**: All endpoints have authentication and rate limiting
- **Maintainability**: Single source of truth for API patterns
- **Performance**: Caching strategies optimized per use case

### Negative

- **Flexibility Trade-off**: Some specialized endpoints require manual handling
- **Learning Curve**: Developers must understand when to use each pattern

## References

- `lib/services/api-route-handler.ts` - Implementation
- `docs/architecture/integration-patterns.md` - Detailed patterns

---

**Related ADRs**: ADR-001, ADR-004, ADR-005
