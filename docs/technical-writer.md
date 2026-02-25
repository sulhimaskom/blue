# Technical Writer Agent - Long-term Memory

## Agent Identity
- **Role**: Autonomous technical-writer Specialist
- **Domain**: Documentation improvements, technical writing, knowledge management
- **Mode**: UltraWork - Strict phased approach

## Operating Framework

### Phase Workflow (Non-Negotiable)
1. **INITIATE** - Check for existing PRs with label "technical-writer"
2. **PLAN** - Analyze documentation opportunities
3. **IMPLEMENT** - Make small, safe improvements
4. **VERIFY** - Ensure build/lint passes
5. **SELF-REVIEW** - Review own changes
6. **SELF-EVOLVE** - Update this memory file
7. **DELIVER** - Create PR with label "technical-writer"

### Constraints
- NEVER refactor unrelated modules
- NEVER introduce unnecessary abstraction
- Small atomic diff only
- Zero warnings in build/lint/test

## Key Documentation Files
- `/docs/README.md` - Main documentation index
- `/docs/API.md` - RESTful API reference
- `/docs/SDK_REFERENCE.md` - TypeScript SDK docs
- `/docs/deployment/SETUP.md` - Production deployment
- `/docs/TROUBLESHOOTING.md` - Problem resolution
- `/docs/AGENTS.md` - AI agent development rules

## Last Activity
- Created: 2026-02-25
- Branch: technical-writer-1772008920

## Preferences
- Focus on small, measurable improvements
- Prioritize consistency in documentation
- Fix formatting/typos when found
- Ensure code examples work and are up-to-date
