<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — this is pass 1)

### Findings

tasks.md:87 (11.1): 🔴 bug: `git mv library-ops.test.ts migrations.test.ts` COLLIDES — `tests/unit/models/migrations.test.ts` ALREADY EXISTS (tracked, committed in `f4e0a84`, distinct content: schemaVersion pinning + `migrateLibrary`, storage-migrations R4/R5/R6). `library-ops.test.ts` tests a *different* surface (`mergeLibrary`/`mergeSingleFactory`/`remapImportedLibrary`, R1-R4). `git mv` refuses (dest exists) or with `-f` destroys the existing suite. Fix: pick a non-colliding name (e.g. `library-ops.test.ts` → `library-merge.test.ts`) OR merge the two files' `describe` blocks into the existing `migrations.test.ts`; either way stop calling it a plain rename. Proposal §Impact and spec-review Pass 1's "rename valid → migrations.test.ts" both missed the pre-existing file.

tasks.md:4 (1.2): 🟡 risk: claims "Must fail now (5 files match)" — only **3** files match `*Component.tsx` (`AssemblyLineComponent`, `ProductionLineComponent`, `RecipeComponent`). No 5th/4th exists under `app/components/**`. Stub still fails today (3>0), so the gate holds, but the "5" is wrong and will confuse the implementer verifying the stub. Fix: "(3 files match)".

tasks.md:45 (5.3 / design.md:22 D1): 🟡 risk: rationale for move order is factually wrong. Claims `AssemblyLineComponent` and `RecipeComponent` are "both imported by `ProductionLineComponent`" — `ProductionLineComponent.tsx` imports NEITHER (grep: 0 matches). Real chain: `RecipeComponent` ← imported by `AssemblyLineComponent.tsx` AND `RecipePicker.tsx`; `AssemblyLineComponent` ← imported by `ProductionLineDetails.tsx`, `factory.ts` (string only), tests. The Recipe→AssemblyLine→ProductionLine order is still harmless (order doesn't affect correctness per D1 itself — all imports relative/`@/`), but the stated dependency is false. Also: 5.1 "update all import sites" must catch `RecipePicker.tsx:8` (`import RecipeComponent from "../RecipeComponent"`), not obvious from the tasks text — call it out. Fix: correct the dependency claim; name `RecipePicker.tsx` as a RecipeComponent importer.

tasks.md:92 (12.2 / design.md:97 D6.2): 🟡 risk: `CURRENT_SCHEMA_VERSION` lives in `factory-storage.ts:83`, NOT `migrations.ts`. Task 12.2's parenthetical "(`CURRENT_SCHEMA_VERSION` in `app/models/migrations.ts`)" is a false location; only its trailing hedge ("verify … and word accurately either way") saves it. `migrateLibrary` DOES live in migrations.ts, so "migration lives in migrations.ts" is fine. Fix: change AGENTS.md text to cite `factory-storage.ts` for `CURRENT_SCHEMA_VERSION`.

tasks.md:63 (7.2): 🔵 nit: SETTLED as lint-only, not a build breaker. `FactoryRecipe` in `factory.ts` is used *only in type positions* (lines 52, 290, 615) — dropping `type` to `import FactoryRecipe, { factoryRecipeSlug }` is valid TS, `tsc`/`build` pass; at worst Biome `useImportType` flags it, auto-fixed by the already-scheduled `lint-fix` (13.1). Design-review Pass 1's "non-blocking" call is correct. No action; task's in-place `lint-fix` note is sufficient.

tasks.md:8,10 (1.6/1.7/1.8): 🔵 nit: 1.6/1.7 write into `tests/unit/models/factory-storage.test.ts` per 1.5 — that file ALREADY EXISTS (round-trip tests). Fine (append), but 1.8 says "1.6/1.7 expected to already pass as baseline locks" — correct, they exercise existing cast-based code. Ensure they land as *added* cases, not a stub file that clobbers the existing suite (same clobber-class as 11.1, lower risk since it's append-not-rename). No change needed if implementer appends.

**Verified accurate (no finding):**
- No `git mv` destination collisions across Groups 2-6 + hook (checked all 22 dests + `app/hooks/useFactoryPageFlows.ts` — none pre-exist). `overview/` dir exists (spec-allowed).
- Stub preconditions all fail-today: `tests/unit/component-structure.test.ts` absent (1.1-1.4 new); `as unknown as` present at `factory-storage.ts:226` (1.5); both path-asserting tests contain the literal old-path strings (`prop-contract.test.ts:47,48`, `production-line-structure.test.ts:22,36`) (R4.S3).
- Knip fresh matches D4 snapshot exactly: 25 unused exports + 8 types, zero drift. 10.2 arithmetic sound: 25 − 3 keeps (`buildingLookup`/`partLookup` index, `partLookup` load) − 1 `powerPart` (Group 9) = 21 deletes.
- Group 9/10 overlap clean: `powerPart` deleted once (9.1, barrel), explicitly excluded from 10.2's blanket delete; `partLookup`×2 kept in both.
- factory.ts vestigials present at cited lines: 3 `var`s (239, 240, 342 — 342 is a multi-decl `var productionRate, outputRate`, `let` conversion valid); double factory-recipe import (lines 4-5); stale comment line 305. `SourceFactoriesEditor` guards (46, 62); `GraphProps` optionality (`LogisticsSection.tsx:41-42`); `ProductionLineDetails` reveal blocks (112, 137).
- AGENTS.md drift refs match tasks: `Factory.update()`/`FactoryComponent` (line 79), `schemaVersion 2` (line 114), `syntheticSinkPoints` in constants list (line 105). `syntheticSinkPoints` has 0 consumers (safe delete).
- Coverage complete: every spec scenario has a task or stub — R1.S4→Grp2-6+1.1; R4.S1→1.2+Grp5; R4.S2→5.4+1.3; R4.S3→5.5/5.6/5.7; R5.S1→Grp3+1.4; R6.S1→Grp10; optimizer-config R5.S1/S2/S3→1.5-1.7+Grp8; recipe-type-model R3.S1 already clean (grep: no `FactoryRecipe`-member `as unknown as` in models/components) → note-only trim, correctly no code task. R1.S1-S3 are already-shipped library-split requirements, correctly untouched.
- File-move list (Groups 2-6, 22 files + hook) matches R1.S4 table 1:1 — same 22 sources, same destinations, none added/dropped. Hook move (3.1) is separate from the 22 per proposal, correct.
- Group 14 verification-only, "no lighthouse / no UI change" (14.6) consistent with design-review Pass 1's `frontend-design` = not applicable and aria/`data-testid` freeze.
- Task granularity fine — no single task too large; per-batch `tsc`/`build` gates (2.4, 3.2, 4.14, 5.9, 6.4, 7.5) bound blast radius.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- **tasks.md:89 (11.1), collision** — resolved. Target renamed to `migrations-merge.test.ts` (confirmed: no file exists at that path; `migrations.test.ts` and `library-ops.test.ts` both still present, distinct content unchanged). proposal.md ×2 (bullet + Impact) and tasks.md 11.1 all updated consistently, each with an explicit "not a plain rename" note explaining why. design.md correctly left untouched (out of scope for this fix).
- **tasks.md:4 (1.2), wrong count** — resolved. Now reads "3 files match" with the exact list (`AssemblyLineComponent.tsx`, `ProductionLineComponent.tsx`, `RecipeComponent.tsx`) — re-verified via grep, matches.
- **tasks.md:45/design.md:22 (5.3/D1), false dependency claim** — resolved. Group 5 preamble and D1 both now state the real chain accurately: `RecipeComponent` ← `AssemblyLineComponent.tsx` + `RecipePicker.tsx`; `AssemblyLineComponent` ← `ProductionLineDetails.tsx`; `ProductionLineComponent` imports neither. Re-verified by grep — matches exactly. Task 5.1 now explicitly lists `RecipePicker.tsx` as an import site to update.
- **tasks.md:92/design.md:97 (12.2/D6.2), wrong module citation** — resolved. `CURRENT_SCHEMA_VERSION` confirmed defined in `factory-storage.ts:83` (re-verified), imported by `migrations.ts`. Both tasks.md and design.md now cite the constant's real location and keep it distinct from the (correct) claim that migration logic lives in `migrations.ts`.

### Findings

None. Fixes are internally consistent across proposal.md/tasks.md/design.md, no stray references to the old (wrong) claims remain, no new collisions or false claims introduced. Untouched groups (2-4, 6-10, 13-14) and prior "verified accurate" items from Pass 1 unaffected. Gate clears — ready for `opsx:apply`.
