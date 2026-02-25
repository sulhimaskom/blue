# ADR-001: Use Next.js 15 with App Router

## Status

**Accepted** - Implemented

## Date

2026-01-16

## Context

We need to choose a React framework for building our AI-powered SaaS platform. The framework must support:

- Server-side rendering (SSR) for SEO and performance
- API routes for backend functionality
- TypeScript support
- Developer experience and tooling

## Decision

We will use **Next.js 15 with App Router** as our primary framework.

## Alternatives Considered

| Alternative               | Pros                         | Cons                      |
| ------------------------- | ---------------------------- | ------------------------- |
| Next.js 15 (Pages Router) | Familiar patterns            | Legacy, no Server Actions |
| Remix                     | Excellent SSR, nested routes | Smaller ecosystem         |
| Express + React           | Full control                 | No SSR, more boilerplate  |
| Next.js 14                | Stable                       | Older version             |

## Consequences

### Positive

- ✅ Server Actions for seamless data mutation
- ✅ App Router for improved routing and layouts
- ✅ React Server Components for performance
- ✅ Built-in optimization (images, fonts, scripts)
- ✅ Large ecosystem and community support

### Negative

- ❌ Learning curve for App Router patterns
- ❌ Some breaking changes from Pages Router

## Implementation

- Framework initialized with `create-next-app`
- App Router structure: `app/` directory
- API routes in `app/api/` following RESTful conventions
