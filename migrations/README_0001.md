# Migration: Add Database-Level Constraints for Data Integrity

## Overview

This migration adds comprehensive CHECK constraints to prevent data corruption and ensure data quality across all database tables.

**Date**: January 7, 2026
**Reversible**: YES
**Safety**: Non-destructive (validates existing data)
**Business Impact**: Eliminates data corruption risk, prevents billing disputes

---

## Constraints Added

### Users Table (3 constraints)

1. **`chk_users_credits_non_negative`**
   - **Purpose**: Prevent negative credit balance
   - **Rule**: `credits >= 0`
   - **Business Impact**: Prevents billing disputes and customer confusion
   - **Migration Safety**: Validates existing credits before adding constraint

2. **`chk_users_email_format`**
   - **Purpose**: Validate email format
   - **Rule**: `email ~* '^[^@]+@[^@]+\.[^@]+$'`
   - **Business Impact**: Ensures email delivery reliability
   - **Migration Safety**: Validates existing emails before adding constraint

3. **`chk_users_subscription_tier_enum`**
   - **Purpose**: Enforce valid subscription tiers
   - **Rule**: `subscription_tier IN ('free', 'pro', 'enterprise')`
   - **Business Impact**: Maintains business logic consistency
   - **Migration Safety**: Validates existing tiers before adding constraint

### Projects Table (3 constraints)

4. **`chk_projects_name_length`**
   - **Purpose**: Ensure meaningful project names
   - **Rule**: `name IS NOT NULL AND LENGTH(TRIM(name)) >= 3`
   - **Business Impact**: Improves user experience and data quality
   - **Migration Safety**: Validates existing names before adding constraint

5. **`chk_projects_status_enum`**
   - **Purpose**: Validate project workflow statuses
   - **Rule**: `status IN ('draft', 'generating', 'completed', 'deployed')`
   - **Business Impact**: Prevents application logic errors
   - **Migration Safety**: Validates existing statuses before adding constraint

6. **`chk_projects_repo_url_format`**
   - **Purpose**: Ensure valid repository URLs
   - **Rule**: `repo_url IS NULL OR repo_url ~* '^https?://'`
   - **Business Impact**: Prevents integration failures
   - **Migration Safety**: Validates existing URLs before adding constraint

### Blueprints Table (2 constraints)

7. **`chk_blueprints_version_positive`**
   - **Purpose**: Enforce positive version numbers
   - **Rule**: `version > 0`
   - **Business Impact**: Maintains version history integrity
   - **Migration Safety**: Validates existing versions before adding constraint

8. **`chk_blueprints_content_not_empty`**
   - **Purpose**: Ensure non-empty blueprint content
   - **Rule**: `content_markdown IS NOT NULL AND LENGTH(TRIM(content_markdown)) > 0`
   - **Business Impact**: Prevents user experience issues
   - **Migration Safety**: Validates existing content before adding constraint

### Transactions Table (2 constraints)

9. **`chk_transactions_amount_positive`**
   - **Purpose**: Enforce positive transaction amounts
   - **Rule**: `amount >= 0`
   - **Business Impact**: Prevents billing disputes and financial errors
   - **Migration Safety**: Validates existing amounts before adding constraint

10. **`chk_transactions_type_validation`**
    - **Purpose**: Validate transaction type (credits OR payment)
    - **Rule**: `(credits_added IS NOT NULL) OR (stripe_payment_id IS NOT NULL)`
    - **Business Impact**: Ensures transaction integrity
    - **Migration Safety**: Validates existing transactions before adding constraint

---

## Migration Safety

### Non-Destructive Design

All constraints validate existing data before being added:

- PostgreSQL automatically validates existing rows
- Constraints fail if any existing row violates the rule
- Migration transaction rolls back completely on any failure
- No data modification required

### Transaction Safety

Migration is executed in a single transaction:

- All constraints added atomically
- Rollback on any failure
- No partial constraint application
- Complete rollback capability

---

## Rollback Plan

Full rollback available in `rollback_0001_add_data_integrity_constraints.sql`:

- Safely removes all 10 constraints
- No data modification required
- Transaction-safe rollback
- Warning: Removing constraints increases data corruption risk

---

## Validation

Run validation to ensure constraints are properly applied:

```typescript
import { validate } from "./migrations/0001_add_data_integrity_constraints";

const isValid = await validate();
console.log(`Constraints valid: ${isValid}`); // Should be true
```

---

## Business Impact

### Data Corruption Prevention

- ✅ Eliminates negative credits (billing disputes)
- ✅ Validates email formats (delivery reliability)
- ✅ Enforces subscription tiers (business logic)
- ✅ Validates project workflow (application stability)
- ✅ Ensures transaction integrity (financial accuracy)

### Data Quality Improvements

- ✅ Consistent project status values
- ✅ Valid email addresses in database
- ✅ Meaningful project names
- ✅ Valid repository URLs for integration
- ✅ Non-empty blueprint content

---

## Execution

### Apply Migration

```bash
# Via migration script (recommended)
npm run migrate:up

# Or manually via database tool
psql $DATABASE_URL -f migrations/0001_add_data_integrity_constraints.sql
```

### Rollback Migration

```bash
# Via migration script
npm run migrate:down

# Or manually via database tool
psql $DATABASE_URL -f migrations/rollback_0001_add_data_integrity_constraints.sql
```

---

## Testing

### Pre-Migration Validation

Before running migration, ensure all existing data complies with constraints:

```sql
-- Check for negative credits
SELECT id, clerk_id, credits FROM users WHERE credits < 0;

-- Check for invalid emails
SELECT id, email FROM users WHERE email !~* '^[^@]+@[^@]+\.[^@]+$';

-- Check for invalid subscription tiers
SELECT id, subscription_tier FROM users WHERE subscription_tier NOT IN ('free', 'pro', 'enterprise');

-- Check for invalid project statuses
SELECT id, status FROM projects WHERE status NOT IN ('draft', 'generating', 'completed', 'deployed');

-- Check for invalid repo URLs
SELECT id, repo_url FROM projects WHERE repo_url IS NOT NULL AND repo_url !~* '^https?://';

-- Check for non-positive versions
SELECT id, version FROM blueprints WHERE version <= 0;

-- Check for empty content
SELECT id, LENGTH(content_markdown) as content_length FROM blueprints WHERE LENGTH(TRIM(content_markdown)) = 0;

-- Check for negative amounts
SELECT id, amount FROM transactions WHERE amount < 0;

-- Check for invalid transaction types
SELECT id, credits_added, stripe_payment_id FROM transactions
WHERE (credits_added IS NULL OR credits_added <= 0) AND (stripe_payment_id IS NULL OR LENGTH(TRIM(stripe_payment_id)) = 0);
```

### Post-Migration Validation

After migration, verify constraints are active:

```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('users', 'projects', 'blueprints', 'transactions')
  AND tc.constraint_name LIKE 'chk_%'
ORDER BY tc.table_name, tc.constraint_name;
```

---

## Notes

- **Performance Impact**: Minimal (constraint checks are efficient)
- **Storage Impact**: None (constraints are metadata only)
- **Compatibility**: Fully compatible with existing application code
- **Monitoring**: Constraint violations will be logged by Drizzle ORM

---

## Success Criteria

- [ ] Migration executes successfully without errors
- [ ] All 10 constraints are present in database
- [ ] Existing data validates against all constraints
- [ ] Application continues to function normally
- [ ] Quality gates pass (build, lint, typecheck, tests)

---

**Migration Status**: ✅ DESIGNED AND READY FOR EXECUTION
**Documentation**: ✅ COMPREHENSIVE GUIDE PROVIDED
**Safety**: ✅ NON-DESTRUCTIVE WITH ROLLBACK
**Business Impact**: ✅ IMMEDIATE DATA CORRUPTION PREVENTION
