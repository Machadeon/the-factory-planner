<!-- Append-only. Each review pass adds a new ## Pass N section. Never delete or edit previous passes. -->

## Pass 1 — 2026-07-12

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — this is pass 1)

### Findings

design.md:51 (D3): MED — Claim "The call site (`data.optimizer`) needs its type loosened the same way ... `SerializedFactory.optimizer` is presently typed as the strict `RecipeOptimizerConfig`; this function's parameter type is the one place that should diverge" is wrong. Verified by tsc: a strict `RecipeOptimizerConfig | undefined` (i.e. `data.optimizer`) assigns cleanly to the widened parameter `(Omit<…,"availableParts"> & { availableParts?: (string|AvailablePart)[] }) | undefined`, because `AvailablePart[]` is assignable to `(string|AvailablePart)[]`. The parameter widening alone is sufficient and back-compatible. Fix: drop the call-site/`SerializedFactory.optimizer` loosening from D3 entirely — leave `SerializedFactory.optimizer: RecipeOptimizerConfig` unchanged (it is also the *serialize* output type at factory-storage.ts:170, where the strict shape is correct; loosening it there would be a regression, not a fix). Only the `normalizeRecipeOptimizer` parameter changes.

design.md:48 (D3): LOW — verified the load-bearing spread. `return { ...base, ...raw, availableParts }` type-checks under strict mode: spreading `raw` injects `availableParts?: (string|AvailablePart)[]`, but the trailing `availableParts` (typed `AvailablePart[]` from the `.map`) overrides it, so the return `RecipeOptimizerConfig.availableParts: AvailablePart[]` is satisfied. No finding — recorded as confirmation that D3's core mechanism is sound (only the call-site claim above is wrong).

design.md:69 (D5): LOW — `factory.ts` double-import merge citation is accurate (line 4 `import type FactoryRecipe`, line 5 `import { factoryRecipeSlug }`), but note `FactoryRecipe` in factory.ts is used *only in type positions* (lines 52, 290, 615). Merging to `import FactoryRecipe, { factoryRecipeSlug }` drops the `type` modifier on a class referenced solely as a type; this is valid TS but may trip Biome's `useImportType` (verbatim import style). Fix: prefer `import FactoryRecipe, { factoryRecipeSlug } from "./factory-recipe"` only if lint stays green; otherwise keep `import { type ... }` form or run `lint-fix` after. Non-blocking — the design already schedules `lint-fix` at sweep end.

design.md:58,94 (D4/D6): LOW — D4 deletes `syntheticSinkPoints` (game-data/constants.ts:71); verified 0 consumers repo-wide, so deletion is safe. However AGENTS.md's game-data section lists `syntheticSinkPoints` as a `constants.ts` export; D6's three AGENTS.md edits don't cover removing that reference, leaving a stale doc mention. Fix: add a fourth AGENTS.md touch (or fold into D6.3) to drop `syntheticSinkPoints` from the constants list. Not a spec-pin (unlike game-data R2's `partLookup`/`buildingLookup`), so deletion itself is fine.

design.md:60 (D4): none — verified the `partLookup` keep reasoning is correct. `index.ts` lines 4-14 re-export `partLookup` *from `./load`* (not an independent redefinition), so load.ts:10's `partLookup` export must stay to satisfy the barrel re-export, and the barrel `partLookup` (index.ts:7) is spec-pinned per game-data R2. Both knip flags are correctly treated as keep-not-delete. `powerPart` (index.ts:10) confirmed 0 external consumers; its lone internal user imports from `./load` directly — barrel trim safe.

design.md:22 (D1): none — move order verified dependency-reasonable. Import-resolution correctness doesn't depend on order (all imports relative/`@/`), as D1 states; the leaves-before-roots batching (ui primitives → hook → leaf displays → 3 suffix renames Recipe→AssemblyLine→ProductionLine → section composers) is a sane reviewability ordering, not a correctness requirement. No finding.

design.md:56 (D4): none — ran `npx knip` fresh: reports exactly 25 unused exports + 8 unused types, matching D4's snapshot item-for-item (incl. `VerticalDivider`, 6× interactive-styles, 7× expression re-exports, `syntheticSinkPoints`, `combiners`/`filters`, `AppProviders`, and the 8 types). No drift at design time.

design.md:70-91 (D5): none — verified the reveal-block merge against ProductionLineDetails.tsx:112-154. The two blocks differ only in the "Add Recipe" ActionRow; gating it on `hasMoreRecipes` inside a single `!showPicker` block yields identical output for all four `showPicker`/`hasMoreRecipes` combinations. aria-labels/text/`data-testid`s unchanged; unkeyed sibling conditionals with no local state, so React reconciliation is unaffected.

design.md:67 (D5): none — `SourceFactoriesEditor.tsx:46,62` dead-guard removal confirmed safe: `LibraryContext.tsx:7` types `library: StorageLibrary` (non-optional, always a real object), so both `if (!library) return []` guards are genuinely unreachable.

design.md:68 (D5): none — `GraphProps` optionality fix confirmed: `LogisticsSection.tsx:41-42` declares `library?`/`currentFactoryId?` optional; making them required matches the always-both-passed call site. File moves to `logistics/` per R1.S4; doing the prop fix in the same commit is fine.

**modern-web-guidance:** not applicable — searched ("conditional render block dedup / preserve output"); top similarity ~0.34, no relevant guide. This is a file-move refactor + a semantics-preserving JSX conditional merge + a type-only fix; no new DOM/CSS/web-platform API, rendering pattern, or client-side surface is introduced.

**frontend-design:** not applicable — the change carries an explicit no-visual/no-aria contract (aria-labels & `data-testid`s frozen per component-refactor §5). D5's JSX merge is a byte-identical dedup (verified above), not new UI; no palette/type/layout/copy decisions in scope.

## Pass 2 — 2026-07-12

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass

- **MED (D3 call-site loosening)** — resolved. design.md:51 now states the call site needs no change, `SerializedFactory.optimizer` stays strict (correctly noting it's also the serialize-output type at factory-storage.ts:170), and walks through both why the strict call site assigns cleanly to the widened parameter and why the trailing `{ ...base, ...raw, availableParts }` spread still satisfies the strict return type. Re-verified this reasoning against the earlier tsc check from Pass 1 — matches exactly.
- **LOW (D4/D6 `syntheticSinkPoints` AGENTS.md staleness)** — resolved. design.md:99 adds D6 point 4, dropping `syntheticSinkPoints` from the game-data constants list in AGENTS.md, correctly distinguishing it from the spec-pinned `partLookup`/`buildingLookup`.

### Findings

None. The factory.ts import-merge LOW from Pass 1 (design.md:69) was left as-is per coordinator direction — non-blocking, `lint-fix` already scheduled at sweep end, no change needed. Re-read design.md in full; no new issues introduced by the two edits, no regressions to previously-verified sections (D1 move order, D2 verbatim-move, D4 knip snapshot, D5 dead-guard/GraphProps/reveal-block, D6 remaining points).
