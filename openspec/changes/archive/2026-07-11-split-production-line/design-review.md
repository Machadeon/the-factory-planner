## Pass 1 — 2026-07-10

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

Behavior-preservation (highest priority — this is a "no observable change" refactor):
- [D5] — `addFactoryAssemblyLine` does NOT call `setShowRecipes(false)` in the current code (only `addAssemblyLine` does, line 129); `addFactoryAssemblyLine` (line 149) and `addSupplierFactory` (line 146) leave `showRecipes` alone. D5 states both `addAssemblyLine`/`addFactoryAssemblyLine` reset `pickerManuallyOpened` to `false` — that adds a reset to the factory-add path the old code never had, a behavior change. Either drop `addFactoryAssemblyLine` from the reset list to match verbatim, or justify the divergence explicitly.
- [D5] — old effect (lines 284–290) force-sets `showRecipes = needMoreProduction` on EVERY `needMoreProduction` transition, including forcing it false when production becomes satisfied even if the user had manually opened. New `needMoreProduction || pickerManuallyOpened` keeps the picker open if `pickerManuallyOpened` is still true when `needMoreProduction` flips false. D5 claims "same visible result" but the reset only fires on an add — a satisfy-via-rate-edit (not an add) would now keep the picker open where the old effect closed it. Add a scenario/decision covering satisfy-without-add.

Architecture / codebase-pattern conflicts:
- [D3] — design says helpers "do not call `factory.update()`" but must reassign `factory.productionLines` and each line's `assemblyLines` to filtered copies (mutable-class pattern). Confirm the reassignment mutates the SAME `factory` instance the caller re-renders from; if a caller reads `factory` from `useFactory()` context (Phase 3) the mutation-then-caller-`update()` ordering must be pinned, else the valtio/context snapshot may not observe the array swap. State the update-ownership contract per caller.
- [D2] — "recomputed in the child that needs them" splits derivation between parent and children (e.g. `ProductionLineRow` recomputes header strings, Details recomputes picker ones). `actualProductionRate` feeds BOTH the header diff readout and `needMoreProduction`/`recipeInstanceRate`; recomputing it in two places risks divergence under the mutable model. Compute `actualProductionRate` once in the parent and pass down.

Migration / rollback:
- [Migration] — land order steps 1–5 are sequenced but no per-step green-gate is stated; step 3 bundles four independent rewrites (extract 4 components + swap math calls + replace effect). Split step 3 so each extraction lands with suites green before the next, preserving bisectability for rollback.
- [Migration] — rollback is "revert the branch" but the change also edits `OptimizationSection` (step 2) and `production-line.ts`/`suggestions.ts` (step 1) which other in-flight phases may touch; note the merge-order dependency on M2's `suggestions.ts` so a partial revert doesn't strand a half-moved walk.

Nits:
- [D1] — line-number refs (~307–445, ~446–600, ~577–598) are stale-prone; current file is 603 lines and `splitRecipes` is at 249 not the body block. Anchor extraction points to symbol names, not line ranges, so the design survives pre-extraction edits.
- [D4] — `recipeInstanceRate` reads `this.part.slug`; `ProductionLine.part` nullability isn't addressed. If `part` can be unset on a fresh line, state the precondition (mirrors R2's divisor precondition).

## Pass 2 — 2026-07-11

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [D5 addFactoryAssemblyLine mismatch] — RESOLVED: D5 rewritten with verified current behavior (source-confirmed: `useEffect` on `[needMoreProduction]` re-derives `showRecipes` every transition; `addAssemblyLine` sets `false`, `addFactoryAssemblyLine`/`addSupplierFactory` do not but the effect re-derives on their triggered render). New design resets `pickerManuallyOpened` in EVERY sufficiency-changing handler, so the factory-add reset is the faithful equivalent of the old effect re-deriving after that add — not new behavior. Correctly reasoned.
- [D5 satisfy-via-rate-edit divergence] — RESOLVED: rate handlers (`updateProductionRate`, `updateOutputRate`) and toggles (`toggleAutoCalculateRate`, `toggleMaximizeOutput`) now in the reset set. Verified against source: all four mutate rate / call `autoCalculateRates()` and can flip `needMoreProduction` (lines 108/113/231/243), matching the old effect firing on the flip. Handler list is complete.
- [D3 update-ownership] — RESOLVED: added per-caller contract — helpers mutate the same `useFactory()` proxy, caller owns `factory.update()`, mutate-then-update ordering pinned. Verified `OptimizationSection` uses `useFactory()` + `useFactoryUpdateSubscription()` (lines 29-30); the "array swap observed after update()" claim holds.
- [D2 actualProductionRate] — RESOLVED: parent computes `actualProductionRate` once and passes down; no child recompute. `recipeInstanceRate` recomputing internally is correctly scoped as a stateless pure-model read, not a cached duplicate.
- [Migration green-gates] — RESOLVED: former 5 steps expanded to 9, one extraction per gate, each gated on test:run + test:e2e + build green; bisectability rationale added.
- [Migration merge-order] — RESOLVED: M2 (`split-factory-god-class`, order 4) dependency stated; do-not-merge-ahead-of-M2 note added; rollback leaves M2 functions untouched.
- [D1 line-number nit] — RESOLVED: extraction points anchored to symbols (`rowVisualClasses` block, `pl-12` block, `recipeList.map`, `factoryCandidates.map`), not line ranges.
- [D4 part nullability nit] — RESOLVED: states `part` is constructor-required and never unset; verified — `ProductionLine` constructor takes required `part: Part` (production-line.ts lines 42/48), so `this.part.slug` is a safe read.

### Findings
(none — all 8 Pass 1 findings resolved with source-accurate reasoning; no new architecture, code-anti-pattern, modern-web, frontend-design, or migration/rollback gaps. frontend-design N/A: pure refactor with explicit no-visual-change non-goal.)
