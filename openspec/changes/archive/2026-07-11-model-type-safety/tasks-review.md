## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first tasks pass)

### Findings
- [Task 5.4 vs production-line-auto-recipe R1.S2] — 5.4 under-scopes the 6th-positional-arg cleanup. R1.S2 requires zero `new ProductionLine(...)` calls passing a 6th (`suppressAutoRecipe`) arg in `app/` or `tests/`, but 5.4 names only `production-line.test.ts`. Six other test files currently pass the 6th arg: `factory-recipe-footprint.test.ts:25`, `point-values-storage.test.ts:32`, `factory-storage-graph.test.ts:29`, `factory-integer-instances.test.ts:25`, `factory-sync-verification.test.ts:22-29`, and `production-line.test.ts:33/45/56`. After 5.1 shortens the ctor signature these become TypeScript errors. Broaden 5.4 to "remove the 6th positional arg from ALL `new ProductionLine(...)` calls across `tests/`" and list the six files (or make it an explicit sweep task), so the fix has an implementation task and does not rely solely on the 6.5 grep to surface it post-hoc.
- [Task ordering: 4.2 vs 5.1] — 4.2 migrates `production-line.ts:61`'s `new AssemblyLine(...)` to the options object, then 5.1 deletes that entire auto-add block. The migration in 4.2 is throwaway. Drop `production-line.ts` from 4.2's site list (5.1 removes it) and have 5.2 write the relocated auto-add in `factory.ts` directly in options-object form. Rework only, not a correctness gap.
- [Task 5.2 — construction form unspecified] — 5.2 relocates the auto-add block that constructs an `AssemblyLine` into `factory.ts` but does not state it must use the options-object ctor (Section 4's new form). Because 5 runs after 4, the positional form no longer exists; make 5.2 explicit that the relocated construction uses `new AssemblyLine({ recipe, rate, autoCreated: true })` to avoid a stale positional call.
- [Task 4.2 — solver/recipe-optimizer.ts:455 positional AssemblyLine] — 4.2 names `solver/recipe-optimizer.ts` as a migrate site (correct: L455 is `new AssemblyLine(recipe, rate, 0, 100, 0, true, true)`), but this is also the same file whose FactoryRecipe-capability cast is deleted in 2.3. No conflict, but confirm both edits to that file are sequenced (2.3 before/after 4.2 both fine); note only to ensure the file is not assumed touched once.

### Coverage check (informational — every scenario maps to a task)
- All 19 spec scenarios have a Group 1 test stub or a Group 6 verification-sweep task: recipe R1.S1→1.1, R1.S2→6.2, R2.S1→1.2, R3.S1→6.1; asm R1.S1→1.3, R1.S2→1.4, R2.S1→6.3, R3.S1→1.6, R3.S2→1.5, R3.S3→6.4; pl R1.S1→1.7, R1.S2→6.5, R2.S1→1.8, R2.S2→1.9, R2.S3→1.10, R3.S1→1.11; mm R4.S1→1.12, R4.S2→6.6, R2.S1→1.13. Grep-style scenarios correctly routed to Group 6 sweeps.
- Group 1 (test stubs) precedes all implementation (Sections 2-5). ✓
- Every spec requirement has an implementation task: recipe R1→2.1, R2→2.2, R3→2.3; asm R1→4.1, R2→4.2, R3→4.3; pl R1→5.1, R2→5.2, R3→5.3; mm R4→3.1/3.2, R2→3.1/3.2. ✓

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [Task 5.4 under-scope vs pl-R1.S2] — RESOLVED. Renumbered to 4.4 as an explicit full sweep: drops the 6th positional `suppressAutoRecipe` arg from EVERY `new ProductionLine(...)` caller, naming `solver/recipe-optimizer.ts:434` plus all test/integration files. Verified against source: `recipe-optimizer.ts:434` is `new ProductionLine(part, 0, 0, true, true, true)`, and every named file (`factory-recipe-footprint`, `point-values-storage`, `factory-storage-graph`, `factory-integer-instances`, `factory-sync-verification`, `factory-metrics`, `factory-recipe`, `factory.test`, `solver/recipe-optimizer.test`, and the four integration tests) genuinely carries the 6th arg. Sweep is now accurate and complete; 6.5 grep is a backstop, not the sole driver.
- [Ordering 4.2 vs 5.1] — RESOLVED. Auto-recipe is now Group 4, ahead of the ctor migration (Group 5). 4.1 deletes `production-line.ts`'s `new AssemblyLine` block outright (no migrate-then-delete); 5.2 explicitly drops `production-line.ts` ("no longer constructs an `AssemblyLine`"). No throwaway work.
- [5.2 construction form unspecified] — RESOLVED. 4.2 states the relocated auto-add's `new AssemblyLine` is migrated to options form by Group 5, and 5.2 lists `factory.ts` "(including the relocated auto-add block from 4.2)". No stale positional call can survive.
- [recipe-optimizer.ts double-touch] — RESOLVED. 5.2 notes `solver/recipe-optimizer.ts` is touched by both 2.3 (cast) and 5.2 (positional ctor) — "apply cast + ctor changes together". Sequencing explicit.

### Findings
(none — APPROVED)

### Coverage re-check after renumber
- 19/19 scenarios still mapped (Group 1 stubs + Group 6 sweeps); the Group 4↔5 swap broke no scenario references.
- Group 1 still precedes all implementation. ✓
- Internal cross-refs consistent: 4.2 ↔ 5.2 (relocated block), 6.1-6.6 cite correct scenario refs. ✓
