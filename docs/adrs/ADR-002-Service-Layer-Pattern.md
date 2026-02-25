# ADR-002: Service Layer Architecture Pattern

## Status

**Accepted** - Implemented

## Date

2026-01-16

## Context

We need a clear separation between UI components and business logic to ensure:

- Maintainability and testability
- Reusability across components
- Clear dependency flow
- Easy to mock for testing

## Decision

We will use a **Service Layer Pattern** where all business logic lives in `lib/services/` directory, keeping UI components purely presentational.

## Alternatives Considered

| Alternative            | Pros                       | Cons                         |
| ---------------------- | -------------------------- | ---------------------------- |
| Direct component logic | Simple for small apps      | Not scalable, hard to test   |
| Custom hooks           | React-native               | Business logic mixing        |
| Context only           | No service layer           | Hard to test, tight coupling |
| Service Layer (chosen) | Clear separation, testable | More files to manage         |

## Consequences

### Positive

- ✅ Business logic isolated in services
- ✅ UI components are atomic and reusable
- ✅ Easy to mock services for testing
- ✅ Clear dependency injection
- ✅ 74+ specialized atomic services created

### Negative

- ❌ More initial setup
- ❌ Need to maintain service interfaces

## Implementation

- All business logic in `lib/services/`
- Services use singleton pattern where appropriate
- Type definitions centralized in `lib/services/service-types.ts`
- Zero business logic in `components/` (pure presentation)
- API routes use services, not direct database access

## Examples

```typescript
// ✅ Good: Service handles business logic
export class BlueprintEngine {
  static async generate(input: BlueprintInput): Promise<Blueprint> {
    // Business logic here
  }
}

// ❌ Bad: Business logic in component
export function BlueprintForm() {
  const generate = async () => {
    // Business logic here - AVOID THIS
  };
}
```

## References

- `docs/architecture/SERVICE_LAYER_CONSOLIDATION.md`
- `blueprint.md` Section 8.2 - Service Layer Principles
