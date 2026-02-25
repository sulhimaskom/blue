# Frontend Engineer Documentation

> **Status**: Active  
> **Last Updated**: February 25, 2026  
> **Purpose**: Long-term memory and guidelines for frontend engineering work

---

## Repository State (February 25, 2026)

### Quality Gates Status

| Gate | Status | Evidence |
|------|--------|----------|
| Build | ✅ Pass | 77.7s compile time, 71 static pages |
| TypeScript | ✅ Pass | 0 errors |
| ESLint | ✅ Pass | 0 warnings |
| Tests | ✅ Pass | 79/79 suites, 1402/1451 tests |

### Component Statistics

- **Total Components**: 100+ TSX files
- **React.memo Usage**: 34 instances across 23 files
- **useCallback/useMemo Usage**: 69 instances across 14 files
- **UI Components**: 19 base components in `components/ui/`

---

## Frontend Architecture Patterns

### Component Structure

```typescript
// Good pattern - Using React.forwardRef for ref forwarding
const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(baseClasses, className)} {...props} />
    );
  }
);
Component.displayName = "Component";
```

### Variant Handling

```typescript
// Using class-variance-authority for clean variants
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
      },
      size: {
        default: "...",
        sm: "...",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Accessibility Patterns

```typescript
// Loading button with proper ARIA
<button
  aria-busy={loading}
  aria-disabled={disabled || loading}
>
  {loading ? (
    <>
      <Spinner />
      <span className="sr-only">Loading...</span>
    </>
  ) : children}
</button>
```

---

## Common Improvements

### Performance Optimizations

1. **React.memo** - Wrap frequently re-rendered components
2. **useCallback** - Memoize event handlers passed to children
3. **useMemo** - Memoize expensive computations
4. **Code splitting** - Use dynamic imports for large features

### Type Safety

1. **No `as any`** - Use proper type guards or generics
2. **No `@ts-ignore`** - Fix TypeScript errors properly
3. **Strict typing** - Define proper interfaces for props

### Accessibility

1. **ARIA attributes** - Include proper aria-* attributes
2. **Keyboard navigation** - Ensure focus management
3. **Screen reader support** - Use sr-only for hidden text
4. **Semantic HTML** - Use proper HTML elements

---

## Monitoring Components

Key dashboard components in `components/monitoring/`:

- `performance-dashboard.tsx` - Main performance view
- `real-time-performance-dashboard.tsx` - Live metrics
- `advanced-performance-dashboard.tsx` - Detailed analytics
- `system-health-overview.tsx` - Health status grid
- `service-status-grid.tsx` - Service breakdown
- `performance-metrics.tsx` - Metric cards

---

## UI Component Library

Base components in `components/ui/`:

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button with variants, loading state |
| `card.tsx` | Card container with header/content/footer |
| `badge.tsx` | Status badges |
| `modal.tsx` | Dialog/modal component |
| `input.tsx` | Form inputs |
| `select.tsx` | Dropdown selects |
| `table.tsx` | Data tables |
| `skeleton.tsx` | Loading skeletons |
| `progress.tsx` | Progress indicators |
| `alert.tsx` | Alert messages |

---

## Common Issues & Fixes

### Type Assertions (Issue #671 - FIXED)

**Problem**: Using `as Type` for type casting
**Solution**: Use proper type guards or consistent type definitions

```typescript
// Bad
const status = data.status as StatusType;

// Good - Using lookup table with type guard
const STATUS_THEMES: Record<StatusType, ThemeConfig> = {...};
const status = STATUS_THEMES[data.status] ?? STATUS_THEMES.default;
```

### Missing Dependencies

If build fails with "module not found":
```bash
npm install
```

---

## Self-Evolve Notes

### What Works Well

1. **Atomic components** - Small, focused, reusable
2. **Consistent patterns** - Same structure across all components
3. **Type safety** - Comprehensive TypeScript usage
4. **Accessibility** - Built-in ARIA support
5. **Performance** - Proper memoization

### Areas to Monitor

1. **Bundle size** - Currently 383kB (target: <150kB)
2. **Build time** - Currently 77.7s (target: <10s)
3. **Test coverage** - Frontend component tests could be expanded

---

## Quick Commands

```bash
# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm test --silent
```

---

**Next Review**: March 4, 2026
