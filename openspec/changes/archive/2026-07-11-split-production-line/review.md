## Pass 1 — 2026-07-11

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(empty — first pass)

### Findings
- tests/integration/ProductionLinePicker.test.tsx:110: 🟡 risk: R3.S4 (satisfy-via-rate-edit closes a manually-opened picker) has no test — file covers only R3.S1/S2/S3, but R3.S4 is the exact behavior the refactor deliberately changed (rate/toggle handlers now reset `pickerManuallyOpened` where the old effect only re-derived on a `needMoreProduction` transition). Tasks stub 1.13 required this test. Add: satisfied line → manual open → `updateProductionRate`/toggle that stays satisfied → assert picker hides.
- tests/integration/ProductionLinePicker.test.tsx:96: 🔵 nit: "R3.S2" test only asserts the picker opens after "Add Recipe"; it never adds a satisfying recipe to assert the picker hides again (the second half of R3.S2). Partial scenario coverage.
- tests/integration/ProductionLinePicker.test.tsx:109: 🔵 nit: R3.S3 clicks "Add Recipe" (which runs `splitRecipes`/rescale), not an actual recipe add; the scenario text is "adds a recipe that only partially satisfies". Works as a proxy but does not exercise `addAssemblyLine`'s intent reset.
- app/components/planning/ProductionLineDetails.tsx:139: 🔵 nit: the two `!showPicker && …` reveal blocks duplicate the three/two-ActionRow markup that differs only by the leading "Add Recipe" row (mirrors the old duplication). Could collapse to one block with a conditional first child; not behavior-affecting.

Behavior-preservation verification (no defect found; recorded for the record):
- Picker visibility: `showPicker = needMoreProduction || pickerManuallyOpened` with reset in every sufficiency-changing handler faithfully reproduces the removed `useEffect(needMoreProduction → setShowRecipes)` + `addAssemblyLine setShowRecipes(false)`. The one observable change (rate-edit-while-satisfied now closes a manually-opened picker) is the spec-blessed R3.S4 case, not a regression.
- `RecipePicker` per-recipe rate: `recipeInstanceRate` divides by `recipe.productLookup[slug]`; the old inline display divided by `getProduct(part).quantity`. Verified equal — both resolve to the product `amount` (recipe.ts `RecipePartLookup` = product amount; `getProduct().quantity` = same amount). No numeric divergence.
- `addSupplierFactory` correctly does NOT reset `pickerManuallyOpened` (it adds a factory-level supplier, not an assembly line on this production line, so it never flips this line's `needMoreProduction` — matching the old effect never firing for it).
- `suggestions.ts` `acceptAllSuggestions`/`rejectAllSuggestions`/`lineRecipeSlugs` are byte-for-byte the old `OptimizationSection` walk and per-line closure; slug order, filter-not-mutate array reassignment, and `applyRejectSilent` call preserved. `type Factory` import only (no value import) — satisfies the M2 rule.
- `ProductionLine.recipeInstanceRate`/`splitRecipeRates` match the former `getProductionRateForRecipe`/`splitRecipes` rescale exactly.
- Row/Details/Picker/Card: all aria-labels ("Remove product", "Autocalculate rate"/"Override rate", "Maximize output…"/"Stop maximizing output", "Remove recipe"), the `sp-recipe-component` class, `aria-expanded`, and dialog `mode` wiring (`recipe`/`supplier`) are preserved; React keys moved correctly onto `FactoryRecipeCard`/list items; no dead imports left in the parent.

## Pass 2 — 2026-07-11

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [R3.S4 no test] (MATERIAL) — RESOLVED: added "R3.S4 a rate edit that re-satisfies closes a manually-opened picker" in tests/integration/ProductionLinePicker.test.tsx. Renders a satisfied rocket-fuel line, clicks "Add Recipe" (split → short → picker open, reveal gone), reads the reduced single-line output, sets the "Production Rate" field to it and blurs → line re-satisfied. Asserts the "Add Recipe" reveal returns, proving `updateProductionRate`'s `pickerManuallyOpened` reset. This directly exercises the refactor-introduced divergence; the inline comment confirms "Without the reset the picker would stay open." Correct guard.
- [R3.S2 second half] (nit) — ACCEPTED as-is: the reset-then-hide behavior is now directly covered by R3.S4; leaving S2 as an open-only proxy avoids valtio-freeze flakiness from re-adding to a shared recipe. Reasonable.
- [R3.S3 uses split not addAssemblyLine] (nit) — ACCEPTED as-is: same rationale; the intent reset is covered by R3.S4.
- [ProductionLineDetails reveal-block duplication] (nit) — ACCEPTED as-is: verbatim relocation of pre-existing markup; collapsing it would alter JSX structure in a behavior-freeze change. Correctly deferred to Phase 5.

### Findings
(none — re-diff confirms all app/ files byte-identical to Pass 1; the only change is the +22-line R3.S4 test. Pass 1 behavior-preservation verification stands: faithful picker-visibility mapping, numerically-equal recipe rate, verbatim suggestions walk, preserved aria/testid/className/keys/dialog modes, no dead imports. 478 unit/integration + 93 e2e + build reported green.)
