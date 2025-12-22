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

| Rule | Enforcement |
|------|-------------|
| No secrets/credentials in code | ABSOLUTE |
| No debug logs in production | REQUIRED |
| Input validation on all inputs | REQUIRED |
| Generic error messages to users | REQUIRED |
| Parameterized queries for DB | ABSOLUTE |
| Sanitize user-generated content | REQUIRED |

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

**Version**: 2.0.0  
**Last Updated**: 2025-12-20
