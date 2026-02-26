# ADR-012: Rate Limiting Configuration

> **Status**: Accepted  
> **Date**: 2026-02-26  
> **Author**: DX-engineer Agent  
> **Reviewer**: Technical Writer

## Context

The Architect Platform requires robust rate limiting to protect against API abuse, ensure fair resource allocation across subscription tiers, and maintain service stability during traffic spikes. Without centralized rate limiting, the platform risks:

- **Service degradation** from excessive API calls overwhelming external dependencies (AI providers, database)
- **Revenue impact** from abuse of paid endpoints (blueprint generation, deployments)
- **Security vulnerabilities** from DDoS attacks or credential stuffing
- **Poor user experience** for legitimate users when resources are exhausted

Initial exploration identified multiple rate limiting patterns across endpoints without centralized configuration, leading to inconsistent protection levels.

## Decision

We implemented a centralized Redis-backed rate limiting system with the following characteristics:

### 1. Tier-Based Rate Limits

| Tier       | Multiplier | Example (Standard Endpoint) |
| ---------- | ---------- | --------------------------- |
| Free       | 1x         | 30 requests/minute          |
| Pro        | 5x         | 150 requests/minute         |
| Enterprise | 10x        | 300 requests/minute         |

### 2. Category-Based Policies

- **Strict** (3 req/min): AI generation, deployments - expensive operations
- **Moderate** (10 req/min): Write operations - create, update, delete
- **Standard** (30 req/min): Read operations with caching
- **Permissive** (60 req/min): Public health/metrics endpoints
- **Webhook** (100 req/min): Incoming webhook processing

### 3. Fail-Closed Security

Critical endpoints (payments, subscriptions, deployments, authentication webhooks) implement fail-closed behavior: when Redis is unavailable, requests are denied rather than allowing unlimited access.

### 4. Implementation Details

The implementation is centralized in `lib/rate-limit-config.ts`:

- `RATE_LIMIT_POLICIES`: Category-to-limit mapping
- `TIER_MULTIPLIERS`: Subscription tier adjustments
- `ENDPOINT_RATE_LIMITS`: Endpoint-to-category mapping
- `CRITICAL_ENDPOINTS`: Fail-closed endpoints list
- `RateLimiters`: Pre-configured limiter factory

All API routes use the `APIRouteHandler` rate limiter parameter for consistent integration.

## Consequences

### Positive

- **Consistent protection** across all API endpoints
- **Fair resource allocation** based on subscription tier
- **Fail-closed security** prevents unbounded access during Redis outages
- **Self-documenting configuration** in code
- **Monitoring-ready** with metrics export capability
- **Flexible tier multipliers** support business model (free → pro → enterprise)

### Negative

- **Redis dependency** for production rate limiting (in-memory fallback available for dev)
- **Complexity** in endpoint categorization decisions
- **Potential latency** added to request processing (minimal, <5ms)

## References

- [lib/rate-limit-config.ts](../../lib/rate-limit-config.ts) - Implementation
- [lib/api-utils.ts](../../lib/api-utils.ts) - Core rate limiter
- [ADR-002](ADR-002-api-route-handler-pattern.md) - API Route Handler integration
- [ADR-004](ADR-004-unified-caching-strategy.md) - Redis caching (shared infrastructure)
