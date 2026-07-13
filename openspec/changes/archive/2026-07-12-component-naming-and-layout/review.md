<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: caveman-review (full staged diff, HIGH effort)**

**Status: APPROVED**

### Resolved from Previous Pass
(none — this is pass 1 of the final code-review gate)

### Gate evidence

- `npx tsc --noEmit` — exit 0 (no double-bindings, all relative-import depths resolve).
- `npm run test:run` — exit 0 (unit + integration, incl. new `factory-storage` R5 regression cases and `component-structure` path asserts).
- `make verify` — exit 0 (build + tsc + `knip` with `exports`/`types` now `error` + biome). Knip green confirms every `@public` suppression is effective.

### Findings

app/models/game-data/index.ts:4-5: 🔵 nit: the `@public` JSDoc line is duplicated verbatim (two identical lines) above the `export {}` block. Knip needs it once on the re-export statement to cover both `partLookup`/`buildingLookup`; the second line is dead. Fix: delete line 5. (Cosmetic only — knip/tsc/biome all pass as-is.)

### Verified accurate (no finding)

- **Import-name collisions** — all aliased consistently: `AssemblyLine.tsx` (model→`AssemblyLineModel`, Recipe component→`RecipeComp`), `Recipe.tsx` (`RecipeModel`), `ProductionLine.tsx` (`ProductionLineModel`), `RecipePicker.tsx` (`RecipeComp`). `ProductionLineDetails.tsx` imports the `AssemblyLine` component directly with no clash (no `assembly-line` model import). tsc-clean confirms zero double-bindings.
- **Relative-import depth** — spot-checked 8 moved files across `factory/ logistics/ optimization/ planning/ ui/` + the `useFactoryPageFlows.ts` hook move (absolute `@/app/...`, depth-agnostic). All `../../models/…` / `../ui/…` correct.
- **`normalizeRecipeOptimizer` type change** — parameter widened to `Omit<RecipeOptimizerConfig,"availableParts"> & { availableParts?: (string|AvailablePart)[] }`; `.map` narrows string→`{partSlug,rate:0}` with no cast. Type-checks (tsc-clean), source contains no `as unknown as` (R5.S1 asserts this on the file text). R5.S2/S3 drive `deserializeFactory` with legacy `string[]` and modern `AvailablePart[]` fixtures respectively and assert normalized output — real exercise, not import-fail. `library` is typed `StorageLibrary` (non-nullable) in `LibraryContext`, so the `SourceFactoriesEditor` dead-guard removals were provably unreachable — safe.
- **Reveal-block dedup** (`ProductionLineDetails.tsx`) — output identical in both `hasMoreRecipes` states (always renders Use-Factory + Supply; Add-Recipe only when `hasMoreRecipes`). Behavior-preserving.
- **No stray old names** — `grep RecipeComponent\|AssemblyLineComponent\|ProductionLineComponent` over `app/ tests/` hits only the `component-structure.test.ts` negative assertion. prop-contract / production-line-structure / optimizer-panel-structure path arrays all repointed to new `planning//optimization//logistics/` paths.
- **`AssemblyLineControls`** — moved to `planning/`, no flat copy remains; both consumers (`AssemblyLine.tsx`, integration test) reference the new path.
- **`migrations-merge.test.ts`** — rename landed; `migrations.test.ts` still present with distinct content (no collision).
- **AGENTS.md** — dead `Factory.update()` claim removed; `schemaVersion` corrected to 1 (matches `CURRENT_SCHEMA_VERSION = 1`); `syntheticSinkPoints` dropped from constants list; directory map + naming examples (`AssemblyLine.tsx`, `AssemblyLineProps`) accurate.
- **Staging** — `git status` shows everything staged, no untracked/unstaged surprises, no scratch/`.orig`/`.bak` files in the diff. `plans/plan.md` (+1 line) is a benign pre-existing edit swept in.

Gate clears — ready for `opsx:archive`.

## Pass 2 — 2026-07-12

**Source: coordinator (post-Pass-1 fix)**

**Status: APPROVED**

### Resolved from Previous Pass
`app/models/game-data/index.ts:4-5` duplicate `@public` line — fixed, but not by simply deleting the duplicate. Deleting it left one `@public` tag above the whole merged `export {}` block, which would have suppressed knip's unused-export check for *all eight* re-exported symbols, not just the two spec-pinned ones (`buildingLookup`, `partLookup`) — a latent masking risk if one of the other six (currently real, actively-consumed exports) ever becomes genuinely dead. Verified knip supports per-specifier tags inside a multi-line export list; moved the `@public` comment to sit directly above each of the two pinned specifiers individually. Confirmed stable under `npm run lint-fix` (no re-merge) and `npm run knip` (exit 0, `exports`/`types` at `error`). Full gate re-run clean: `tsc --noEmit`, `test:run` (554 passed), `knip`.

### Findings
None.

Gate clears — ready for `opsx:archive`.
