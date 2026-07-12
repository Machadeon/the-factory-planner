## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

(empty on pass 1)

### Findings

[D1/D6] — 🔴 Mutators take child objects (`al`, `pl`) but doc never pins where components get those refs. valtio's core idiom is mutate-via-proxy / read-via-snapshot; a component that passes a `useSnapshot` child into `factory.setSloopedSlots(al, n)` hands the model a frozen copy — mutation silently no-ops (or throws in strict mode) and identity lookups miss. State the contract explicitly (args must be proxy-derived refs) or switch the surface to stable IDs/slugs.
[Context/D2] — 🟡 Deleting `update` makes reactivity depend on *every* mutation flowing through the proxy. Doc never forbids raw-`Factory` refs escaping post-proxy (deserialize path, storage layer, `verify.ts` solver hook) — a raw-ref mutation is now silent stale UI instead of a missed `update()` call. Add the invariant + a scenario/check.
[Goals/R4] — 🟡 "No component assigns model fields" is enforced only by one-time grep scenarios (R4.S1/S2) and a reviewer pass. Nothing stops the next PR from regressing. Add a CI grep / biome rule so the contract survives past this change.
[D6] — 🟡 Method surface is "roughly" listed and naming deferred to tasks, but risk mitigation (a) audits "every rate-affecting mutator" against the R5 table. Auditing against an unfrozen list is weak; freeze the exact mutator↔recompute mapping in the design, leave only spelling to tasks.
[Migration step 2–4] — 🔵 Interim window: new mutators end with pinned recompute *and* wrap existing methods still ending in the `update()` shim (`() => _updateRates()`) → double recompute per action until step 4. Behavior-preserving but the R7 counting-`subscribe` tests added in step 1 may assert batch counts that flap mid-migration. Note the ordering interaction.
[D1/D4] — 🔵 `Factory` absorbs ~20 mutators mixing rate domain (`setClockSpeed`) with pure presentation (`setIcon`, `setNodePosition`, `pruneGraphLayout`). God-aggregate growth is a real cost of the rejected-alternative trade; doc should at least name it as accepted, or note a future split (layout sub-object).
[Risks] — ❓ q: "valtio coalesces synchronous writes into one notification" holds only within one microtask. Do the index rebuilds (`rateLookup`, `_assemblyLineLookup`) use `Map`/`Set`? valtio does not proxy/track built-in collections — they're implicitly untracked (auto-ref'd), so publication relies on sibling plain-field writes. If so, say it; it's the same class of exemption as D3 but undocumented.
[Rollback] — 🔵 "single change on a branch; `git revert`" — migration is 7 steps; if landed as multiple commits the revert story is a range-revert. State squash-merge (or revert range) explicitly.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [D1/D6] 🔴 child-arg snapshot hazard — RESOLVED. D1 now has "Argument contract (critical)": args MUST be proxy-derived refs, snapshot children rejected; stable-ID alternative rejected with rationale (no unique `AssemblyLine` id; keyed only by `(productionLine, recipe)`). Contract lands in `AGENTS.md`/R4.
- [Context/D2] 🟡 raw-ref escape — RESOLVED. D2 "Sole-mutation-path invariant" pins that only the proxied `Factory` is mutated post-handoff; `deserializeFactory` is proxied before exposure and `verify.ts` is read-only.
- [Goals/R4] 🟡 CI enforcement — RESOLVED. Final risk bullet makes R4.S1/S2 standing tests that fail CI on reintroduced direct writes / `.update()` calls, not one-time greps.
- [D6] 🟡 unfrozen mapping — RESOLVED. D6 retitled "mapping frozen by spec R5"; every entry maps to exactly one R5 row, tasks may rename only.
- [Migration 2–4] 🔵 double-recompute window — RESOLVED. Step 2 (internal `update()`→recompute) now precedes mutator construction; "Batch-count stability" note explains R7 counts stay 1 regardless of interim redundant work.
- [D1/D4] 🔵 god-aggregate — RESOLVED. New risk bullet names it an accepted D1 trade-off, flags presentation mutators as first candidates for a future `layout` sub-object (plan §75), out of M4 scope.
- [Risks] ❓ Set/Map publication — RESOLVED. D2 "Lookup publication rides field reassignment" explains `_updateRates` wholesale-reassigns each lookup (`factory.ts:97-102`) so the tracked field write publishes; invariant stated (lookups never mutated in place).
- [Rollback] 🔵 range-revert — RESOLVED. Now specifies single squash-merged commit; `git revert <sha>` restores everything in one step.

### Findings

None.
