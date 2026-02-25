# ADR-005: AI Integration with IFlow and Tavily

## Status

**Accepted** - Implemented

## Date

2026-01-16

## Context

We need AI capabilities for:

- Blueprint generation (reasoning)
- Market research (search)
- Code generation
- Response caching for cost optimization

## Decision

We will use **IFlow (models.dev)** for AI reasoning and **Tavily** for web research.

## Alternatives Considered

| Alternative             | Reasoning                             |
| ----------------------- | ------------------------------------- |
| OpenAI directly         | Cost at scale, rate limits            |
| Anthropic               | Less control, pricing                 |
| Perplexity API          | Good for research                     |
| IFlow + Tavily (chosen) | Free tier, OpenAI-compatible, best DX |

## Architecture

```
User Input → Discovery (Tavily) → Research Summary
                          ↓
              Blueprinting (IFlow) → Blueprint
                          ↓
              Refinement (User) → Updated Blueprint
                          ↓
              Fabrication (GitHub) → Repository
```

## Consequences

### Positive

- ✅ IFlow: Free & unlimited (OpenAI-compatible)
- ✅ Tavily: Specialized for research
- ✅ Circuit breakers for fault tolerance
- ✅ Intelligent caching (40-60% faster repeat queries)
- ✅ Rate limiting per user

### Negative

- ❌ Dependency on external APIs
- ❌ Need fallback for API failures

## Implementation

- AI Service: `lib/services/ai-service.ts`
- Blueprint Engine: `lib/services/blueprint-engine.ts`
- Research: Tavily API integration
- Caching: Redis with intelligent pattern detection
- Circuit breakers: `lib/circuit-breaker.ts`

## Performance

- **Caching**: 40-60% faster for repeat queries
- **Circuit breakers**: Automatic recovery from failures
- **Rate limiting**: Per-user limits to prevent abuse

## References

- `lib/services/ai-service.ts` - AI integration
- `lib/services/blueprint-engine.ts` - Blueprint generation
- `lib/circuit-breaker.ts` - Fault tolerance
- `lib/services/cache-orchestrator.ts` - Response caching
