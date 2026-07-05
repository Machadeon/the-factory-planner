# Tasks: model-hygiene

Scenario references: `game-data` R1–R4, `machine-math` R1–R3, `factory-recipe-identifiers` R1, `lib-utilities` R6. Commit sequence per design Migration Plan; run `npm run lint-fix` before every commit.

## 1. Test Stubs

New test files stubbed failing first (imports target not-yet-existing modules, so stubs fail by not compiling — run to confirm failure before implementing):

- [x] 1.1 Write unit test stub `tests/unit/models/game-data.test.ts`: pinned counts — `parts.length === 176`, `buildings.length === 16`, `recipes.length === 293` (R2.S1)
- [x] 1.2 Extend stub 1.1: `recipeSlugLookup[recipe.slug]` returns exact instance for every recipe incl. burn recipes (R2.S2); burn recipe registered in `recipeLookup` under each product slug like base recipes (R3.S1)
- [x] 1.3 Extend stub 1.1: `RATE_EPSILON === 1e-4` and `SOLVER_EQUALITY_FUDGE === 1e-8` exported from `game-data` (R4)
- [x] 1.4 Write unit test stub `tests/unit/models/machine-math.test.ts`: `shardsForClock` boundaries — 100→0, 101→1, 150→1, 151→2, 250→3, 50→0 (R1.S1)
- [x] 1.5 Extend stub 1.4: `totalMachines` all shapes — `{fullMachines:3,remainderClock:50}`→4, `{fullMachines:3,remainderClock:0}`→3, `{machineCount:4,uniformClock:75}`→4, `{fullMachines:0,remainderClock:0}`→0 (R2.S1)
- [x] 1.6 Write unit test stub `tests/unit/models/factory-recipe-identifiers.test.ts`: round trip `factoryRecipeId(factoryRecipeSlug("abc-123")) === "abc-123"` (R1.S1); prefix absent `factoryRecipeId("iron-plate") === "iron-plate"` (R1.S2)
- [x] 1.7 Write unit test stub `tests/unit/lib/download.test.ts`: `downloadJson` importable from `app/lib/download`; serializes via `JSON.stringify(data, null, 2)` into an `application/json` Blob, clicks temp anchor, revokes object URL (jsdom spies) (R6.S1)
- [x] 1.8 Write unit test stub in `tests/unit/models/game-data.test.ts` (or factory test): auto-created production line with production rate `5e-5` (below `RATE_EPSILON`, above old `1e-5`) is cleaned up — pins the deliberate threshold widening (R4.S2)
- [x] 1.9 Run stubs, confirm all fail (modules/exports don't exist yet)

Scenarios without stubs — justification per gate: R1.S1 (game-data), R4.S1, machine-math R3.S1, factory-recipe-identifiers R1.S3, lib-utilities R6.S2 are compile-time/grep sweep checks, not unit-testable behavior — verified by task 9.4 sweep audit and by the suite compiling. R4.S3 (solver fudge) is numerically identical to today — regression coverage is the existing solver suite passing unchanged plus the 9.4 grep confirming `SOLVER_EQUALITY_FUDGE` at the scaling site.

## 2. Rename model files (design D1 — commit 1, no content edits)

- [x] 2.1 `git mv` `factory.tsx`→`factory.ts`, `assembly-line.tsx`→`assembly-line.ts`, `production-line.tsx`→`production-line.ts`, `recipe.tsx`→`recipe.ts`, `part.tsx`→`part.ts`, `building.tsx`→`building.ts` (`library.tsx` stays until task 3 deletes it)
- [x] 2.2 Build + `npm run test:run` green; commit renames alone

## 3. game-data/ split (design D2/D3/D6 — commit 2)

- [x] 3.1 Create `app/models/game-data/constants.ts`: move `rawResources`, `defaultResourceLimits`, `notAutomatable`, `syntheticSinkPoints`; add `RATE_EPSILON = 1e-4`, `SOLVER_EQUALITY_FUDGE = 1e-8` (R4)
- [x] 3.2 Create `game-data/load.ts` (parts incl. synthetic Power part + name sort, buildings, base-recipe parsing) with single `registerRecipe()` writing `recipes`, `recipeLookup`, `recipeSlugLookup` (R2, R3)
- [x] 3.3 Create `game-data/generator-recipes.ts` (burn-recipe generation, registers via same `registerRecipe()`) and `game-data/index.ts` (re-export all data + constants) (R1, R3)
- [x] 3.4 Sweep all `models/library` importers in `app/` and `tests/` to `models/game-data`, with `recipe.ts` pointed at `game-data/constants` directly (cycle carve-out, design D2); hoisted `recipeSlugLookup` replaces the local one in `factory-storage.ts` (R1.S1, R2.S2)
- [x] 3.5 Delete `library.tsx` (no importers remain); build compiles
- [x] 3.6 Tests 1.1–1.3 green; build + suite green; commit

## 4. machine-math exports + sweep (commit 3)

- [x] 4.1 Export `shardsForClock` from `assembly-line.ts`; add `totalMachines(count)` (R1, R2)
- [x] 4.2 Replace shard-formula copies: `factory-storage.ts` ×3, `AssemblyLineControls.tsx` ×2 (R3)
- [x] 4.3 Replace machine-total copies: `factory.ts`, `factory-recipe.ts`, `AssemblyLineControls.tsx`, `logistics/node-size.ts` (R3)
- [x] 4.4 Sweep check with R3.S1 regexes (`- 100\) / 50`, `remainderClock > 0 \? 1 : 0`); tests 1.4–1.5 green; commit

## 5. Tolerance sweep (commit 4)

- [x] 5.1 Replace all rate-tolerance literals (`0.0001`, `0.00001`, `1e-5`, `1e-6`) in `app/models/` with `RATE_EPSILON`; `1e-8` equal-constraint scaling with `SOLVER_EQUALITY_FUDGE` (R4.S2, R4.S3)
- [x] 5.2 Replace tolerance literals in components: `FactoryOverviewComponent`, `PartRateSummary`, `ProductionLineComponent`, `logistics/graph-model` (R4.S1)
- [x] 5.3 Update any existing tests pinning old `1e-5`/`1e-6` thresholds to `RATE_EPSILON` — deliberate, per spec R4.S2
- [x] 5.4 Test 1.8 green (threshold widening observable); sweep check per R4.S1 (comparison/threshold/scaling contexts only); suite green; commit

## 6. factory: slug helpers + sweep (commit 5)

- [x] 6.1 Export `factoryRecipeSlug(factoryId)` / `factoryRecipeId(slug)` from `factory-recipe.ts`; use in `FactoryRecipe` constructor (R1)
- [x] 6.2 Replace remaining `"factory:"` sites: `factory.ts`, `factory-storage.ts` ×2, `FactoryOverviewComponent.tsx` ×2, `ProductionLineComponent.tsx`, `NestedFactoryRow.tsx`, `logistics/AssemblyLineNode.tsx`, `logistics/graph-model.ts` (R1)
- [x] 6.3 Sweep check per R1.S3; test 1.6 green; commit

## 7. downloadJson move (commit 6)

- [x] 7.1 Create `app/lib/download.ts` with `downloadJson` (body unchanged); delete from `storage-service.ts`; update importers `FactoryLibraryDrawer.tsx`, `FactoryComponent.tsx` (R6.S1)
- [x] 7.2 Verify storage-service DOM-free per R6.S2 (`document.`, `new Blob`, `URL.createObjectURL`); test 1.7 green; commit

## 8. Docs (commit 7)

- [x] 8.1 Update `AGENTS.md`: "Static game data" section describes `game-data/` modules; model-file paths `.tsx`→`.ts`; `storage-service` note drops `downloadJson`

## 9. Verification

- [x] 9.1 All unit/integration tests pass (`npm run test:run`)
- [x] 9.2 All E2E tests pass (`npm run test:e2e`, dev server running)
- [x] 9.3 Production build (`npm run build`)
- [x] 9.4 Full sweep audit: R1.S3, R3.S1, R4.S1 greps return only allowed sites; no `models/library` import remains; `SOLVER_EQUALITY_FUDGE` present at the equal-constraint scaling site (R4.S3); storage-service DOM-free per R6.S2
