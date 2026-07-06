<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-05

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass

(first pass — empty)

### Findings

- [Group 1] 🟡 MEDIUM: five scenarios have no stub and no explicit justification — game-data R1.S1, R4.S1, machine-math R3.S1, factory-recipe-identifiers R1.S3, lib-utilities R6.S2 (all grep/compile-verified, implemented later by 3.5/9.4, 5.4, 4.4, 6.3, 7.2). Gate requires every R*.S* mapped to a stub or an explicit justification. Fix: add a one-line Group 1 note listing these scenarios as sweep/build-verified with their task refs.
- [Group 1 / 5.3] 🟡 MEDIUM: behavioral scenarios R4.S2 (widened GC/optimizer thresholds now trigger at `RATE_EPSILON`) and R4.S3 (solver `equal` constraint scales by `1 - SOLVER_EQUALITY_FUDGE`) have no stub; 5.3 only updates existing tests. Fix: add stub assertions (e.g. auto-created line with rate between `1e-5` and `1e-4` is cleaned up; constraint value equals `rate * (1 - 1e-8)`) or an explicit justification naming the existing tests that pin them.
- [3.4 / 3.5] ⚪ LOW: `library.tsx` deleted in 3.4 while its remaining importers are swept in 3.5 — steps between 3.4 and 3.5 leave the tree non-compiling. Fix: move the deletion to the end of 3.5 (commit boundary 3.6 unchanged).
- [9.5] ⚪ LOW: phantom task — Lighthouse audit has no spec or design backing and pre-declares its own skip ("n/a unless UI changed"). Fix: drop 9.5.

Format/order checks: checkbox format `- [ ] X.Y` uniform throughout; group order matches design Migration Plan commits 1–7; task 2.1 rename list verified against actual files (`factory/assembly-line/production-line/recipe/part/building` all `.tsx` today); each stub in 1.1–1.7 fails as claimed (missing module or missing named export); no missing-requirement gaps found beyond the mapping notes above.

## Pass 2 — 2026-07-05

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- [Group 1, MEDIUM] RESOLVED — explicit justification block added after the stub list: game-data R1.S1, R4.S1, machine-math R3.S1, factory-recipe-identifiers R1.S3, lib-utilities R6.S2 declared compile-time/grep sweep checks verified by task 9.4 plus suite compilation. Every spec scenario now maps to a stub (R2.S1→1.1, R2.S2/R3.S1→1.2, R4→1.3, R4.S2→1.8, machine R1.S1→1.4, R2.S1→1.5, fri R1.S1/S2→1.6, R6.S1→1.7) or a written justification.
- [Group 1 / 5.3, MEDIUM] RESOLVED — new stub 1.8 pins R4.S2 behaviorally (auto-created line at `5e-5` — below `RATE_EPSILON`, above old `1e-5` — is cleaned up), checked green in 5.4; verified it fails first (current threshold `1e-5` leaves the line, and the `RATE_EPSILON` import doesn't exist yet). R4.S3 covered by justification: existing solver suite unchanged plus 9.4 grep confirming `SOLVER_EQUALITY_FUDGE` at the scaling site.
- [3.4 / 3.5, LOW] RESOLVED — group 3 reordered: 3.4 sweeps all importers (including the `recipe.ts` → `game-data/constants` carve-out per design D2), 3.5 deletes `library.tsx` only after no importers remain; tree compiles at every step (game-data and library coexist harmlessly between 3.3 and 3.5 — no file imports both).
- [9.5, LOW] RESOLVED — phantom Lighthouse task dropped; 9.4 expanded to cover the R4.S3 scaling-site check and R6.S2 storage-service audit, so verification scope is preserved without the unbacked task.

### Findings

None. Re-checked this pass: renumbering consistent (old 1.8 run-stubs is now 1.9; downstream refs 3.6→1.1–1.3, 4.4→1.4–1.5, 5.4→1.8, 6.3→1.6, 7.2→1.7 all correct); checkbox format still uniform; no new phantom tasks; dependency order intact against design Migration Plan commits 1–7.
