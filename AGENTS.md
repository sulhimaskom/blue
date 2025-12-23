# AI Agent Guidelines

> ⚠️ **MANDATORY READING** - All AI agents MUST follow these rules without exception.

---

## 🎯 UNIVERSAL CODING PRINCIPLES

> These 7 principles apply to ALL projects, regardless of tech stack.

### 1. MODULARITY

```
Every piece of logic must be isolated and reusable.
- Extract repeated code into functions/components
- One function = one responsibility
- No god classes or mega-functions
- Use services layer for business logic
```

### 2. FLEXIBILITY

```
Zero hardcoded values in the codebase.
- All configuration via environment variables or config files
- No magic numbers or strings
- Use constants for repeated values
- Design for change, not for current requirements only
```

### 3. SCALABILITY

```
Clean architecture with proper separation of concerns.
- UI → Services → Data Access (layered)
- Loosely coupled components
- Horizontal scaling friendly
- Avoid tight dependencies
```

### 4. STABILITY

```
Defensive coding with comprehensive error handling.
- Handle all edge cases
- Type safety where possible
- Graceful degradation
- No silent failures
- Validate inputs at boundaries
```

### 5. SECURITY

```
Secure by default, following OWASP principles.
- Never expose secrets in code
- Input validation on all user inputs
- Parameterized queries (no SQL injection)
- Sanitize outputs (no XSS)
- Principle of least privilege
```

### 6. CONSISTENCY

```
Follow existing patterns and conventions.
- Match existing code style
- Use established naming conventions
- Same patterns for similar problems
- Predictable structure across codebase
```

### 7. AUTOMATION

```
Design for automated workflows.
- CI/CD friendly code structure
- Automate repetitive tasks
- Self-documenting code
- Easy to test and deploy
```

---

## 🔴 CRITICAL RULES (VIOLATION = FAILURE)

### 1. Source of Truth

```
ALWAYS read docs/architecture/blueprint.md FIRST before any action.
Blueprint defines: tech stack, commands, folder structure, coding standards.
```

### 2. Branch Protocol

```
NEVER commit directly to main or dev.
ALWAYS work on agent-workspace branch.
ALWAYS create Pull Request for review.
```

### 3. No Assumptions

```
NEVER assume tech stack     → READ blueprint.md
NEVER assume folder structure → READ blueprint.md
NEVER assume build commands   → READ package.json or blueprint.md
NEVER assume coding style     → READ existing codebase
```

### 4. Conventional Commits

```
ALWAYS use format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Example: feat(auth): add login validation
Example: fix(api): handle null response
Example: docs(readme): update setup instructions
```

---

## 🟡 EXECUTION PROTOCOL

### Before Coding

1. `git fetch --all`
2. Switch to `agent-workspace` branch
3. `git pull origin agent-workspace`
4. **Read `blueprint.md`** for:
   - Tech stack & language
   - Build/lint/test commands
   - Folder structure
   - Coding standards
5. Read `docs/task.md` to avoid duplicate work
6. Read `docs/bug.md` for known issues
7. Read existing code to understand patterns

### During Coding

1. Apply the 7 Universal Principles above
2. Make atomic, focused changes
3. Follow patterns in existing codebase
4. Add error handling for all operations
5. Do NOT refactor unrelated code

### After Coding

1. Run lint command (from blueprint.md or package.json)
2. Run build command (from blueprint.md or package.json)
3. Run test command if exists
4. Update relevant documentation:
   - `docs/task.md` - mark completed tasks
   - `docs/bug.md` - mark fixed bugs
   - `blueprint.md` - if architecture changed
5. Commit with Conventional Commits format
6. Push to `agent-workspace`
7. Create/Update Pull Request to `dev`

---

## 🔒 SECURITY RULES (Universal)

| Rule                            | Enforcement |
| ------------------------------- | ----------- |
| No secrets/credentials in code  | ABSOLUTE    |
| No debug logs in production     | REQUIRED    |
| Input validation on all inputs  | REQUIRED    |
| Generic error messages to users | REQUIRED    |
| Parameterized queries for DB    | ABSOLUTE    |
| Sanitize user-generated content | REQUIRED    |

---

## 📁 FILE MODIFICATION RULES

### CAN Modify (After Reading Blueprint)

- Source code files (as defined in blueprint.md)
- Documentation in `docs/`
- Test files

### CANNOT Modify Without Approval

- Dependency files (package.json, requirements.txt, etc.)
- Configuration files (tsconfig, eslint, etc.)
- `.github/workflows/*`
- Database schema
- `blueprint.md` architecture section

### NEVER Modify

- `.env*` files
- Secrets or credentials
- License files

---

## ⚠️ FORBIDDEN ACTIONS

```
❌ Violating any of the 7 Universal Principles
❌ Making assumptions without reading blueprint
❌ Adding dependencies without justification
❌ Deleting files without documenting reason
❌ Changing authentication logic without review
❌ Modifying database schema without updating blueprint
❌ Committing directly to main/dev branch
❌ Ignoring lint/build errors
❌ Making changes outside assigned scope
❌ Using deprecated or insecure patterns
❌ Creating duplicate/redundant code (violates MODULARITY)
❌ Hardcoding values (violates FLEXIBILITY)
```

---

## ✅ REQUIRED ACTIONS

```
✅ Apply the 7 Universal Principles
✅ Read blueprint.md FIRST before any coding
✅ Read existing code to understand patterns
✅ Pull latest changes before working
✅ Run lint before committing
✅ Run build before committing
✅ Write meaningful commit messages
✅ Update documentation after changes
✅ Create Pull Request with description
✅ Handle all error cases
```

---

## 🚨 FAILURE CONDITIONS

Agent run is considered **FAILED** if:

1. Violated any of the 7 Universal Principles
2. Committed to main/dev directly
3. Left build errors unfixed
4. Left lint errors unfixed
5. Did not create Pull Request
6. Made assumptions without reading blueprint
7. Modified files outside of scope
8. Did not update documentation for significant changes
9. Violated security rules

---

---

## 🟨 TEMPLATE-SPECIFIC RULES (Architect Platform)

### Project Context Awareness

```yaml
Project Type: "AI Software Generation Platform Template"
Current State: "Phase 2 Complete - Ready for AI Integration"
Immediate Priority: "Begin Phase 3 AI integration with solid foundation"
Critical Gap: "Production logging and rate limiting infrastructure"
Latest Audit Score: 78/100 - Strong foundation, minor production gaps
Security Status: "SECURE - Zero vulnerabilities, auth implemented"
Build Status: "PASSING - All builds and type checking successful"
Test Coverage: "BASIC - 2 tests passing, need API integration coverage"
Database Status: "IMPLEMENTED - Drizzle schema with proper relationships"
Authentication Status: "COMPLETE - Clerk integrated with middleware"
```

### New Agent Engagement Rules

1. **Security-First Implementation Mode**:
   - ALL agents must run `npm audit` before any code changes
   - Address critical CVEs immediately (Next.js 15.0.3 → 15.5.9+)
   - Never commit code with known security vulnerabilities

2. **Authentication Implementation Priority**:
   - Clerk integration is MANDATORY before any feature development
   - Implement middleware for protected routes immediately
   - Add authentication providers to layout.tsx

3. **Database Implementation Sequence**:
   - Create Drizzle schema following blueprint.md:76-123
   - Implement connection management before business logic
   - Add proper database error handling and timeouts

4. **Build System Validation**:
   - Run `npm run build` after EVERY significant change
   - Run `npm run lint` before committing
   - Run `npm run typecheck` before committing
   - Fix all build errors before proceeding

5. **Documentation Synchronization**:
   - Update `blueprint.md` if architecture changes during implementation
   - Keep `roadmap.md` updated with actual progress
   - Mark completed tasks in `task.md` immediately

### Implementation Priorities (Updated Mandatory Order)

1. **Security Patch Phase**: Upgrade dependencies, fix CVEs ✅
2. **Authentication Phase**: Clerk integration + middleware ✅
3. **Database Phase**: Drizzle schema + connection management ✅
4. **Foundation Phase**: API routes + error handling
5. **Integration Phase**: GitHub App + AI APIs
6. **Production Phase**: Testing + Deployment + Monitoring

### Security Implementation Warnings

✅ **RESOLVED**: Next.js 15.0.3 vulnerabilities patched to 15.5.9  
✅ **RESOLVED**: Clerk authentication layer integrated in layout.tsx  
✅ **RESOLVED**: Database schema implemented with Drizzle ORM  
✅ **RESOLVED**: Comprehensive input validation middleware implemented  
⚠️ **MEDIUM**: Production logging uses console statements - replace with structured logging  
⚠️ **LOW**: Database RLS policies not implemented - add for multi-tenant security

### Warning Indicators

⚠️ **CRITICAL**: Any use of console.\* statements in production API routes  
⚠️ **High Risk**: Adding AI features without structured logging infrastructure  
⚠️ **High Risk**: Implementing features without Redis-based rate limiting  
⚠️ **Medium Risk**: Database operations without RLS policies for multi-tenancy  
⚠️ **Medium Risk**: Changing architecture without updating blueprint.md  
⚠️ **Low Risk**: Missing test coverage for new API endpoints

### Agent Health Check Requirements

Before starting ANY work, agents must:

1. **MANDATORY**: Run `npm audit` and confirm no critical vulnerabilities
2. **MANDATORY**: Verify build passes with `npm run build`
3. **MANDATORY**: Run `npm run lint` and `npm run typecheck`
4. Check authentication status in layout.tsx (Clerk integration)
5. Confirm database schema exists if working with data
6. **SECURITY FIRST**: Never commit code with known CVEs

### Updated Security Implementation Rules (Post-Audit)

Based on evaluation score 82/100 with strong security foundation:

1. **Security-Patch Mode**: ALL agents must address CVEs before feature work
2. **Authentication-First**: Clerk integration is mandatory before any APIs
3. **Database-Ready**: Drizzle schema must exist before business logic
4. **Build-Validation**: Run `npm run build` after every significant change
5. **Zero-Tolerance**: No hardcoded secrets, no debug logs in production
6. **Production Logging**: Never use console.\* in API routes - use structured logging
7. **Rate Limiting**: Always implement Redis-backed rate limiting for public endpoints
8. **Test Coverage**: Add integration tests for all new API routes and database operations

---

**Version**: 2.5.0  
**Last Updated**: 2025-12-23 (Comprehensive Architect Evaluation)  
**Context**: Architect Platform - Phase 3 AI Integration Ready  
**Audit Score**: 82/100 - Strong foundation, minor production gaps
