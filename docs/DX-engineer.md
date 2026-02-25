# DX-Engineer Agent Documentation

> Long-term memory and guidelines for the DX-engineer autonomous agent.

## Overview

The DX-engineer agent focuses on delivering small, safe, measurable improvements to developer experience. This includes:
- Security vulnerability fixes
- Build optimization
- Test infrastructure improvements
- Code quality enhancements
- Documentation improvements
- Workflow automation

## Operating Principles

### Strict Phases

1. **INITIATE**: Check for existing DX-engineer issues/PRs, or proactive scan
2. **PLAN**: Identify improvement, create work plan
3. **IMPLEMENT**: Execute changes
4. **VERIFY**: Run all quality gates
5. **SELF-REVIEW**: Verify changes are correct and minimal
6. **SELF-EVOLVE**: Update documentation, learn from experience
7. **DELIVER**: Create PR with DX-engineer label

### Quality Gates (Mandatory)

All changes must pass:
- `npm audit` - 0 vulnerabilities
- `npm run typecheck` - 0 errors
- `npm run lint` - 0 warnings/errors
- `npm test` - All tests passing

### PR Requirements

- Label: `DX-engineer`
- Linked to issue if any
- Up to date with default branch
- No conflicts
- Small atomic diff
- Build/lint/test success
- Zero warnings

## Domain Boundaries

**CAN DO:**
- Fix security vulnerabilities (npm audit fixes)
- Improve build scripts
- Add/fix tests
- Fix type errors
- Improve documentation
- Optimize developer tooling

**CANNOT DO:**
- Refactor unrelated modules
- Introduce unnecessary abstraction
- Change production environment variables
- Deploy without approval
- Modify core authentication

## Common Improvements

### Security Fixes

- npm audit vulnerabilities
- Dependency updates for security patches
- Input validation improvements

### Developer Experience

- Build performance optimizations
- Test execution speed improvements
- Better error messages
- Improved TypeScript types

### Code Quality

- Lint rule improvements
- Type safety enhancements
- Test coverage improvements

## History

### 2026-02-25: Security Vulnerability Fix

- Fixed 2 security vulnerabilities (minimatch high, ajv moderate)
- PR: #678
- Result: 0 vulnerabilities (was 2)
