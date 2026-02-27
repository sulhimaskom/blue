# Development Helper Scripts for Infrastructure Robustness

## Infrastructure Auto-Recovery System

### Quick Commands

```bash
# Check infrastructure health
npm run infrastructure:check

# Auto-recover from infrastructure issues
npm run infrastructure:recover

# Generate health report
npm run infrastructure:report
```

### Automated Monitoring

The system includes:

1. **Real-time Detection**: Automatically detects when dependencies are missing or corrupted
2. **Auto-Recovery**: Fixes infrastructure problems without manual intervention
3. **Quality Gates**: Ensures all validation passes after recovery
4. **Health Reports**: Generates detailed infrastructure status reports
5. **CI/CD Integration**: GitHub workflow automatically monitors and recovers

### Problem Solved

This prevents the recurring **INFRA-001/BUG-008** pattern where:

- Node.js dependencies go missing
- Development pipeline completely fails
- `npm run build`, `npm test`, etc. all break
- Manual intervention required to restore functionality

### Usage Examples

```bash
# Before starting work
npm run infrastructure:check

# If something breaks
npm run infrastructure:recover

# Check system status
npm run infrastructure:report
```

### Pre-commit Setup (Optional)

Husky is already configured via the `prepare` script in package.json. To add infrastructure checking to your pre-commit workflow, add to your `.husky/pre-commit` file:

```bash
#!/bin/bash
npm run infrastructure:check
```

ZM|The system provides enterprise-grade reliability for development infrastructure.

---

## Database Index Verification

### Quick Commands

```bash
# Verify database indexes status
npm run verify-indexes

# Apply missing indexes
npm run verify-indexes:apply
```

### Description

The verify-indexes script checks which recommended database indexes are applied and can apply missing ones.

**Features:**
- Verifies index status against recommended indexes
- Shows which indexes are missing
- Can apply missing indexes automatically
- Supports both basic and advanced index sets

**Required Environment Variable:**
- `DATABASE_URL` - PostgreSQL connection string

### Usage Examples

```bash
# Check index status
npm run verify-indexes

# Apply missing indexes
npm run verify-indexes:apply
```
