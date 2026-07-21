# Plan

Remaining work: Phase 5 (B3) from the refactor plans, the backlog items, and the post-review additions from the 2026-07-12 audit ([refactor-review.md](./refactor-review.md)). Recommended order, blocks below. Section references like "§6.1" point into refactor-review.md.

**Status convention:** each item's `Done` column is `[x]` when landed on `main`, `[ ]` otherwise. Decision-only items (e.g. A2) are `[x]` once the ADR is accepted.

## Block A

safety net first (before M4)

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [x] | A1 | [CI pipeline (#1)](./codebase-improvements.md#1-ci-pipeline--biggest-gap) | Backlog's own priority #1; M4 is highest-risk remaining change — want enforced gates before it, not after. Land lint/tsc/unit/build blocking now; e2e job with hard timeout, non-blocking until A2. |
| [x] | A2 | [Styling decision (#9)](./codebase-improvements.md#9-pick-one-styling-system) — decision only | Window plan assigned it (Phase 1) already missed; ui/ primitives exist with the mix baked in. Made the call: [ADR-0001](./adr-0001-styling-system.md) — Tailwind-first, MUI behind `ui/` for a closed allowlist. Retrofit later (C1) so M4/M5 diffs don't collide. |

## Block B0

post-review housekeeping ([refactor-review.md](./refactor-review.md) fallout — minutes-to-an-hour each, no ordering between them, land before/alongside B3)

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [x] | B0.1 | Archive `storage-migrations` (`/opsx:archive`); commit the B1/B2 checkbox flips in this file | Only approved-but-unarchived change (§4.2). Archived 2026-07-12 via `openspec archive --skip-specs` (spec rebuild for `library-ops` fails validation — pre-existing; specs untouched). |
| [x] | B0.2 | Bugs migrated to GitHub issues; `bugs/` dir retired | §4.3. `cannot_optimize_after_reject` was fixed+verified 2026-07-03 (no issue needed). Bookkeeping bug re-verified still real (manual writes at factory.ts:368,382) → [#25](https://github.com/Machadeon/the-factory-planner/issues/25). Drawer-loop memory: already marked FIXED in the memory body; index line corrected (§4.4). |
| [x] | B0.3 | Flip CI e2e job to blocking (drop `continue-on-error: true`) | "Non-blocking until A2" condition expired — A2 landed, e2e green on main since (§4.5). Red e2e currently merges silently. |
| [x] | B0.4 | Add knip config + CI step | Dead code is ≈2 files + ~30 exports today (§3); lock that in. Landed: `knip.json` (files/dependencies error; exports/types warn until B3 prunes, then flip to error), `npm run knip`, blocking CI job; the 2 unused icon `.js` files deleted. |
| [x] | B0.5 | Backlog consolidation + archive gate | Merge `plan.md` Improvements/Optimizations and open `bugs/` into (or cross-ref from) codebase-improvements.md (§5.5); add process rule: open non-blocking review findings must land in `bugs/` or the backlog before `/opsx:archive` (§5.6 — closes the hole that produced §6.1). Reconcile model-refactor.md's stale ≤400-line factory.ts target while in there (§4.6). |
| [x] | B0.6 | Triage `solver/base-model.ts:96` "TODO fix for factories as recipes" | Untriaged correctness flag inside the LP model builder (§4.8). Triaged 2026-07-12: TODO predates the refactor (original solver commit), intent unrecoverable from code; plausible concern is sub-factory internal raw-resource consumption escaping resource limits. Filed with analysis notes → [#26](https://github.com/Machadeon/the-factory-planner/issues/26); resolve before E1. |

## Block B

finish the refactor plans

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [x] | B1 | [M4 model-reactivity-cleanup](./model-refactor.md#phase-m4--model-reactivity-cleanup) | All deps landed (M2, Phase 2). Highest-risk; do while valtio context fresh and CI green. Gates undo/redo (F1). |
| [x] | B2 | [M5 storage-migrations](./model-refactor.md#phase-m5--storagemigration-cleanup) | After M4 per plan order; deserialize paths settle here. |
| [x] | B2.5 | Bug: `splitRecipes` stale `rateLookup` + widen mutation-contract test ([#23](https://github.com/Machadeon/the-factory-planner/issues/23)) | Left open by M4's review, never filed (§6.1 items 2–3). Fixed via `Factory.splitRecipeRates(pl)`/`rejectLine`/`rejectAssembly`/`rejectLineChoice`/`rejectAssemblyChoice`, all ending in `_updateRates()`; widened contract-test regexes to bare `productionLine.splitRecipeRates(` and `applyRejectSilent(`/`applyRejectChoice(` (found and closed both reject call-site variants, not just the one the bug used). |
| [x] | B3 | [Phase 5 naming/layout sweep](./component-refactor.md#phase-5--naming-layout-and-sweep) | Closes both refactor plans. Landed 2026-07-12 via `component-naming-and-layout` (archived). All 22 flat `app/components/` files moved into feature dirs, `Component` suffix dropped, `useFactoryPageFlows.ts` → `app/hooks/`, `AssemblyLineControls.tsx` (missed in original task breakdown, caught during implementation) also moved. §4.7/§4.1/§3/§6.2/§4.8 review items all closed: 3 `var`→`let`/`const` in factory.ts, double factory-recipe import merged, dead `!library` guards removed, `GraphProps` optionality fixed, reveal-block duplication in ProductionLineDetails merged, ~21 knip-flagged exports deleted (2 kept — `partLookup`/`buildingLookup` — spec-pinned via `@public` tag; 2 more discovered as knip false positives via dynamic `import()`, also `@public`-tagged), knip severity flipped warn→error, `powerPart` barrel trim, last models-layer `as unknown as` closed in `factory-storage.ts` (type-honest fix, regression-tested), AGENTS.md corrected. Logging cleanup (#14): verified already clean, no action needed. |

### M4 Prompt

> _Opus 4.8, high effort_

Start /opsx:new for change `model-reactivity-cleanup` — Phase M4 in plans/model-refactor.md. Read that plan (esp. §2.2, §2.3, M4, §5) and the "State pattern: valtio" section of plans/component-refactor.md. Scope is the plan's M4 section verbatim; do not expand it.

First verify prerequisites from the sequencing table (§6) are on main — M2 and component Phase 2 (valtio store, recompute-only update shim). Stop and tell me if missing.

The two decisions M4 defers to spec (aliasing approach, ref()-exempt list) must be pinned during /grill-me, not during implementation.

Review subagents: pass model: "fable" to the Agent tool for design-review and the final review.md pass; model: "opus" for tasks-review. Reviewers verify: (a) every rate-affecting mutator recomputes, (b) no component mutates outside model methods, (c) tasks.md orders the counting-subscribe tests before update() deletion.

### M5 Prompt

> _Sonnet 5, high effort_

Start /opsx:new for change `storage-migrations` — Phase M5 in plans/model-refactor.md. Read that plan (esp. §2.6, M5). Scope is the plan's M5 section verbatim; do not expand it.

First verify prerequisites from the sequencing table (§6) are on main — M4 merged, and models/library-ops.ts exists (component Phase 2 creates it; this change absorbs it). Stop and tell me if missing.

Testing (plan §5 doesn't cover M5): existing round-trip tests pass unmodified; add stub-mode parity test (new resolver-returns-null path vs old deserializeFactoryStub output on a factory with nested links); each per-schema migration step gets its own unit test with a real fixture of that version. Migration bugs corrupt stored libraries silently — fixtures are the gate.

Review subagents: pass model: "opus" to the Agent tool for all review passes. Reviewers verify per-version fixtures and stub parity test exist.

## Block C

resilience + small UX (post-refactor, mostly parallelizable)

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [ ] | C1 | Styling retrofit per [ADR-0001](./adr-0001-styling-system.md) (A2 decision) | After Phase 5 renames — avoids rebase churn on moved files. **Land the emotion cascade-layer fix first** (`AppRouterCacheProvider enableCssLayer: true` + `@layer` order in `globals.css`); without it every Tailwind override on a retained MUI widget silently no-ops mid-migration. Also resolve here: CssBaseline-vs-preflight, biome `no @mui outside ui/` rule (icons exempt), migrate non-allowlist MUI widgets to Tailwind. **Plus the `m-[-2]` decision** (§6.1 item 4): unitless margin is invalid CSS, silently dropped — restore the −2px overlap intent (`m-[-2px]`, visual change) or bless the shipped look and delete the token. |
| [x] | C2 | [Toast primitive + kill alert() (#10)](./codebase-improvements.md#10-kill-alert) | Small; toast is prerequisite for C3. Landed 2026-07-20 via `toast-primitive-kill-alert`: `ui/toast/` (`ToastProvider`/`useToast`, Top-Layer popover, error sticky + info/success auto-dismiss, capped visible stack, aria-live). All 3 `alert()` sites swapped. One C3 follow-up filed (uncap toast queue). |
| [ ] | C3 | [Storage-failure surfacing (#4)](./codebase-improvements.md#4-silent-storage-failure--data-loss) + [ErrorBoundary (#5)](./codebase-improvements.md#5-react-errorboundary) | Data-loss protection; needs toast (C2) and benefits from M5's clean storage layer. Batch as one "resilience" change. |
| [ ] | C4 | [RateDisplay non-color signaling (#12)](./codebase-improvements.md#12-non-color-status-signaling--a11y-rules) | One-file change now that RateDisplay exists. a11y biome rules already active per AGENTS.md — just the icon/text affordance remains. **Plus keyboard-accessible sidebar splitter** (§6.1 item 5): `FactorySidebar.tsx`'s biome-ignore claims it's "tracked separately" — this is that tracking. Last Clickable-era a11y hole. |
| [ ] | C5 | [Game-data versioning doc (#15)](./codebase-improvements.md#15-game-data-versioning) | Trivial filler, slot anywhere. |

## Block D

type strictness (solo, quiet window)

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [ ] | D1 | [noUncheckedIndexedAccess (#2)](./codebase-improvements.md#2-enable-nouncheckedindexedaccess) | Touches many files — worst merge-conflict profile of anything remaining. After Phase 5 + C1, all file moves done; land alone. |
| [ ] | D2 | Model read accessors + render-side contract (§5.1; spec already written in `plan.md` Improvements) | Read-side counterpart of the M4 mutation contract. Fix `PartRateSummary` rendering from the `useFactory()` proxy (works only via OverviewSidebar's blanket subscription — silently freezes if that scope narrows); add public read accessors (`getPartRate(slug)`, `getAssemblyLinesFor(slug)`, `isMainOutput(part)`) replacing component reads of `rateLookup`/`_assemblyLineLookup`/`_mainOutputParts`; extend the standing contract test to catch renders-from-proxy and underscore reads. Same many-file profile as D1 — same quiet window; hardens F1's snapshot points. |

## Block E

performance (sequential within block)

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [ ] | E0 | Bug: multi-maximize objective overwrite in rate solver (§6.1 item 1, [#24](https://github.com/Machadeon/the-factory-planner/issues/24)) | `rate-solver.ts:40-46`: second maximize target overwrites the first's `_obj`; variables missing the part key get `_obj = undefined`. Flagged MED in split-factory-god-class review, "filed as follow-up" that never existed. Regression test first, spec amendment (R1.S6 pins the broken semantics). **Must precede E1** so the highs-js swap has a correct baseline to preserve; independent of everything else, can land any time earlier. |
| [ ] | E1 | [highs-js swap (#7)](./codebase-improvements.md#7-replace-javascript-lp-solver) | Solver isolated behind models/solver/ since M2. Swap behind the interface first, on main thread — isolates correctness risk from transport risk. |
| [ ] | E2 | [Solver worker + debounce (#6)](./codebase-improvements.md#6-lp-solver-off-the-main-thread) | Then worker-ize (WASM already in play from E1). After M4 matters: mutation contract defines exactly where solve results apply. |
| [ ] | E3 | [Deserialization caching (#8)](./codebase-improvements.md#8-deserialization-caching) | After M5 (deserialize core just changed) and 4d's consumer-links.ts (landed). |

## Block F

features

| Done | # | Item | Why here |
| --- | --- | --- | --- |
| [ ] | F1 | [Undo/redo (#11)](./codebase-improvements.md#11-undoredo) | Hard-gated on M4 (mutation contract + aliasing fix). Biggest feature; wants everything structural done. **Precondition from review** (§6.2 item 10): normalize `useLibrary.addFolder` to functional `setLibrary(prev => …)` — its `libraryRef` + absolute-set pattern silently drops concurrent functional updates, and undo/redo is exactly the future that batches mutations. |
| [ ] | F2 | [Share via URL (#13)](./codebase-improvements.md#13-share-factories-via-url) | Independent; after M5 so bundle format is stable. |
| [ ] | F3 | [PWA manifest (#16)](./codebase-improvements.md#16-pwa-manifest) | Lowest priority per backlog; anytime after F2. |

# Summary

Key deviations from backlog's own priority list: solver work (#6/#7) pushed behind Phase 5 — backlog says "after M2" as precondition, but M4 changes how solve results propagate, so worker-izing before M4 means doing the transport wiring twice. Undo/redo unchanged (backlog agrees: after M4).

Post-review additions (2026-07-12, [refactor-review.md](./refactor-review.md)): B0 housekeeping block; two untracked bug fixes surfaced from archived review artifacts (B2.5 before B3's renames, E0 before E1's solver swap); D2 read-side model contract; scope annotations on B3/C1/C4/F1. Items not promoted to rows (accepted as-is or too low-value, §6.3/§4.8): render-scope test-realism note (becomes actionable with D2), github-pages live-site formal check (5-min filler, do with C5), optimizer-config test label convention, logistics reactflow `as unknown as` casts ×7 (proper `Node<T>` generics — medium effort, low urgency, revisit if logistics grows).

Parallelization: B0.1–B0.6 independent of each other and of everything else — slot anywhere before/alongside B3. B2.5 strictly before B3. E0 independent, anytime before E1. C2–C5 independent of each other and of C1. D1/D2 each strictly solo (same quiet-window profile; either order). E-block sequential.
