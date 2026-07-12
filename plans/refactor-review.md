# Refactor Retrospective & Current-State Review

Written 2026-07-12, after M4/M5 merged (PRs #20, #21). Snapshot of the codebase with
`model-refactor.md` complete, `component-refactor.md` complete except Phase 5, and
plan-order Block A done. Evidence-based; every claim was verified against the working tree.

## 1. What went well

- **The plans executed.** 17 archived OpenSpec changes in ~12 days (2026-06-30 → 2026-07-12),
  in almost exactly the sequencing table's order (M0 bugs → Phase 1 → M1 → M2 → Phase 2 →
  Phase 3 → M3 → 4a–4d → M4 → M5). The target architecture from both plans exists on disk:
  `game-data/`, `solver/` (base-model, rate-solver, recipe-optimizer, verify, errors),
  `hooks/` (all six planned hooks), `contexts/` (all three), `components/ui/` (all planned
  primitives), and feature dirs (`factory/`, `library/`, `overview/`, `planning/`,
  `optimization/`, `logistics/`).
- **Both god files are dead.** `FactoryComponent.tsx` (1,159 lines) → `FactoryPage` +
  hooks + `useFactoryPageFlows`; `factory.tsx` (1,424) → `factory.ts` (707) + solver/ +
  metrics + optimizer-config + suggestions. The 707 is mostly the M4 mutator façade
  (~40 named mutation methods), which is the mutation contract by design — see §4.6.
- **The mutation contract is real and enforced.** No `factory.update` anywhere; every
  rate-affecting mutator ends in `_updateRates()` or a re-solve; standing test
  `tests/unit/mutation-contract.test.ts` guards regressions; AGENTS.md documents the
  reads-from-snapshot/writes-to-proxy convention.
- **Test growth landed where the plans promised.** ~28 unit model test files (solver,
  metrics, migrations, suggestions, optimizer-config, machine-math, AnyRecipe narrowing,
  valtio snapshot spike), all six hooks tested, integration tests for reactivity
  (`factory-reactivity.test.tsx`), e2e suites organized by feature. CI green on main
  (biome, tsc, unit, build blocking; e2e running).
- **M5 quality.** Review artifacts show hand-traced cycle-handling verification, stub-parity
  testing, per-fixture migration tests, and zero leftover references to deleted modules
  (`library-ops.ts`, `deserializeFactoryStub`). Schema-version retirement was done cleanly
  (`CURRENT_SCHEMA_VERSION = 1`, unconditional structural migration).
- **Dead code is genuinely low.** An ad-hoc `npx knip` run found only 2 unused files and
  ~25 unused exports across the whole app (§3). For a codebase that just went through 17
  refactor changes, that is a strong result.

## 2. What went poorly / friction

- **Phase 5 being last leaves the repo in its most confusing-looking state.** 23 files
  still sit flat in `app/components/` with pre-refactor names (`ProductionLineComponent`,
  `RecipeComponent`, `AssemblyLineComponent`, …) while their extracted halves live in
  feature dirs (`planning/ProductionLineRow` + `ProductionLineDetails` are imported *by*
  the flat `ProductionLineComponent`). All 23 are live (each has ≥1 importer — none dead),
  but a new team member cannot tell "old code awaiting deletion" from "new code awaiting
  rename" without reading the plans. This was a known, accepted cost of the sequencing;
  it is now the single highest-leverage cleanup remaining (B3).
- **AGENTS.md drifted during the same window it was being enforced.** Two stale claims
  survive in the checked-in project instructions (§4.1) — including one that directly
  contradicts the (correct) state-management section three paragraphs below it.
- **Process artifacts weren't closed out.** `openspec/changes/storage-migrations` is merged
  and its review shows APPROVED, but it was never archived; `plans/plan-order.md`'s B1/B2
  checkboxes are an uncommitted working-tree edit; two `bugs/` entries are very likely
  fixed but were never verified/closed (§4.3, §4.4).
- **Plan backlog fragmentation.** Improvement items now live in three places:
  `codebase-improvements.md` (the official backlog), `plan.md` ("Roadmap" — contains a
  fully-specified read-accessor item that codebase-improvements doesn't know about), and
  `bugs/`. A fresh session pointed at codebase-improvements.md would miss real work (§5).

## 3. Dead code inventory

Ad-hoc `npx knip` (no knip config in repo — results eyeballed for false positives):

**Unused files (delete):**
- `app/components/icons/MoonIcon.js`, `app/components/icons/SunIcon.js` — also the only
  `.js` files in the app tree; zero importers.

**Unused exports (prune or justify):**
- `Dividers.tsx: VerticalDivider` — only `HorizontalDivider` is used.
- `ui/interactive-styles.ts` — the six raw class-string constants (`interactiveBaseClass`,
  `interactiveHoverClass`, `interactiveWarningClass`, `interactiveDangerClass`,
  `buttonResetClass`, `focusVisibleClass`) are exported but only the composed helpers
  (`interactiveClasses`, `rowVisualClasses`, `bareButtonClasses`) are consumed. Narrow the
  export surface; this is exactly the "clickableClass re-export" Phase 5.2 targets.
- `lib/expression/index.ts` re-exports internals (`tokenize`, `shuntingYard`,
  `evalReversePolishNotation`, `functions`, `operators`, key lists) used only by tests —
  tests can import from the submodules; the barrel should export `calculate` only.
- `game-data/index.ts`: `partLookup`, `buildingLookup`, `powerPart`;
  `game-data/constants.ts`: `syntheticSinkPoints`. **Caveat:** AGENTS.md documents
  `partLookup`/`buildingLookup` as the public barrel API — either the docs or the exports
  are wrong; reconcile deliberately, don't just prune.
- `point-values.ts`: `combiners`, `filters`; `useAutosave.ts`: `AUTOSAVE_DEBOUNCE_MS`;
  `logistics/graph-layout.ts`: `MIN_EDGE_WIDTH`/`MAX_EDGE_WIDTH`;
  `tests/helpers/render-with-providers.tsx`: `AppProviders`.
- Unused exported types: `ConfirmSeverity`, `RejectPrompt`, `NodeKind`, `GraphNodeData`,
  `GraphEdge`, `SerializedAssemblyLine`, `SerializedProductionLine`, `PossibleValue`.

Verdict: total dead weight ≈ 2 files + ~30 export keywords. Low. Worth a knip config +
CI step to keep it that way (§5.2).

## 4. Loose ends

### 4.1 AGENTS.md doc drift (fix in B3 — it's the "update AGENTS.md" step)
- Line ~75: "`Factory.update()` injected by `FactoryComponent` at mount" — **both dead**.
  M4 deleted the `update` field entirely; `FactoryComponent` no longer exists. Directly
  contradicts the state-management section below it ("There is no `update` field").
- Line ~110: "`StorageLibrary` holds `folders`, `factories` at `schemaVersion` 2" — it's
  pinned at **1** since M5 (`factory-storage.ts:83`). Same line: "`factory-storage.ts` owns
  serialization, deserialization, migration" — migration moved to `app/models/migrations.ts`.

### 4.2 Unarchived OpenSpec change
`openspec/changes/storage-migrations/` — review.md Pass 2 shows APPROVED, PR #21 merged.
Needs `/opsx:archive`. Also: `plans/plan-order.md` B1/B2 checkbox flips are sitting
uncommitted in the working tree.

### 4.3 `bugs/` entries likely fixed but never closed
- `cannot_optimize_after_reject.md` — root cause was the stale `_productionLineLookup`;
  `fix-stale-production-line-lookup` archived 2026-07-03. Its review.md records a manual
  browser repro pass confirming the bug no longer reproduces — no re-verification needed,
  just close the file (the dir has no closed-state convention — add one).
- `redundant_production_line_lookup_bookkeeping.md` — written pre-M2/M4; asks that
  `_productionLineLookup` have exactly one write site. Verify whether M2/M4 mutator
  ownership resolved the three manual write sites it lists; close or re-scope.

### 4.4 Stale agent memory (not repo, but same review)
`bug_drawer_loop.md` memory says the drawer open/close infinite loop is unfixed and hangs
Playwright — but `tests/e2e/library/open-close-library.spec.ts` exists and the e2e job
passes on main. Verify with a manual multi-cycle session, then update/delete the memory.

### 4.5 CI: e2e still `continue-on-error: true`
Plan-order A1 said "non-blocking until A2"; A2 is done and e2e has been green on recent
main pushes. Flip it to blocking (keep the 10-min timeout). Until then a red e2e run
merges silently — the exact gap A1 existed to close.

### 4.6 `factory.ts` is 707 lines vs the plan's ≤400 target
Not a failure — the delta is the M4 mutator façade (~40 small named mutators,
`setClockSpeed` … `setAssemblyLineRowSpacing`), which the ≤400 target predates. Either
revise the stated target in model-refactor.md §3 or split a `factory-mutations.ts` if it
keeps growing. Decide; don't leave the plan contradicting the code.

### 4.7 Phase 5 sweep items confirmed still present
- `var` ×3 in `factory.ts` (:236, :237, :339) — plan said ProductionLineComponent/
  RecipeComponent/Clickable; those were cleaned, these three were missed by earlier phases.
- `Component`-suffix files ×5+ flat files ×23; integration test files named after them
  (`AssemblyLineComponent.test.tsx`, …) will need renames in the same change.
- `ui/` candidates still flat: `Dividers`, `TextCalculatorField`, `PartSelector`
  (all three are in the plan's target tree under `ui/`).
- `useFactoryPageFlows.ts` lives in `components/factory/` while every other hook lives in
  `app/hooks/` — pick one home in B3.
- `tests/unit/models/library-ops.test.ts` — file name stale since M5 deleted
  `library-ops.ts` (the test now covers migrations/merge behavior and asserts the old
  file is gone); rename alongside B3.

### 4.8 Residual type-unsafety
- `factory-storage.ts:226` — one `as unknown as` survives in models despite M3's "delete
  every `as unknown as` in models" (availableParts raw-shape cast in deserialization).
- `logistics/` ×5 + `LogisticsSection.tsx` ×2 — `data as unknown as XxxNodeData` casts at
  every reactflow node/edge boundary. Never in any plan's scope (logistics was "already
  well-factored"). Fixable with typed reactflow generics (`Node<AssemblyNodeData>`);
  medium effort, low urgency.
- TODO ×4 in app code. Three are benign markers, but `solver/base-model.ts:96`
  ("TODO fix for factories as recipes") flags a known-wrong branch **inside the LP model
  builder** — triage it: is it a real correctness bug reachable from the UI? If so it
  belongs in `bugs/`; if not, the comment should say why it's safe.

## 5. Gaps in `codebase-improvements.md` (items not on any remaining list)

1. **Read-side model contract (biggest one).** Components render from underscore/index
   fields: `PartRateSummary.tsx:41` reads `factory._assemblyLineLookup` — **from the
   `useFactory()` proxy, not a snapshot**, violating the documented "Never render off
   this" rule in FactoryContext. It currently works only because `OverviewSidebar`
   subscribes the whole subtree via `useFactoryUpdateSubscription()`; scope that parent
   subscription later and PartRateSummary silently stops updating. Also:
   `graph-model.ts` reads `rateLookup` + `_mainOutputParts`, overview sections read
   `rateLookup` (those via snapshot — fine mechanically, but all bypass any public API).
   `plans/plan.md` already specs the fix (public read accessors: `getPartRate(slug)`,
   `getAssemblyLinesFor(slug)`, `isMainOutput(part)`) — but it's absent from
   codebase-improvements.md, and the mutation-contract test only guards *writes*. Adopt
   into the backlog; extend the standing test to flag renders-from-proxy and underscore
   reads from components.
2. **Dead-export enforcement.** Add a `knip` config + CI step. Count is low now (§3);
   cheap to lock in.
3. **CI e2e → blocking** (§4.5). One-line change plus a decision about flake tolerance.
4. **Doc-accuracy pass on AGENTS.md** (§4.1) — B3 nominally covers it, but the specific
   stale lines are enumerated here so they don't get missed.
5. **Backlog consolidation.** Merge `plan.md`'s Improvements/Optimizations section and the
   open `bugs/` entries into (or cross-reference from) `codebase-improvements.md`, and
   define a closed-state convention for `bugs/`. Note `plan.md`'s "why is
   deserializeFactory called in a render thread?" overlaps improvement #8
   (deserialization caching) — same fix, currently tracked twice.
6. **Process hygiene item:** archive step is manual and was skipped (§4.2) — consider a
   checklist line in the opsx archive prompt or a CI check that `openspec/changes/` only
   contains `archive/` on main.

## 6. Review-artifact sweep: non-blocking findings left open

All 16 changes' review artifacts (`review.md` + the design/spec/tasks reviews) were swept
for findings that were APPROVED past as non-blocking. Every item below was re-verified
against the current tree on 2026-07-12. The systemic problem first:

**Reviews say "filed as follow-up" / "tracked separately" — but nothing was ever filed.**
Neither `bugs/`, `plans/`, nor `codebase-improvements.md` contains any of the deferred
items; the archived review.md is their only record. Two of them are real latent bugs.
Fix the process (see §5.6) and adopt the items below.

### 6.1 Still-live defects, tracked nowhere — file as bug changes / backlog items

1. **Multi-maximize objective overwrite in rate solver** (MED, `split-factory-god-class`
   review Pass 1). `solver/rate-solver.ts:40-46` still assigns
   `coefficients._obj = coefficients[partSlug]` directly inside the maximize loop: with
   two+ maximize targets the later target overwrites the earlier, and a variable lacking
   the part key passes `!== 0` (undefined ≠ 0) and gets `_obj = undefined`. Review said
   "filed as follow-up task 'Fix multi-maximize objective overwrite'" — no such filing
   exists anywhere. **Relevance now: high** — E1 (highs-js swap) rebuilds exactly this
   code; fix with regression test *before* E1 so the swap has a correct baseline to
   preserve. Reachable from the UI whenever ≥2 production lines have maximize enabled.
2. **`splitRecipes` leaves `rateLookup` stale** (MED, `model-reactivity-cleanup` review,
   explicitly LEFT OPEN as out-of-M4-scope). `ProductionLineComponent.tsx:183-184` still
   calls `productionLine.splitRecipeRates()` directly — a rate-affecting mutation with no
   Factory mutator and no recompute, violating the R4/R5 mutation contract AGENTS.md now
   documents. M4's Pass 2 said "belongs in its own bug change with a regression test" —
   never filed. **Fix as a small bug change** (add `Factory.splitRecipeRates(pl)` ending
   in `_updateRates()`); do it before B3 renames the component.
3. **Mutation-contract test blind spots** (LOW, M4 review Pass 2, "captured as follow-up"
   — not captured). `tests/unit/mutation-contract.test.ts` regexes catch `factory.*`
   writes but not writes through bare `productionLine.`/`assemblyLine.` refs, nor
   helper-mediated mutations (`applyRejectSilent(factory.optimizer, …)` — live at
   `ProductionLineComponent.tsx:130,144`). Item 2 above is precisely the class of escape
   this gap permits. Widen the patterns when fixing item 2; pairs with the read-side
   contract item (§5.1).
4. **`m-[-2]` unitless margin in `ui/interactive-styles.ts:13,16`** (LOW,
   `extract-ui-primitives` review — "fix as `m-[-2px]` in a later change"). Still
   present. Invalid CSS: the margin drops silently, so danger/warning variants render
   2px larger than the design intent. Deliberately carried bug-for-bug from Clickable.
   **Fold into C1** (styling retrofit) with an explicit decision: restore the -2px
   overlap intent (visual change) or bless the shipped look and delete the dead token.
5. **Keyboard-accessible resize splitter.** `FactorySidebar.tsx:10`'s biome-ignore says
   "keyboard-accessible version tracked separately" — it isn't, anywhere. Add to the
   backlog next to C4 (a11y). Mouse-only divider is the last Clickable-era a11y hole.

### 6.2 Vestigial carryovers — fold into the B3 sweep

6. Dead `if (!library)` guards ×3 survived the 4c split into
   `SourceFactoriesEditor.tsx:46,62,107` — `library` comes non-optional from
   `useLibraryContext()` (flagged LOW in `introduce-app-contexts` against the old
   RecipeOptimizerPanel; the guards migrated with the code).
7. `LogisticsSection.tsx:41-42` — internal `GraphProps` still declares `library?` /
   `currentFactoryId?` optional though the caller always supplies them (same review).
8. `factory.ts:4-5` — two import statements from `./factory-recipe` (type + value);
   `model-hygiene` review said "merge when factory.ts is next touched (M2)" — M2, M3,
   and M4 all touched it; still unmerged.
9. `powerPart` barrel export — `model-hygiene` review deferred "M2 should decide whether
   it stays public"; never decided, and knip now flags it unused (§3). Decide in the
   dead-export prune.
10. `useLibrary.ts` `addFolder` mutates via `libraryRef.current` + absolute
    `setLibrary(lib)` while every other mutator uses functional-`prev`
    (`split-library-drawer` review risk). Not user-visible today (each mutator fires from
    an isolated click handler) — **but F1 (undo/redo) is exactly the future that batches
    mutations**; normalize it before or with F1.
11. Cosmetic nits still present, zero urgency: `row-types.ts` "closed member list"
    comment enforced by nothing; `LibraryDrawer.tsx` `handleExportAll` rebuilt per
    library mutation; `ProductionLineDetails.tsx:139` reveal-block duplication
    (review explicitly deferred it *to Phase 5* — make sure B3 picks it up);
    optimizer-config test files reusing requirement-ID labels across capabilities.

### 6.3 Accepted / no action — recorded so nobody re-litigates

- `introduce-app-contexts` MED "test-realism": render-scope probes take per-leaf
  snapshots while shipped leaves re-render by section cascade — deliberate per R6/D3,
  still true. Becomes actionable only with the read-accessor work (§5.1): if leaves get
  their own snapshots, the tests already model the target granularity.
- `fix-objective-coefficient-typo` two LOWs: structural limitations of the approved
  mocking strategy, accepted at design time. Nothing to do.
- `split-overview-sidebar` LOW: R4.S2 done as direct assertions instead of a captured
  baseline diff — coverage equivalent-or-better, closed by agreement.
- `model-reactivity-cleanup` `removeAssemblyLine` `index >= 0` guard: recorded as an
  intentional correctness improvement over main's `splice(-1, 1)` behavior. Done.
- `storage-migrations` two LOWs: both fixed in its Pass 2. (Change still needs
  archiving — §4.2.)
- `github-pages-deploy` residual: live-site click-through checks (tasks 4.2/5.4/5.5)
  were left open pending "the next deploy" — a dozen green deploys have happened since
  and the two regression tests it added still pass; one deliberate live-site pass would
  close it formally. Low value, five minutes.
- Pre-existing Biome a11y errors flagged in three reviews (LogisticEdge, resize divider):
  `npx biome check app` is clean today — both carry reasoned biome-ignore suppressions,
  which is the AGENTS.md-sanctioned resolution. Only the splitter's "tracked separately"
  claim was false (item 5).

## 7. Bottom line

The two refactor plans delivered what they promised: architecture on disk matches the
target trees, god classes are gone, the mutation contract is enforced by a standing test,
CI exists and is green, and dead code is minimal. The remaining risk is not structural —
it's coherence and leakage: half-finished naming (Phase 5), three stale docs (AGENTS.md
×2 claims, memory ×1), unclosed process artifacts (unarchived change, unverified bug
files), one real contract gap (read-side proxy renders in PartRateSummary), and — from
the review sweep — two latent bugs and three deferred cleanups that reviews marked "filed
as follow-up" but that were never filed anywhere (§6.1). Recommended order:
**file + fix the two untracked bugs (§6.1 items 1–2, regression tests first; item 1
before E1) → B3 (fold in §4.7 + §4.1 + §3 deletions + §6.2) → e2e blocking + knip in
CI → bug-file closure → adopt read-accessor item into the backlog (pairs with D1).**
And close the process hole that created §6.1: an opsx change with open non-blocking
findings must land them in `bugs/` or `codebase-improvements.md` before archive.
