# ADR-005: Error Handling Standardization

> **Status**: Accepted  
> **Date**: 2026-02-25  
> **Author**: Technical Writer  
> **Reviewer**: Architecture Team

## Context

The platform has 70+ API endpoints that must provide consistent, predictable error responses to clients while maintaining security by not exposing internal details.

## Decision

We will implement a **standardized error class hierarchy** with automatic HTTP status mapping:

### Error Class Hierarchy

```typescript
class ValidationError    extends Error // 400 Bad Request
class AuthenticationError extends Error // 401 Unauthorized
class AuthorizationError extends Error  // 403 Forbidden
class NotFoundError      extends Error // 404 Not Found
class RateLimitError     extends Error // 429 Too Many Requests
class DatabaseError      extends Error // 500 Internal Server Error
```

### Unified Response Format

**Success Response**:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Optional success message"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Detailed error (dev only)"
}
```

### Implementation Pattern

```typescript
// In handlers - throw specific errors
throw new ValidationError('Invalid email format');
throw new AuthenticationError('Please log in');
throw new NotFoundError('Project not found');

// APIRouteHandler automatically formats errors
export const GET = APIRouteHandler.createGETHandler({
  handler: async () => {
    throw new ValidationError('Invalid input'); // Auto-formatted
  },
});
```

## Consequences

### Positive

- **Type Safety**: All errors are typed
- **Consistency**: Unified response format across 76 endpoints
- **Security**: Detailed errors only shown in development
- **HTTP Compliance**: Proper status codes for each error type
- **Developer Experience**: Clear error messages for debugging

### Negative

- **Migration Effort**: Existing routes needed updating
- **Error Classification**: Some errors require careful categorization

## References

- `lib/api-utils.ts` - Error classes and handlers
- `docs/architecture/integration-patterns.md` - Section 5

---

**Related ADRs**: ADR-001, ADR-002
