# Plan

Remaining work: M4, M5, Phase 5 from refactor plans + all 16 backlog items. Recommended order, six blocks:

## Block A

safety net first (before M4)

| # | Item | Why here |
| --- | --- | --- |
| A1 | [CI pipeline (#1)](./codebase-improvements.md#1-ci-pipeline--biggest-gap) | Backlog's own priority #1; M4 is highest-risk remaining change — want enforced gates before it, not after. Land lint/tsc/unit/build blocking now; e2e job with hard timeout, non-blocking until A2. |
| A2 | [Styling decision (#9)](./codebase-improvements.md#9-pick-one-styling-system) — decision only | Window plan assigned it (Phase 1) already missed; ui/ primitives exist with the mix baked in. Make the call now (ADR in plans/), retrofit later (C1) so M4/M5 diffs don't collide. |

## Block B

finish the refactor plans

| # | Item | Why here |
| --- | --- | --- |
| B1 | [M4 model-reactivity-cleanup](./model-refactor.md#phase-m4--model-reactivity-cleanup) | All deps landed (M2, Phase 2). Highest-risk; do while valtio context fresh and CI green. Gates undo/redo (F1). |
| B2 | [M5 storage-migrations](./model-refactor.md#phase-m5--storagemigration-cleanup) | After M4 per plan order; deserialize paths settle here. |
| B3 | [Phase 5 naming/layout sweep](./component-refactor.md#phase-5--naming-layout-and-sweep) | Closes both refactor plans. Fold in logging cleanup (#14) if M2 didn't already delete the commented console lines — same sweep character. Do before any file-touching backlog work so renames don't conflict. |

### M4 Prompt

Start /opsx:new for change `model-reactivity-cleanup` — Phase M4 in plans/model-refactor.md. Read that plan (esp. §2.2, §2.3, M4, §5) and the "State pattern: valtio" section of plans/component-refactor.md. Scope is the plan's M4 section verbatim; do not expand it.

First verify prerequisites from the sequencing table (§6) are on main — M2 and component Phase 2 (valtio store, recompute-only update shim). Stop and tell me if missing.

The two decisions M4 defers to spec (aliasing approach, ref()-exempt list) must be pinned during /grill-me, not during implementation.

Review subagents: pass model: "fable" to the Agent tool for design-review and the final review.md pass; model: "opus" for tasks-review. Reviewers verify: (a) every rate-affecting mutator recomputes, (b) no component mutates outside model methods, (c) tasks.md orders the counting-subscribe tests before update() deletion.

### M5 Prompt

Start /opsx:new for change `storage-migrations` — Phase M5 in plans/model-refactor.md. Read that plan (esp. §2.6, M5). Scope is the plan's M5 section verbatim; do not expand it.

First verify prerequisites from the sequencing table (§6) are on main — M4 merged, and models/library-ops.ts exists (component Phase 2 creates it; this change absorbs it). Stop and tell me if missing.

Testing (plan §5 doesn't cover M5): existing round-trip tests pass unmodified; add stub-mode parity test (new resolver-returns-null path vs old deserializeFactoryStub output on a factory with nested links); each per-schema migration step gets its own unit test with a real fixture of that version. Migration bugs corrupt stored libraries silently — fixtures are the gate.

Review subagents: pass model: "opus" to the Agent tool for all review passes. Reviewers verify per-version fixtures and stub parity test exist.

## Block C

resilience + small UX (post-refactor, mostly parallelizable)

| # | Item | Why here |
| --- | --- | --- |
| C1 | Styling retrofit per A2 decision | After Phase 5 renames — avoids rebase churn on moved files. |
| C2 | [Toast primitive + kill alert() (#10)](./codebase-improvements.md#10-kill-alert) | Small; toast is prerequisite for C3. |
| C3 | [Storage-failure surfacing (#4)](./codebase-improvements.md#4-silent-storage-failure--data-loss) + [ErrorBoundary (#5)](./codebase-improvements.md#5-react-errorboundary) | Data-loss protection; needs toast (C2) and benefits from M5's clean storage layer. Batch as one "resilience" change. |
| C4 | [RateDisplay non-color signaling (#12)](./codebase-improvements.md#12-non-color-status-signaling--a11y-rules) | One-file change now that RateDisplay exists. a11y biome rules already active per AGENTS.md — just the icon/text affordance remains. |
| C5 | [Game-data versioning doc (#15)](./codebase-improvements.md#15-game-data-versioning) | Trivial filler, slot anywhere. |

## Block D

type strictness (solo, quiet window)

| # | Item | Why here |
| --- | --- | --- |
| D1 | [noUncheckedIndexedAccess (#2)](./codebase-improvements.md#2-enable-nouncheckedindexedaccess) | Touches many files — worst merge-conflict profile of anything remaining. After Phase 5 + C1, all file moves done; land alone. |

## Block E

performance (sequential within block)

| # | Item | Why here |
| --- | --- | --- |
| E1 | [highs-js swap (#7)](./codebase-improvements.md#7-replace-javascript-lp-solver) | Solver isolated behind models/solver/ since M2. Swap behind the interface first, on main thread — isolates correctness risk from transport risk. |
| E2 | [Solver worker + debounce (#6)](./codebase-improvements.md#6-lp-solver-off-the-main-thread) | Then worker-ize (WASM already in play from E1). After M4 matters: mutation contract defines exactly where solve results apply. |
| E3 | [Deserialization caching (#8)](./codebase-improvements.md#8-deserialization-caching) | After M5 (deserialize core just changed) and 4d's consumer-links.ts (landed). |

## Block F

features

| # | Item | Why here |
| --- | --- | --- |
| F1 | [Undo/redo (#11)](./codebase-improvements.md#11-undoredo) | Hard-gated on M4 (mutation contract + aliasing fix). Biggest feature; wants everything structural done. |
| F2 | [Share via URL (#13)](./codebase-improvements.md#13-share-factories-via-url) | Independent; after M5 so bundle format is stable. |
| F3 | [PWA manifest (#16)](./codebase-improvements.md#16-pwa-manifest) | Lowest priority per backlog; anytime after F2. |

# Summary

Key deviations from backlog's own priority list: solver work (#6/#7) pushed behind Phase 5 — backlog says "after M2" as precondition, but M4 changes how solve results propagate, so worker-izing before M4 means doing the transport wiring twice. Undo/redo unchanged (backlog agrees: after M4).

Parallelization: C2–C5 independent of each other and of C1. D1 strictly solo. E-block sequential. A1+A2 could run concurrent (CI lands non-blocking e2e regardless), but A2 first if picking one.
