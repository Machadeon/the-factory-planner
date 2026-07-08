## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings

**Ambiguity (untestable/vague SHALL):**
- R2 — "the persisting mutators owned by `useLibrary` (e.g. `updatePartPointOverrides`)" — "e.g." leaves the mutator set open; not testable which mutators MUST be on the context. Enumerate the required set.
- R2.S1 — "a component that previously received `library` and `currentFactoryId` as props" is unbounded; no concrete component named, so the scenario cannot be pinned to a fixture.
- R4 — "except where a value genuinely varies per instance" and "for the sole purpose of forwarding it downward" (R4.S1) are judgment calls, not mechanical checks; a reviewer cannot deterministically decide compliance.
- R5 — "does not change its contents" is undefined for `library` (deep object). Without a defined equality (identity vs deep), "SHALL NOT cause consumers to re-render" is untestable.
- R5.S1 — asserts consumers "do not re-render" but names no consumer and no measurement method (render-count probe?); the render-count test is only mandated in the proposal for R6, not here.
- R6 — "the specific sub-object it renders (e.g. `useSnapshot(assemblyLine)`)" — "e.g." makes the required snapshot granularity per component unspecified/untestable.
- R7 — "If a nested-factory subtree ever reuses `useFactory()`-reading leaves, it SHALL be wrapped in its own provider" is conditional on a future ("ever") that this change may not create; unverifiable as written for this change.

**Missing edge-case scenarios:**
- R1 — no scenario for provider absence: what a consumer calling `useFactory()`/`useFactorySnapshot()` outside any `FactoryContext.Provider` does (throw vs undefined). Error-handling convention (AGENTS.md: return undefined, null-check) is unaddressed.
- R2 — no scenario for `currentFactoryId` being null/absent (no factory selected / fresh load) reaching consumers.
- R3 — no scenario for `navigateToFactory` invoked with an unknown/deleted target factory id (the old drilled callback's failure mode is unspecified post-migration).
- R5 — no scenario for a mutator called during render vs after; stability guarantee has no negative test (a value that MUST change identity when contents change).
- R6.S1 — defines "genuinely local edit" but gives no scenario for the contrasting solver-wide case (edit that legitimately re-renders many rows), leaving the guarantee's boundary untested despite R6 prose calling it out.
- R7 — no scenario for `FactoryPickerDialog` rendering candidate factories: R7 lists it as a foreign-factory site but S1 is generic; the dialog's specific handling is unverified.

**Scope excess (beyond proposal):**
- R1 — introduces `useFactorySnapshot()` hook and a `proxy({ factory })` container created in `useFactorySession`. Proposal line 7 specifies only `useFactory()` returning the proxy with consumers calling `useSnapshot(useFactory())` themselves — no second hook, no container indirection, no `useFactorySession`. This is an API expansion beyond proposal scope.
- R1 — "The container shape (`store.factory`) SHALL NOT be exposed to call sites" is a design constraint the proposal does not state.
- R5 — the entire referential-stability requirement (`useMemo`/`useCallback`/ref-backed, "SHALL NOT fan out") has no antecedent in the proposal, which never mentions memoization or stability guarantees. Added scope.
- R7 — nearest-provider resolution semantics and the "wrap nested subtree in its own provider" rule are implementation design not present in the proposal's "What Changes"; proposal only says foreign factories "remain props" (line 10). The provider-nesting mandate exceeds that.
- factory-page R7 / R7.S2 — "The `valtio` runtime dependency is added" and the snapshot-spike unit test for class methods directly contradict proposal line 30 ("No new runtime dependency (`valtio` already present)"). Scope/factual conflict with the proposal.

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

Ambiguity:
- R2 (mutator "e.g.") — RESOLVED. R2 now enumerates `updatePartPointOverrides` as "the one library mutator consumed downstream today (via `OptimizationSection`'s `onUpdateLibrary`)" and gates any addition on a concrete consumer need. Required set is now fixed.
- R2.S1 (unbounded) — RESOLVED. The exact affected component list is now enumerated mechanically in R4, and R2.S2 adds a concrete null fixture; R2.S1's prose scope is pinned by R4's list.
- R4 (judgment calls) — RESOLVED. R4 rewritten to a mechanical rule: named component list, "props named `library`/`currentFactoryId`/`onNavigateToFactory` SHALL be removed," and R4.S1 checks by inspecting the listed interfaces. No judgment terms remain.
- R5 (undefined equality) — RESOLVED. R5 now specifies reference-identity equality ("reference-equality, not deep-equality"), with rationale (`library` replaced by-reference by `useLibrary`, `currentFactoryId` primitive).
- R5.S1 (no measurement) — RESOLVED. Now mandates a render-count probe; R5.S2 adds the negative/content-change case.
- R6 ("e.g." granularity) — RESOLVED. The normative guarantee is explicitly field-scoped, and R6.S1/S3 make it testable; the `useSnapshot(assemblyLine)` "e.g." is illustrative of the already-field-scoped rule, not the requirement surface.
- R7 ("ever" conditional) — ADDRESSED. The forward-looking clause remains, but it is a guard, not the testable core; R7.S2 supplies a concrete FactoryPickerDialog scenario for the actual behavior this change introduces.

Missing edge cases:
- R1 (outside-provider) — RESOLVED. R1.S3 added: hooks throw a clear fail-fast developer error rather than returning `undefined`.
- R2 (null id) — RESOLVED. R2.S2 added.
- R3 (unknown/deleted id) — RESOLVED. R3.S3 added: outcome identical to today's drilled callback (relocation only).
- R6.S1 (solver-wide contrast) — RESOLVED. R6.S3 added.
- R7 (FactoryPickerDialog) — RESOLVED. R7.S2 added.

Scope excess:
- R1 (hook-pair / container / `useFactorySession`) — RESOLVED. Proposal lines 7 and 23 now carry the store-container + `useFactory()`/`useFactorySnapshot()` hook-pair decision.
- R5 (stability requirement) — RESOLVED. Proposal line 12 now states referentially-stable provider values (`useMemo` + stabilized callbacks).
- R7 (nearest-provider / nested-wrap) — RESOLVED. Proposal line 13 now carries nearest-provider resolution and the foreign-factory-stays-on-prop rule.
- factory-page R7 (valtio contradiction) — RESOLVED. The false "valtio dependency is added" line is removed; now "No new runtime dependency (`valtio` already present from the prior decompose-factory-page change)," consistent with proposal line 32.

### Findings

Non-blocking residuals (do not warrant CONCERNS):
- R1.S3 — throw-on-missing-provider is idiomatic React and correct here, but it diverges from AGENTS.md's "lookups return `undefined`; callers null-check" convention. Convention arguably targets data lookups, not context-hook wiring; worth a one-line note in design.md so the divergence is intentional, not accidental.
- factory-page R7.S2 — the snapshot-spike unit test (`getMachineCount`, `getPartProductionRate`) is not named in the proposal, but it is a behavior-freeze safeguard (class-method reads through a snapshot), not new behavior; in scope as a guard test.

No blocking findings. All Pass 1 concerns resolved or downgraded.
