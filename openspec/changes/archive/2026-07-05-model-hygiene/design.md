# Design: model-hygiene

## Context

Phase M1 of `plans/model-refactor.md`. Six mechanical cleanups across the model layer plus expression/import sweeps into components. Specs (approved, spec-review Pass 2) pin exact behavior: `game-data` R1–R4, `machine-math` R1–R3, `factory-recipe-identifiers` R1, `lib-utilities` R6. Later phases (M2 god-class split, M3 type safety, M4 reactivity) build directly on this layout, so file homes chosen here are final per the target structure in the plan.

Constraints: no behavior change except the two declared epsilon widenings (game-data R4.S2); no structural refactoring of components; no re-export shims (early-alpha clean-cut policy).

## Goals / Non-Goals

**Goals:**
- Model files in final `.ts` homes with git history preserved.
- `game-data/` as the single static-data module; `library.tsx` gone.
- One implementation each for shard math, machine totals, `factory:` slug handling, rate tolerances, JSON download.

**Non-Goals:**
- No API redesign (options-object ctor, discriminated unions → M3).
- No factory.ts splitting (→ M2).
- No solver or rate-engine changes.
- No component structure changes — imports and expression swaps only.

## Decisions

### D1 — Rename before split, separate commits
`git mv` all zero-JSX model files `.tsx`→`.ts` in one commit with no content edits, so git records clean renames and history follows. The `library.tsx` split lands in the following commit. Alternative — rename+split combined — rejected: rename detection degrades when content changes exceed similarity threshold, and review diff becomes unreadable.

### D2 — game-data module graph
Dependency order inside `game-data/`: `constants.ts` (no imports) ← `load.ts` (imports `data.json`, `constants`, `Part`/`Building`/`Recipe` types+class) ← `generator-recipes.ts` (imports `load` outputs) ← `index.ts` (re-exports everything). Module-init side effects (arrays populated at import) are preserved as-is — converting to lazy init is out of scope and would change import-order semantics.

Cycle hazard: `recipe.tsx` today imports `rawResources` from `./library`. Pointing it at the `game-data` barrel would create `index → load → recipe → index`. Rule: model files that `game-data/load.ts` itself imports (`recipe.ts`; also `part.ts`/`building.ts` should they ever need constants) import from `game-data/constants` directly — `constants.ts` has zero imports, so the graph stays acyclic by construction. `production-line.ts`'s `recipeLookup` import may use the barrel (nothing in `game-data` imports it).

### D3 — Single `registerRecipe(recipe)` owns both lookups
One function pushes to `recipes`, registers per-product-slug into `recipeLookup`, and writes `recipeSlugLookup[recipe.slug]` (last-write-wins, per spec). Base parsing and burn generation both call it. Alternative — hoisting `recipeSlugLookup` as a separate build loop in `index.ts` — rejected: leaves two registration paths, which is exactly the duplication R3 kills.

### D4 — Helpers as module functions, not methods
`shardsForClock`/`totalMachines` export from `assembly-line.ts` as free functions (`totalMachines` takes the `getMachineCount()` union). `factoryRecipeSlug`/`factoryRecipeId` export from `factory-recipe.ts`. Free functions keep component imports cheap and avoid touching class APIs (M3's job). `factoryRecipeId` strips a leading `factory:` prefix, else returns input unchanged — matches the `.replace` call sites' semantics and is total (no throw path), per spec R1.S2.

### D5 — Tolerances live in `game-data/constants.ts`
`RATE_EPSILON = 1e-4`, `SOLVER_EQUALITY_FUDGE = 1e-8`. Models and components import from `game-data`. Alternative — a standalone `app/lib/epsilon.ts` — rejected: plan's target structure names `game-data/constants.ts` as the constants home and M2+ phases import from there; lib/ is for view-side utilities.

### D6 — Import sweep is a path swap only
All 34 importers change `models/library` → `models/game-data`; named import specifiers are unchanged since `index.ts` re-exports the same names. Exception per D2: files `game-data` itself imports (`recipe.ts`) target `game-data/constants` directly, not the barrel. No shim, no deprecation window.

### D7 — `downloadJson` to `app/lib/download.ts`
New module beside `format.ts`; body unchanged (spec R6 pins it). Extends lib-utilities' one-module-per-concern rule rather than widening `format.ts`.

## Risks / Trade-offs

- [Epsilon widening changes auto-line GC (1e-5→1e-4) and optimizer floor (1e-6→1e-4)] → Declared intended in spec R4.S2; tests pinning old thresholds updated deliberately and called out in review so they aren't mistaken for regressions. Rates near 1e-4 are far below any meaningful game rate.
- [Hidden import cycle after split (e.g. `game-data` ↔ model class)] → D2 dependency order enforced; `npm run build` + full test suite gate; cycles fail fast at module init.
- [Sweep misses a site (tolerance literal, `factory:` literal, shard expression)] → Specs carry exact grep regexes (R3.S1, R4.S1, R1.S3); final review runs them.
- [git history loss on rename] → D1 separates rename commits from content commits.

## Migration Plan

Feature branch off `main`. Commit sequence: (1) `git mv` renames, (2) `game-data/` split + import sweep, (3) machine-math export + sweeps, (4) tolerance constants + sweep, (5) slug helpers + sweep, (6) `downloadJson` move, (7) `AGENTS.md` update — its "Static game data" section references `library.tsx` and the model-file `.tsx` paths; rewrite to describe `game-data/` and the `.ts` homes. Each commit compiles, passes `npm run test:run`, and runs `npm run lint-fix` before committing (per AGENTS.md). Full gates before PR: `npm run test:run`, `npm run test:e2e`, `npm run build`. Rollback: revert the branch; no data/schema migration involved (localStorage format untouched).

## Open Questions

None — scope, epsilon policy, shim policy, and helper homes were settled during the proposal grill; specs are approved.
