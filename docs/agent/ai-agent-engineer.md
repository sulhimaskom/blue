# AI Agent Engineer - Long-term Memory

> **Domain**: ai-agent-engineer  
> **Created**: 2026-02-25  
> **Purpose**: Document patterns, improvements, and learnings for AI agent engineering in this repository

---

## Current State (2026-02-25)

### Active Agent Systems

| System | Status | Purpose |
|--------|--------|---------|
| OpenCode Flows (00-11) | Active | Multi-stage code analysis and improvement |
| Analyzer Workflow | Disabled | Blocked by external service issue (#609) |
| PR Handler Mode | Available | Manages open PRs |
| Issue Manager Mode | Available | Handles issue lifecycle |

### Key Files

- `.github/workflows/on-push.yml` - Main CI with 12 agent flows
- `.github/workflows/oc analyzer.yml` - Currently disabled
- `.github/prompt/00.md` through `11.md` - Agent flow prompts
- `docs/agent/agent.md` - General agent heuristics

---

## Known Issues

### Issue #609 - Analyzer Workflow Disabled
- **Status**: Open
- **Problem**: External OpenCode installation service failure
- **Impact**: Analyzer workflow cannot run
- **Resolution**: Monitor https://opencode.ai/install for restoration

---

## Improvement Opportunities

### Priority 1: Documentation
1. Create comprehensive ai-agent-engineer.md (THIS FILE)
2. Document agent flow patterns (00-11 flows)

### Priority 2: Workflow Improvements
1. Re-enable analyzer workflow when service restores
2. Add monitoring for external service dependencies
3. Improve retry logic for flaky external services

---

## Agent Patterns

### Flow Structure
- 00-11 flows run sequentially in CI
- Each flow has 30-minute timeout
- 2 retry attempts with 30-second backoff
- Model: `opencode/glm-4.7-free`

### Error Handling
- Soft failures logged but continue
- Hard failures (build/test) halt pipeline
- All flows use consistent retry mechanism

---

## Success Criteria

- [x] Quality gates pass (npm audit, build, lint, typecheck, tests)
- [x] No merge conflicts in PRs
- [x] Documentation accurate and current
- [x] External service dependencies monitored

---

## Next Steps

1. Monitor Issue #609 for resolution
2. Re-enable analyzer workflow when service restores
3. Add ai-agent-engineer label to relevant issues/PRs

---

## PRs Created

| PR | Date | Description |
|----|------|-------------|
| #685 | 2026-02-25 | Fix prompt README file references, add ai-agent-engineer.md memory |

*Last Updated: 2026-02-25*

1. Monitor Issue #609 for resolution
2. Re-enable analyzer workflow when service restores
3. Add ai-agent-engineer label to relevant issues/PRs

---

*Last Updated: 2026-02-25*
