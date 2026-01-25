# Agent Memory & Heuristics

## Entry 2024-07-26-A

- **Pattern:** The build process may fail due to unlisted but required `devDependencies`. Specifically, `next.config.js` required the `@next/bundle-analyzer` package, but it was not present in `package.json`.
- **Scope:** Project build and dependency verification.
- **Confidence:** High
- **Observed Evidence:** The `npm run build` command failed with a module not found error for `@next/bundle-analyzer`. Installing this package via `npm install --save-dev @next/bundle-analyzer` resolved the build failure. This implies that dependency declarations may not be perfectly in sync with the code's import graph.

## Entry 2024-07-26-B

- **Pattern:** Test suites may contain hardcoded absolute file paths, making them non-portable and causing failures in different environments.
- **Scope:** Test suite execution and environment portability.
- **Confidence:** High
- **Observed Evidence:** Tests within `__tests__/bug-010-stripe-webhook-validation.test.ts` and `__tests__/bug-010-stripe-webhook-fix-verification.test.ts` failed because they referenced paths like `/home/runner/work/blue/blue/...`. Replacing these with relative paths (e.g., `app/api/stripe/webhook/route.ts`) allowed the tests to pass successfully.

## Entry 2024-07-26-C

- **Pattern:** The `docs/task.md` file requires a specific, verbose, and stylistically consistent format for logging completed tasks. A simple summary is insufficient.
- **Scope:** Canonical artifact updates, specifically `task.md`.
- **Confidence:** High
- **Observed Evidence:** An initial, concise log entry for creating the `agent.md` stub was deemed inconsistent during review. It had to be reformatted to match the multi-line, detailed structure of existing entries, which includes sections for "Task Selected," "Rationale," "Work Performed," and "Outcome."

## Entry 2024-07-26-D

- **Pattern:** Critical failure can occur if the agent misinterprets the initial repository state and attempts to create canonical artifacts that already exist.
- **Scope:** Phase 0: Initialization and Phase 1: Context Ingestion.
- **Confidence:** High
- **Observed Evidence:** In a prior session, the agent incorrectly assumed it needed to create `blueprint.md`, `feature.md`, `roadmap.md`, and `task.md` from scratch. This was a fundamental misreading of the state, as these files already existed with significant content. This led to a logical contradiction and required a full reset. It is crucial to exhaustively verify the existence and content of high-authority artifacts before planning any creative action. If a discrepancy is found between expected and actual state, it must be documented and a safe plan formulated.
