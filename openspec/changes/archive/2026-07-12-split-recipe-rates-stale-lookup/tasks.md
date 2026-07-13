## 1. Test Stubs

<!-- Write all test stubs BEFORE any implementation. Run them and confirm they
     fail against current code (AGENTS.md bug process) before starting Group 2. -->

- [x] 1.1 Unit test stub (`tests/unit/models/factory-mutation-methods.test.ts`): R5.S7 — `factory.splitRecipeRates(pl)` on a fixture line with 2+ assembly lines rescales each by `n/(n+1)` and `factory.rateLookup[<part>].productionRate` reflects the concrete post-rescale sum with no further caller call. Must fail today (`Factory.splitRecipeRates` doesn't exist yet).
- [x] 1.2 Unit test stub (same file): R5.S8 — `factory.splitRecipeRates(pl)` on a production line with zero assembly lines is a no-op (rescale loop has nothing to touch) and still recomputes indexes. Must fail today.
- [x] 1.3 Unit test stub (same file): R5.S9 — 2×2 matrix: both `factory.rejectLine(pl)` and `factory.rejectAssembly(recipe)`, each exercised with `rejectPrompt === "always"` (deny added — assert concrete resulting `enabledRecipes`) and with `rejectPrompt` at another value (`enabledRecipes` unchanged) — four cases total, not "cover both branches" satisfied by only one mutator. `_updateRates` also observed to run (spy, secondary check) in all four. Must fail today (methods don't exist).
- [x] 1.4 Unit test stub (same file): R5.S10 — exercise all four `choice` values (`"never"`, `"no"`, `"yes"`, `"always"`) through `factory.rejectLineChoice(pl, choice)`, asserting the concrete resulting `optimizer.enabledRecipes`/`optimizer.rejectPrompt` per `applyRejectChoice`'s branching. Additionally exercise `factory.rejectAssemblyChoice(recipe, choice)` with at least `"always"` and one other value, to prove the assembly-scoped wrapper applies the same branching as the line-scoped one (full 2×4 matrix not required — the two mutators share identical wrapper logic over the same helper, so partial cross-check on the second is sufficient). Recompute observed in all cases. Must fail today.
- [x] 1.5 Unit test stub (`tests/unit/mutation-contract.test.ts`): R4.S3 — new `it` banning `productionLine.splitRecipeRates(` in `app/components`/`app/hooks`. Must fail today (`ProductionLineComponent.tsx:184` matches).
- [x] 1.6 Unit test stub (same file): R4.S4 — new `it` banning `applyRejectSilent(` or `applyRejectChoice(` in `app/components`/`app/hooks`. Must fail today (`ProductionLineComponent.tsx:130,144,152,162` all match).
- [x] 1.7 Run `npx vitest run tests/unit/models/factory-mutation-methods.test.ts tests/unit/mutation-contract.test.ts` and confirm all six new cases fail for the expected reason (missing method / existing violation), not a typo in the test itself.

## 2. Factory Mutators

- [x] 2.1 Add `Factory.splitRecipeRates(pl: ProductionLine)` in `app/models/factory.ts`: calls `pl.splitRecipeRates()` (unchanged, existing method) then `this._updateRates()`.
- [x] 2.2 `app/models/factory.ts:22-25` already has `import { acceptAllSuggestions as acceptAllSuggestionsWalk, rejectAllSuggestions as rejectAllSuggestionsWalk } from "./suggestions";`. Extend this one existing statement (do not add a second `from "./suggestions"` import) to also bring in `applyRejectSilent`, `applyRejectChoice`, `lineRecipeSlugs` — all three names needed by 2.2 and 2.3 together, added in this one edit.
- [x] 2.3 Add `Factory.rejectLine(pl: ProductionLine)`: `applyRejectSilent(this.optimizer, lineRecipeSlugs(pl)); this._updateRates();`. Add `Factory.rejectAssembly(recipe: AnyRecipe)`: computes `slugs = recipe.isFactoryRecipe ? [] : [recipe.slug]`, calls `applyRejectSilent(this.optimizer, slugs); this._updateRates();`.
- [x] 2.4 Add `Factory.rejectLineChoice(pl: ProductionLine, choice: "never" | "no" | "yes" | "always")`: `applyRejectChoice(this.optimizer, lineRecipeSlugs(pl), choice); this._updateRates();`. Add `Factory.rejectAssemblyChoice(recipe: AnyRecipe, choice: "never" | "no" | "yes" | "always")`: same slug computation as 2.3, calls `applyRejectChoice(this.optimizer, slugs, choice); this._updateRates();`.
- [x] 2.5 Run the Group 1 unit test stubs again; confirm 1.1-1.4 now pass.

## 3. Component Call-Site Conversion

- [x] 3.1 `app/components/ProductionLineComponent.tsx` `splitRecipes()`: replace `productionLine.splitRecipeRates()` with `factory.splitRecipeRates(productionLine)`.
- [x] 3.2 `rejectLine()` (line ~130): replace `applyRejectSilent(factory.optimizer, lineRecipeSlugs(productionLine))` with `factory.rejectLine(productionLine)`. `rejectAssembly()` (line ~144): replace `applyRejectSilent(factory.optimizer, slugs)` with `factory.rejectAssembly(recipe)`. **Ordering constraint (R5.S9's AND clause):** only replace the reject-mutation statement itself — the following `props.onDeleteClicked()` / `removeAssemblyLine(recipe)` statement must remain the very next statement, unchanged and unmoved, so the mutator's recompute still completes before deletion runs, exactly as today.
- [x] 3.3 `onRejectChoice()` line branch (line ~152): replace `applyRejectChoice(factory.optimizer, lineRecipeSlugs(productionLine), choice)` with `factory.rejectLineChoice(productionLine, choice)`. Assembly branch (line ~162): replace `applyRejectChoice(factory.optimizer, slugs, choice)` with `factory.rejectAssemblyChoice(recipe, choice)`. Same ordering constraint as 3.2: `setRejectTarget(null)` and the following `props.onDeleteClicked()` / `removeAssemblyLine(recipe)` stay unmoved, immediately after the mutator call.
- [x] 3.4 Remove now-unused direct imports of `applyRejectSilent`, `applyRejectChoice`, `lineRecipeSlugs` from `ProductionLineComponent.tsx` (component no longer calls them directly — only `shouldPromptReject` stays, since that's a read, not a mutation).
- [x] 3.5 Run the Group 1 mutation-contract stubs (1.5, 1.6) again; confirm they now pass (zero occurrences left in `app/components`).

## 4. Verification

- [x] 4.1 All unit tests pass (`npm run test:run`)
- [x] 4.2 `npm run lint-fix` clean (Biome — includes unused-import check for 3.4)
- [x] 4.3 `npm run build` succeeds
- [x] 4.4 `make verify` passes end to end
