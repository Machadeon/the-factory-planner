# Implementation: Custom Part Point Values

## New files

### `app/models/point-values.ts`

Pure computation module. No React, no side effects.

- `POINT_RATE_CONSTANT = 1_000_000`
- `computeDefaultPointValues()` — seeds `defaultResourceLimits` entries, then DFS over all `parts` via `recipeLookup`. In-progress set detects cycles (returns 0). All co-products of a recipe get `totalInputValue / totalOutputQuantity`.
- `recomputeDownstream(values, changedSlugs)` — builds reverse-ingredient map, BFS from changed slugs, recomputes each dependent via its default recipe.
- `resolveEffectivePointValues(global, factory)` — `computeDefaultPointValues()` → apply global overrides + recompute downstream + re-pin → apply factory overrides + recompute downstream + re-pin.

### `app/components/PointValuesPanel.tsx`

Props: `factory: Factory`, `library?: StorageLibrary`, `onUpdateLibrary: (overrides) => void`.

- `computeDefaultPointValues()` in `useMemo([], [])` (stable; game data is static).
- `resolveEffectivePointValues(global, factory)` in `useMemo([globalOverrides, factoryOverrides])`.
- Grid layout: `auto 1fr repeat(3, 7rem) auto auto` — icon, name, default, global input, factory input, spacer×2.
- `Fragment key={part.slug}` for grid rows (not `<>`).
- Filters out parts with default=0 and no overrides (keeps list manageable).
- Uses `TextCalculatorField variant="outlined"` for inputs.
- Global changes call `onUpdateLibrary({ ...globalOverrides, [slug]: v })`.
- Factory changes mutate `factory.partPointOverrides` + call `factory.update()`.

## Modified files

### `app/models/factory-storage.ts`

- `SerializedFactory`: add `partPointOverrides?: Record<string, number>`
- `StorageLibrary`: add `partPointOverrides?: Record<string, number>`
- `serializeFactory()`: include `partPointOverrides` when non-empty (omit otherwise, same pattern as `graphLayout`)
- `deserializeFactory()` and `deserializeFactoryStub()`: restore `partPointOverrides = sf.partPointOverrides ?? {}`

No schema version bump — optional fields are backward-compatible.

### `app/models/factory.tsx`

- Import `resolveEffectivePointValues` from `./point-values`
- `Factory` class: add `partPointOverrides: Record<string, number>` field; initialize in constructor from `oldFactory?.partPointOverrides ?? {}`
- `optimizeRecipes(globalPointOverrides: Record<string, number> = {})` — add param
- `_buildScoringObjective(objective, model, recipes, globalPointOverrides = {})` — add 4th param
- `inputValue` case in `_buildScoringObjective`: call `resolveEffectivePointValues`, set `coefficients._obj = pv[slug] ?? 0` for `_raw_`/`_supply_` vars (mirror `sinkPoints` case). Remove old `inputValue` fallthrough to `minResources`.

### `app/components/ProductionTargetsBar.tsx`

- Destructure `library` from props (was already in interface but not destructured)
- `factory.optimizeRecipes(library?.partPointOverrides ?? {})`

### `app/components/RecipeOptimizerPanel.tsx`

- Add `onUpdateLibrary?: (overrides) => void` prop
- Add `showPointValues` state (boolean)
- Wire "Customize Point Values" button to toggle `showPointValues`; button label switches to "Hide Values"
- Render `<PointValuesPanel>` below RadioGroup when `showPointValues`

### `app/components/OptimizationSection.tsx`

- Add `onUpdateLibrary?` prop; thread to `RecipeOptimizerPanel`

### `app/components/FactoryComponent.tsx`

- Add `handleUpdateGlobalPointOverrides(overrides)`: `setLibrary({ ...library, partPointOverrides: overrides }); saveLibrary(...)`
- Pass to `<OptimizationSection onUpdateLibrary={handleUpdateGlobalPointOverrides}>`

## Change order

1. `point-values.ts` — pure, testable immediately
2. `factory-storage.ts` — types + serialize/deserialize
3. `factory.tsx` — field + LP integration
4. `ProductionTargetsBar.tsx` — trivial destructure fix
5. `PointValuesPanel.tsx` — new component
6. `RecipeOptimizerPanel.tsx` → `OptimizationSection.tsx` → `FactoryComponent.tsx` — wire up

## Risks

- `computeDefaultPointValues()` runs at panel open — O(parts × recipe_depth). Game data has ~500 parts; DFS completes in <1ms. No caching needed.
- `recomputeDownstream` rebuilds the reverse-ingredient map on every call. Acceptable for infrequent override edits.
- React `Fragment key` required for grid rows in `PointValuesPanel` — using `<>` without key causes React warning in lists.
