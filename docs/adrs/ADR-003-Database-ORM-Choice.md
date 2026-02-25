# ADR-003: Database Choice - Neon PostgreSQL with Drizzle ORM

## Status

**Accepted** - Implemented

## Date

2026-01-16

## Context

We need a database solution that provides:

- Type-safe database operations
- Serverless scaling for variable load
- Branching support for development
- Easy migrations
- Strong TypeScript support

## Decision

We will use **Neon (PostgreSQL)** for database with **Drizzle ORM** for database access.

## Alternatives Considered

| Alternative                 | Pros                  | Cons                 |
| --------------------------- | --------------------- | -------------------- |
| MongoDB                     | Flexible schema       | Less type-safe       |
| MySQL                       | Popular               | Less feature-rich    |
| SQLite                      | Simple                | Not production-scale |
| PostgreSQL (Neon) + Drizzle | Type-safe, serverless | Newer platform       |
| Prisma                      | Popular ORM           | Runtime overhead     |

## Consequences

### Positive

- ✅ Zero-runtime overhead with Drizzle
- ✅ SQL-like syntax for familiar queries
- ✅ Type-safe with full TypeScript support
- ✅ Serverless scaling with Neon
- ✅ Database branching for dev workflows
- ✅ 16+ recommended indexes for query optimization
- ✅ Row Level Security (RLS) for multi-tenancy

### Negative

- ❌ Neon is a newer platform (less mature)
- ❌ Drizzle has smaller community than Prisma

## Implementation

- Database: Neon (serverless PostgreSQL)
- ORM: Drizzle ORM
- Schema: `lib/db/schema.ts`
- Migrations: `drizzle/` directory
- Index management: `lib/db/indexes.ts`

## Performance Optimizations

- Connection pooling (50 connections)
- 16+ database indexes for common queries
- Query monitoring with `performance-monitor.ts`
- Prepared statements for frequently used queries

## References

- `lib/db/schema.ts` - Database schema
- `lib/db/indexes.ts` - Index definitions
- `lib/db/performance-monitor.ts` - Query monitoring
