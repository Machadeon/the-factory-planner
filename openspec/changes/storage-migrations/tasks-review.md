<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
<!-- First pass: leave empty -->

### Findings
<!-- One finding per line. Format: [Task ref] — description of issue. -->

Scenario coverage — every spec scenario maps to a Group 1 stub:
- storage-migrations R1.S1→1.1, R1.S2→1.2, R1.S3→1.3, R1.S4→1.4, R1.S5→1.5, R2.S1→1.6, R3.S1→1.7, R3.S2→1.8, R4.S1→1.9, R4.S2→1.10, R5.S1→1.11, R6.S1→1.12, R7.S1→1.13, R7.S2→1.14 — all present.
- library-ops delta R1.S1→1.15, R2.S1→1.16, R2.S3→1.17, R2.S4→1.18, and R3.S1/R4.S1/R4.S2/R5.S1/R5.S2/R5.S3→1.19 — all present. (library-ops spec has no R2.S2 or R5-gap oddity; numbering in spec confirmed: R2 = S1/S3/S4, R5 = S1/S3/S2. All covered.)

Structural checks:
- [Group 1] — PASS. All 19 stubs precede any implementation task; Groups 2–5 are implementation, Group 6 verification. Ordering correct.
- [Dependency order] — PASS. 2.x changes core signature/deletes stub before 4.x updates call sites; 3.x creates migrations.ts + deletes library-ops before 4.4/4.7 repoint imports; 5.x deletes legacy test assertions after impl. Correct top-down.
- [Group 6 / make verify] — PASS. 6.5 explicitly runs `make verify` (Biome + unit + build) per AGENTS.md gate; 6.2 full unit/integration, 6.3 E2E, 6.4 build all present.

User testing directives:
- [1.8] — PASS. Stub-mode parity test present; explicitly asserts new `() => null` path output shape matches today's `deserializeFactoryStub` and notes running against both pre-/post-change paths. Concrete comparison mechanism named. (Nit, non-blocking: "if feasible to lock down parity" softens the pre/post comparison — the shape-match assertion is still mandatory and stands, so acceptable.)
- [1.10 / R4.S2] — PASS. Real fixture with legacy `slooped`, missing `machineSpeed`/`allowRemainder`, and `nestedFactoryData`-only line; concrete assertions on defaults 0/100/true and skip-with-warning.
- [1.18 / R2.S4] — PASS. Real fixture, schema-≤3 embedded `nestedFactoryData` pass-through; asserts embedded data unchanged and no independent entry / no id-map entry created.
- [1.13 / R7.S1] — PASS. Real fixture of a pre-change `schemaVersion: 5` library; spies on `migrateLibrary` to assert unconditional application. (1.14/R7.S2 adds deep-equal no-op check.)
- All four fixture/comparison mechanisms are concrete, not vague. Directive satisfied.

Module boundary (design D4/D5 vs tasks):
- [3.4 / 3.6] — PASS. Prompt's reference to "task 4.3 (Group 3 absorb library-ops)" is a mislabel: in tasks.md the absorption is task **3.4** (4.3 is the SourceFactoriesEditor resolver conversion). Task 3.4 moves `remapImportedLibrary`/`mergeSingleFactory`/`mergeLibrary` into migrations.ts, 3.2 moves `migrateLibrary`, matching D5's migrations.ts export list exactly. Task 3.6 confirms factory-storage.ts retains D5's list (`CURRENT_SCHEMA_VERSION`, `emptyLibrary`, `serializeFactory`, `deserializeFactory`, `collectFactoryBundle`, `directDependencyIds`, `generateSlug`, `generateId`). No design/tasks drift.

Requirement→implementation coverage (Groups 2–5):
- R1/R2/R3 → 2.1–2.6 (signature, resolveNested, drop embedded fallback, cycle via null resolver, delete stub, warn parity). ✓
- R4 → 2.1/3.2/3.3 (schemaVersion pin on serialize/emptyLibrary/migrateLibrary). ✓
- R5 → 3.2 (structural defaults only). ✓
- R6 → 3.1/3.5/3.6. ✓
- R7 → 4.7 (unconditional migrateLibrary, gate removed — implements D6). ✓
- library-ops R1–R5 → 3.4 (move pure functions) + 4.4/5.2/5.4 (import repoint) + 1.18 (R2.S4 behavior change). ✓

Minor observations (non-blocking, no action required):
- [3.2 vs D6 write-back] — design D6 notes (non-blocking) that unconditional `loadLibrary` write-back should get a "task-phase check that nothing assumes loadLibrary is read-only." No dedicated task captures that check; 6.2/6.3 suite runs would surface a regression indirectly. Acceptable given the note was explicitly non-blocking.
- [4.6] — bundles 5 call sites in useFactoryUrlSync under one checkbox; fine granularity-wise but ensure all 5 lines get converted (line numbers may drift during impl).

No blocking issues. Group 1 is complete and ordered before implementation; all scenarios covered; user's parity + fixture directives concretely satisfied; design/tasks module boundary consistent. APPROVED.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [4.6 bundling nit] — RESOLVED. Old task 4.6 (5 call sites in `useFactoryUrlSync.ts` under one checkbox) split into individual tasks 4.6–4.10, one per line (98, 111, 127, 216, 231). Old 4.7 (storage-service.ts import + D6 gate removal) renumbered to 4.11; old 4.8 (factory-storage-graph.test.ts rewrite) renumbered to 4.13.
- [loadLibrary read-only assumption nit] — RESOLVED. New task 4.12 added: explicit check that nothing assumes `loadLibrary` is read-only now that D6 makes it write-back (`saveLibrary`) on every call. Correctly sequenced after 4.11 (the task that introduces the unconditional write-back), so the check has something real to verify against.

### Findings
- [Numbering integrity] — PASS. Full sequence 1.1–6.6 audited via script: no duplicate numbers, no gaps, 55 total checkbox tasks accounted for (19+6+6+13+5+6). Group 4 is a clean run 4.1–4.13.
- [2.3 dangling reference] — FOUND AND FIXED DURING THIS PASS. Task 2.3 said "requires updating the test noted in 4.4" — a stale pointer left over from the renumbering (4.4 is now a different task: the `useFactoryPageFlows.ts` call site). The actual target is the `factory-storage-graph.test.ts` rewrite, now at 4.13. Corrected task 2.3's cross-reference from "4.4" to "4.13" in this pass.
- [Other cross-references] — PASS. Task 5.2's reference to "task 1.18" is in Group 1 (untouched by this renumbering) and remains correct. No other numeric cross-references to Group 4 tasks found elsewhere in the file.
- [Group 1 / scenario coverage] — PASS, unchanged. Group 1 content is untouched by this edit; all scenario mappings from Pass 1 still hold.
- [Task 4.12 placement/content] — PASS. Correctly scoped to `storage-service.ts` (same file as the D6 change in 4.11), sequenced immediately after 4.11 so the write-back behavior exists before the check runs.
- [Task 4.6–4.10 split] — PASS. Each of the 5 original `useFactoryUrlSync.ts` line numbers (98, 111, 127, 216, 231) now has its own task, 1:1, no line dropped or duplicated.

No new blocking issues beyond the one stale cross-reference (2.3 → 4.4), which was corrected in this pass. APPROVED.
