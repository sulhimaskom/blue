# ADR-004: Authentication with Clerk

## Status

**Accepted** - Implemented

## Date

2026-01-16

## Context

We need a complete authentication solution that handles:

- User signup/login
- Session management
- User profile management
- Social login (Google, GitHub, etc.)
- Enterprise features (SSO, 2FA)

## Decision

We will use **Clerk** for authentication and user management.

## Alternatives Considered

| Alternative    | Pros                   | Cons                |
| -------------- | ---------------------- | ------------------- |
| NextAuth.js    | Free, flexible         | More setup required |
| Supabase Auth  | Integrated with DB     | Less feature-rich   |
| Auth0          | Enterprise features    | Expensive           |
| Clerk (chosen) | Best DX, full-featured | Pricing at scale    |

## Consequences

### Positive

- ✅ Best developer experience
- ✅ Complete user management out of the box
- ✅ Social login integration
- ✅ Enterprise features (SSO, 2FA)
- ✅ Middleware integration for route protection
- ✅ User profile management

### Negative

- ❌ Pricing increases at scale
- ❌ Less control than custom solution

## Implementation

- Integration via `@clerk/nextjs`
- Authentication in `middleware.ts`
- Protected routes redirect to `/sign-in`
- User ID mapping to internal records via `clerk_id` field
- Environment variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

## Security

- Clerk handles all credential storage
- JWT validation via Clerk middleware
- User data isolation via RLS policies
- No sensitive data stored locally

## References

- `middleware.ts` - Route protection
- `layout.tsx` - Clerk provider setup
- `lib/db/schema.ts` - `users` table with `clerk_id`
