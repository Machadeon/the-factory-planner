## Context

Component Phase 2 wrapped the `Factory` graph in a valtio `proxy` inside `useFactorySession` and reduced `Factory.update` to a recompute-only shim (`() => this._updateRates()`). The field and its call sites still exist: model methods call `this.update()`, ~30 component sites call `factory.update()` / `autoCalculateRates()` / `optimizeRecipes()`, and ~11 component sites assign model fields directly then call a recompute. valtio now makes render notification automatic on the proxied graph, so the `update` callback is redundant. This change deletes it and moves each mutation's recompute decision into a named model method (specs `factory-mutation-methods` R1–R7, `factory-session` R2/R3). Behavior is preserved verbatim (spec R5); this is a reactivity/encapsulation refactor, not a behavior change.

Constraints: the two rate engines (imperative `autoSetPartRate` propagation and the LP `autoCalculateRates`/`optimizeRecipes` solvers) both stay and are entered from different actions — M4 makes the boundary explicit per mutator, it does not unify them. Prereqs already on main: M2 (solver extraction, `verify.ts` replacing the old `setTimeout`) and component Phase 2 (valtio store + shim).

## Goals / Non-Goals

**Goals:**
- Delete `Factory.update` and every `this.update()` / `factory.update()` call; render notification is pure valtio proxy behavior.
- Every rate-affecting mutation is a named model method that owns its recompute; presentation mutations are named methods that skip recompute.
- No component assigns model fields or calls solver/recompute methods directly.
- `ref()`-exempt only `_autoSetPartRateInProgress`.
- Delete the dead `rebuild()` swap + the `new Factory(oldFactory)` copy constructor; `Factory` ctor becomes no-arg.
- Document the mutation contract in `AGENTS.md`.

**Non-Goals:**
- Converting `_updateRates`'s eager index rebuild to valtio `derive`/computed (plan item 5 — deferred).
- Read-side accessor encapsulation (`getPartRate` etc. — separate follow-up in `plans/plan.md`).
- Unifying the two rate engines or changing any recompute *choice* (spec R5 preserves verbatim).
- Undo/redo — F1 owns its own snapshot mechanism later.

## Decisions

### D1 — Recompute-requiring mutators live on `Factory`, taking the child as an argument
Re-solve and index recompute are aggregate-root operations (`_updateRates` / `autoCalculateRates` walk all production lines). A child model (`AssemblyLine`, `ProductionLine`) cannot recompute without a back-reference to its `Factory`. So mutators that must recompute live on `Factory` and take the affected child plus the new value, e.g. `factory.setSloopedSlots(al, n)`, `factory.setClockSpeed(al, speed)`, `factory.setOutputRate(pl, rate)`. Components call these on the proxy.

*Alternative rejected:* give each child a `factory` back-reference and put the mutator on the child. Rejected — a child→factory pointer is exactly the kind of shared mutable reference that aliases badly under valtio (the hazard D5 removes elsewhere), and it duplicates the recompute-dispatch logic across child classes.

Pure child field setters that already exist (`AssemblyLine.setSloopedSlots`, `setPartProductionRate`) remain as internal helpers the `Factory` method calls; they are no longer invoked from components.

**Argument contract (critical).** Child arguments (`al`, `pl`) MUST be proxy-derived refs — the model objects reached through the `FactoryContext` proxy (`store.factory.productionLines[…]`), which is exactly how components already receive them (`factory-session` R2 distributes the proxy, not snapshots). A component MUST NOT pass a `useSnapshot` result into a mutator: a snapshot child is a frozen copy, so the write would no-op (or throw under valtio's strict dev checks) and identity lookups would miss. This is the writes-to-proxy half of the reads-from-snapshot / writes-to-proxy convention and is stated in the `AGENTS.md` contract (R4). *Alternative considered:* pass stable IDs/slugs and re-resolve inside each mutator (snapshot-immune). Rejected — `AssemblyLine` has no stable unique id (a line is keyed only by `(productionLine, recipe)`), so this would invent an identity scheme and churn every call site for a hazard the existing proxy-distribution convention already avoids.

### D2 — Internal `this.update()` → the pinned recompute; delete redundant trailing calls
Each existing model method that ended with `this.update()` is rewritten to end with the recompute spec R5 pins for it. Where a solve path already calls `this._updateRates()` before a trailing `this.update()` (e.g. `optimizeRecipes` line 178→180, `autoCalculateRates` line 222→232), the trailing call is deleted outright — the recompute already ran. In solver-error branches the `this.update()` is deleted; setting `solverError` is itself a tracked proxy write that publishes (spec R2.S3), and a later feasible solve clears it (R2.S4).

**Sole-mutation-path invariant.** With `update` gone, all reactivity depends on every mutation flowing through the proxy. Only the store's proxied `Factory` is ever mutated post-handoff: `deserializeFactory` returns a raw instance that `useFactorySession` proxies *before* exposing it, and `solver/verify.ts` reads solved state without mutating the graph. No raw (un-proxied) `Factory` reference escapes to a mutation site, so no mutation can silently bypass publication.

**Lookup publication rides field reassignment, not content tracking.** valtio v2 does not deep-track built-in `Map`/`Set`, and it treats plain-object contents as tracked. `_updateRates` sidesteps the distinction by reassigning every lookup field wholesale each run (`this.rateLookup = {}`, `this._mainOutputParts = new Set()`, … at `factory.ts:97-102`) before refilling. The tracked write is the field reassignment, so a component reading `rateLookup` / `_assemblyLineLookup` / `_mainOutputParts` re-renders regardless of whether the value is an object or a `Set`. Invariant this depends on: callers never mutate these lookups in place — they are rebuilt only by `_updateRates`.

### D3 — `ref()` wraps the scratch Set in the `Factory` constructor
`_autoSetPartRateInProgress` is initialized as `ref(new Set())` in `factory.ts`, importing `ref` from valtio. This colocates the exemption with the field it protects and satisfies spec R6.S3 (the only `ref(` in `factory.ts`). `ref()` strips tracking only; `.add/.has/.delete` still work, so the cycle guard is unchanged (R6.S1).

*Alternative rejected:* apply `ref()` in `useFactorySession` before proxying, to keep `factory.ts` valtio-free. Rejected — it splits the exemption from the field, is easy to forget when the field is reassigned, and the model already depends on the chosen reactivity library conceptually. Trade-off: `factory.ts` gains a one-symbol valtio import (accepted).

### D4 — Presentation mutators are `Factory` methods with no recompute
`setIcon(icon)`, `setNodePosition(nodeId, pos)`, and `pruneGraphLayout(liveNodeIds)` assign the field and return. Today's paired `factory.update()` calls (e.g. `LogisticsSection:192`) were god-component render triggers and are dropped — the proxy write notifies (spec R3). `LogisticsSection`'s inline `delete factory.graphLayout[key]` loop moves into `pruneGraphLayout`.

### D5 — Delete `rebuild()` and the copy constructor
`useFactorySession.rebuild()` has zero callers; it is the only caller of `new Factory(oldFactory)`. Delete `rebuild()`, then delete the `oldFactory?` constructor branch, making the ctor no-arg. The other two `new Factory()` sites (fresh session, deserialize) already pass no args. This removes the by-reference child sharing at the source (spec R1.S2 verifies no copy-construction remains).

### D6 — Method surface (mapping frozen by spec R5; only spelling deferred)
The mutator→recompute mapping is **frozen** by the spec R5 table — the risk-(a) audit checks the implementation against R5, which is a closed list, not against this section. Only method *spelling* is deferred to tasks. The surface `Factory` gains: `setClockSpeed`, `setAllowRemainder`, `setMachineCount`, `setSloopedSlots` (all `(al, value)`); `setProductionLineRate`, `setOutputRate`, `setMaximizeOutput`, `setAutoCalculateRate` (all `(pl, value)`); `addAssemblyLine(pl, recipe)`, `addFactoryAssemblyLine`, `removeAssemblyLine(pl, recipe)`, `acceptLine(pl)`, `acceptAssembly(pl, recipe)`; `setConstraints(next)`, `setOptimizerConfig(next)`, `setPartPointOverride(slug, value)`, `setPartPointOverrides(next)`, `setIcon`, `setNodePosition`, `pruneGraphLayout`; plus an `optimize(overrides)` wrapper over `optimizeRecipes`. Existing `addSupplier` / `removeSupplier` / `setPartRate` / `autoSetPartRate` stay (only their internal `update()` swaps to `_updateRates`). Every entry maps to exactly one R5 row; tasks may only rename, not add/remove/re-map.

## Risks / Trade-offs

- **[Deleting `update` before recompute is internalized silently breaks reactivity]** → Land the counting-`subscribe` integration tests (spec R7) *before* deleting any `update()` call (tasks ordering, reviewer check c). They pin "one action → one batch + correct rates" against the current behavior, so a regression fails loudly.
- **[A mutator that forgets its recompute leaves stale `rateLookup`]** → Reviewer check (a) audits every rate-affecting mutator for a recompute; spec R5 table is the checklist; R2.S1/S2 assert consistency-on-return.
- **[A missed component site keeps a direct write / `.update()` call]** → Deleting the `update` field makes any missed `factory.update()` a compile error. Direct field writes are caught by spec R4.S1/S2 search scenarios. Reviewer check (b).
- **[`ref()` on the scratch Set breaks the cycle guard]** → `ref` strips tracking only; R6.S1 tests add/check/delete + guard behavior explicitly.
- **[valtio "one batch" assumption fails for a multi-write mutator]** → Mutators are synchronous and self-contained (capability definition); valtio coalesces synchronous writes into one notification. No mutator awaits or schedules; the old `setTimeout` was already removed in M2.
- **[`factory.ts` importing valtio couples model to the reactivity lib]** → Limited to the single `ref` symbol; valtio is the project's chosen architecture, not a new dependency.
- **[`Factory` absorbs ~20 mutators mixing rate domain with presentation]** → Accepted trade-off of D1 (recompute is an aggregate-root op, and D1's alternative — child back-references — is worse). Named explicitly: the presentation mutators (`setIcon`/`setNodePosition`/`pruneGraphLayout`) are the natural first candidates to move onto a `presentation`/`layout` sub-object later (plan §75 already groups `graphLayout`/`rows`/`rowSpacing` as presentation). Not done here — out of M4 scope.
- **[Contract regresses in a future PR]** → The spec R4.S1/S2 search scenarios are implemented as **standing tests** (not one-time greps) that fail CI if a component reintroduces a direct field write or `.update()`/`autoCalculateRates()`/`optimizeRecipes()` call. Enforcement survives past this change.

## Migration Plan

1. Add counting-`subscribe` integration tests + autosave-scheduling assertions through `useFactorySession` (spec R7), green against current code. Add the R4.S1/S2 standing contract tests (they pass trivially now — no violations yet, or are skipped-then-enabled at step 4).
2. Replace model-internal `this.update()` with the pinned recompute and delete redundant trailing/error calls (D2) — done *before* new mutators are built so no mutator ever wraps a still-`update()`-calling method (avoids a transient double-recompute window). The `update` field still exists at this point (external callers unmigrated); internal calls no longer use it.
3. Add the new `Factory` mutators (D1/D4/D6) on top of the now-recompute-correct internals, each ending with its pinned recompute.
4. Convert component sites to call the new mutators; remove direct field writes and direct `update()`/`autoCalculateRates()`/`optimizeRecipes()` calls. Enable the R4 standing tests.
5. Delete `rebuild()`, the copy-ctor branch, the `update` field, and the `useFactorySession` shim (D5). Build now fails on any missed caller — fix until green.
6. `ref()` the scratch Set (D3). Document the contract in `AGENTS.md`.
7. Full gates: `npm run test:run`, `npm run test:e2e`, `npm run build`.

*Batch-count stability:* the R7 counting-`subscribe` tests assert one notification batch per action. valtio coalesces all synchronous writes in a microtask into a single notification, so batch count is one regardless of how many field writes a mutator performs or whether a transient extra `_updateRates` ran mid-migration — the tests do not flap across steps. (Redundant work, if any interim step introduced it, is invisible to batch count.)

**Rollback:** land as a single squash-merged commit so `git revert <sha>` cleanly restores the `update` field, shim, copy-ctor, and every call site in one step (the 7 migration steps are commits on the branch, not on `main`). No data/schema migration, no persisted-format change.

## Open Questions

- Exact method names (D6) are a bikeshed resolved in `tasks.md`; the recompute mapping is fixed by spec R5 regardless.
- Whether `setPartPointOverride(slug, value)` (single) or `setPartPointOverrides(next)` (whole map) is the better surface for the two `PointValuesPanel` sites — decide in tasks; both are recompute-only.
