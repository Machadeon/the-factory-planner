## ADDED Requirements

### Requirement: R3 Suggestion mutation helpers homed in suggestions.ts

`app/models/suggestions.ts` SHALL export the suggestion **mutation** helpers so the accept-all / reject-all prune-and-collect walk lives in one place instead of being duplicated in `OptimizationSection` and the production-line handlers. These operate on the mutable model graph (they do not call `factory.update()` — callers own re-render/persist triggering):

- `lineRecipeSlugs(productionLine): string[]` SHALL return the slugs of the production line's assembly lines whose recipe is **not** a factory recipe (`!recipe.isFactoryRecipe`), in `productionLine.assemblyLines` array order.
- `acceptAllSuggestions(factory): void` SHALL clear `autoCreated` on every production line and every assembly line (set to `false`), removing nothing.
- `rejectAllSuggestions(factory): void` SHALL, for each production line: if the line is `autoCreated`, collect its non-factory recipe slugs and remove the whole line; otherwise remove each `autoCreated` assembly line while collecting its non-factory recipe slug. After the walk it SHALL call `applyRejectSilent(factory.optimizer, collectedSlugs)`. `factory.productionLines` and each surviving line's `assemblyLines` are reassigned to filtered copies (not mutated in place), matching the current `OptimizationSection.rejectAllSuggestions` behavior verbatim.

The module SHALL NOT import the `Factory` class as a value; it MAY reference the type. `OptimizationSection` and the production-line accept/reject handlers SHALL call these functions rather than reimplementing the walk.

#### Scenario: R3.S1 — lineRecipeSlugs excludes factory recipes
- **WHEN** `lineRecipeSlugs(pl)` is called on a production line whose assembly lines mix game recipes and factory recipes
- **THEN** it returns exactly the game-recipe slugs (those with `isFactoryRecipe === false`), in order, and omits every factory-recipe line

#### Scenario: R3.S2 — acceptAllSuggestions clears every flag, removes nothing
- **WHEN** `acceptAllSuggestions(factory)` is called on a factory with a mix of `autoCreated` and non-`autoCreated` lines and assembly lines
- **THEN** every `productionLine.autoCreated` and every `assemblyLine.autoCreated` is `false`, and no line or assembly line is removed

#### Scenario: R3.S3 — rejectAllSuggestions prunes suggestions and denies slugs
- **WHEN** `rejectAllSuggestions(factory)` is called with `optimizer.rejectPrompt === "always"` on a factory containing an `autoCreated` line (with a game recipe) and a kept line holding one `autoCreated` game-recipe assembly line
- **THEN** the `autoCreated` line is removed, the `autoCreated` assembly line is removed from the kept line, the kept line's non-auto lines remain, and both collected game-recipe slugs are removed from `optimizer.enabledRecipes` (via `applyRejectSilent`)

#### Scenario: R3.S4 — rejectAllSuggestions honors silent-reject preference
- **WHEN** `rejectAllSuggestions(factory)` runs with `optimizer.rejectPrompt` set to `"never"` (or `"ask"`) instead of `"always"`
- **THEN** suggested lines/assembly lines are still removed but `optimizer.enabledRecipes` is unchanged (no denial), because `applyRejectSilent` only denies when `rejectPrompt === "always"`

#### Scenario: R3.S5 — Kept line with no auto assembly lines is untouched
- **WHEN** `rejectAllSuggestions(factory)` runs on a factory whose only production line is non-`autoCreated` and has zero `autoCreated` assembly lines
- **THEN** the line and all its assembly lines remain, no slug is collected, and `applyRejectSilent` is called with an empty slug list

#### Scenario: R3.S6 — Empty factory is a safe no-op
- **WHEN** `acceptAllSuggestions(factory)` and `rejectAllSuggestions(factory)` are each called on a factory with zero production lines
- **THEN** neither throws, nothing is removed, and `rejectAllSuggestions` calls `applyRejectSilent` with an empty slug list
