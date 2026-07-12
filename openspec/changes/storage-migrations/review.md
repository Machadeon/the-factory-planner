<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**
**Status: APPROVED**

### Resolved from Previous Pass
<!-- First pass: leave empty -->

### Findings
<!-- Format: file:line: ⚠ SEVERITY: problem. fix.
     Severity levels: CRITICAL / HIGH / MED / LOW
     MED/LOW findings may be left open for follow-up. -->

app/models/factory-storage.ts:236-379: ✓ traced deserializeFactory's cycle handling by hand against R2/R3 and the A→B→A example in R3.S1 — `resolve = _visiting.has(data.id) ? () => null : resolveNested` computed once on entry, `visiting = new Set(_visiting).add(data.id)` passed to recursive calls with the *unrestricted* `resolveNested` (not the possibly-nulled `resolve`) — matches spec: the re-encountered occurrence (third call in A→B→A) is the one stub-built, not the first resolution of B. No bug found.

app/models/factory-storage.ts:246,286,365: ✓ verified `visiting` Set is created once per call and never mutated after creation (`.add()` happens on the fresh copy at creation, not on a shared reference) — sibling branches (R2.S1) get independent copies via `new Set(_visiting)` on each recursive entry. No shared-state leak.

app/models/storage-service.ts:30-45: ✓ `loadLibrary` matches R7 exactly — `migrateLibrary(parsed)` runs unconditionally, no schemaVersion comparison, `saveLibrary(migrated)` always fires. Matches design D6.

app/models/migrations.ts: new file, not visible in `git diff` (untracked) but in scope per coordinator's file list — read directly. Matches design D4/D5 export list (`migrateLibrary`, `remapImportedLibrary`, `mergeSingleFactory`, `mergeLibrary`) and R5 (structural-only, no field rewrites). Clean.

app/*, tests/*: ✓ grepped for `library-ops`, `deserializeFactoryStub`, `migrateSerializedFactoryRaw`, `migrateAssemblyLineRaw`, `collectEmbeddedFactories` — zero leftover imports/references to deleted symbols/file. The only remaining string matches are: R6.S1's existence-check test (correctly asserting the file is *gone*) and `FactoryPage.test.tsx` describe-block labels ("library-ops R5.*") which are capability-naming, not imports — file's actual imports confirmed clean (`@/app/models/factory-storage` only).

npx tsc --noEmit / npx biome check: ✓ both clean on all touched files, including the `(id) => ... (id) => ...` shadowed-parameter pattern in FactoryPickerDialog.tsx/SourceFactoriesEditor.tsx/consumer-links.ts/useFactorySession.ts (inner resolver closure reuses the outer scope's `id` name) — compiles and lints clean, not flagged by this project's Biome config.

npx vitest run (6 touched unit test files): ✓ 63/63 pass, confirming coordinator's claim for this subset.

tests/unit/models/factory-storage-graph.test.ts:15-16: ⚠ LOW: stale file-level comment — "AC6/AC7 (R7): ... pre-v5 factories migrate cleanly (fresh ids, rows default 0 = auto, schema bumped to 5)" describes the old pre-change behavior (schema bump to 5) that this change explicitly removes; the individual test titles below it were correctly updated (e.g. "AC7: deserializeFactory ignores schemaVersion (storage-migrations R4)") but this header comment wasn't. Also mislabels the requirement as R7 when the round-trip/pinning behavior described is really R1/R4. Fix: update comment to match current behavior and correct requirement tag, or delete it since the per-test comments now carry the requirement references.

app/components/optimization/SourceFactoriesEditor.tsx:47,52: ⚠ LOW: outer `.map((id) => ...)` parameter shadowed by the inner `resolveNested` closure's own `id` parameter — same pattern also present in FactoryPickerDialog.tsx, consumer-links.ts, useFactorySession.ts. Functionally correct (verified: inner `id` correctly resolves nested/supplier ids, not the outer factory id) and passes lint/typecheck, but reduces readability under a quick read. Fix (optional, cosmetic): rename inner resolver params to `nid`/`refId` for consistency with the pattern already used in `useFactoryUrlSync.ts`'s popstate handler (`(nid: string) => ...`).

No CRITICAL or HIGH findings. Core cycle-handling logic (the highest-risk part of this change) traced by hand against spec text and matches exactly, including the non-obvious "second occurrence gets stubbed, not the first resolution" semantics from R3.S1. No dead code, no orphaned imports, no leftover references to deleted `library-ops.ts`/`deserializeFactoryStub`. Module boundary matches design D4/D5/R6. R7's unconditional-migrate fix is correctly implemented with no version comparison remaining. Test suite subset passes 63/63, tsc/biome clean. Two LOW findings (stale comment, cosmetic shadowing) may be left open. APPROVED.

## Pass 2 — 2026-07-12

**Source: Reviewer** (fixes applied by main agent, not re-reviewed cold — recorded per apply-fixes convention)
**Status: APPROVED**

### Resolved from Previous Pass
- `tests/unit/models/factory-storage-graph.test.ts:15-16` — stale "schema bumped to 5" comment rewritten to describe the actual pinned-at-1, no-branching behavior; incorrect R7 tag removed.
- `app/components/optimization/SourceFactoriesEditor.tsx:47,52` — inner resolver closure's shadowing `id` param renamed to `nestedId`/`nf`, matching the non-shadowing pattern already used elsewhere (e.g. `useFactoryUrlSync.ts`). The other 3 call sites the prior pass flagged (`FactoryPickerDialog.tsx`, `consumer-links.ts`, `useFactorySession.ts`) were re-checked and don't actually shadow an outer `id` — only `SourceFactoriesEditor.tsx` had a real outer `.map((id) => ...)` binding in scope.

### Findings
None. `npx biome check`, `npx tsc --noEmit`, and the full `npx vitest run` (540 passed, 2 pre-existing todo) all clean after the fixes.
