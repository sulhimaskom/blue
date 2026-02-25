# ADR-004: Unified Caching Strategy

> **Status**: Accepted  
> **Date**: 2026-02-25  
> **Author**: Technical Writer  
> **Reviewer**: Architecture Team

## Context

The platform requires intelligent caching at multiple levels (data, response, semantic) to achieve 40-60% performance improvements while maintaining cache consistency.

## Decision

We will implement a **multi-layer caching strategy** with UnifiedCacheManager as the central orchestrator:

### Caching Layers

| Layer              | Target                                  | TTL      | Invalidation       |
| ------------------ | --------------------------------------- | -------- | ------------------ |
| **Data-Level**     | Database queries, API responses         | 30-300s  | On mutation        |
| **Response-Level** | Entire HTTP responses                   | 10-60s   | Time-based         |
| **Semantic-Level** | AI responses by meaning                 | 30 min   | Pattern-based      |
| **Pattern-Aware**  | Cache keys optimized for query patterns | Variable | Smart invalidation |

### Implementation

```typescript
// Data-level caching
const data = await UnifiedCacheManager.getOrSet(`project:${id}`, () => fetchProject(id), {
  ttl: 60,
  tags: ['projects'],
});

// Response-level caching (monitoring)
const response = await UnifiedCacheManager.withCache(req, () => generateMetrics(), {
  ttl: 30,
  tags: ['metrics'],
  varyBy: ['userId'],
});
```

### Cache Invalidation Strategy

1. **Tag-Based Invalidation**: Invalidate by resource type

   ```typescript
   await UnifiedCacheManager.invalidateByTag('projects');
   ```

2. **Pattern-Based Invalidation**: Smart cache warming

   ```typescript
   await CacheWarmingService.warmByPattern('project:*');
   ```

3. **Time-Based Expiration**: TTL with jitter

## Consequences

### Positive

- **40-60% Performance Gain**: AI responses significantly faster
- **Cache Consistency**: Tag-based invalidation ensures freshness
- **Graceful Degradation**: In-memory fallback when Redis unavailable
- **Semantic Caching**: AI queries with similar meaning share cache

### Negative

- **Complexity**: Multiple caching layers require careful coordination
- **Memory Usage**: Semantic caching can use significant memory
- **Debugging**: Cache-related issues can be harder to diagnose

## References

- `lib/services/cache-orchestrator.ts` - Implementation
- `lib/services/cache-key-generator-service.ts` - Key generation
- `lib/services/cache-ttl-service.ts` - TTL management

---

**Related ADRs**: ADR-001, ADR-002
