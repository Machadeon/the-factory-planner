## ADDED Requirements

### Requirement: R1 — ProductionLine constructor is side-effect-free
The `ProductionLine` constructor SHALL NOT auto-add any `AssemblyLine`. It SHALL initialize `assemblyLines` to an empty array and SHALL NOT accept a `suppressAutoRecipe` parameter (the flag is removed from the constructor signature). The auto-add decision moves entirely to `Factory.addProductionLine` (R2).

#### Scenario: R1.S1 — Constructing a sole-recipe part adds no line
- **WHEN** `new ProductionLine(part, rate, outputRate, autoCalculateRate, autoCreated)` is constructed for a `part` that has exactly one recipe
- **THEN** `assemblyLines` is empty (`length === 0`) — the constructor no longer auto-adds the recipe

#### Scenario: R1.S2 — Constructor no longer takes suppressAutoRecipe
- **WHEN** the `ProductionLine` constructor signature is inspected
- **THEN** it has no `suppressAutoRecipe` parameter, and no `new ProductionLine(...)` call in `app/` or `tests/` passes a 6th positional argument

### Requirement: R2 — Factory.addProductionLine owns conditional sole-recipe auto-add
`Factory.addProductionLine(part, autoCreated?, suppressAutoRecipe?)` SHALL retain its `suppressAutoRecipe` parameter. After creating the (side-effect-free) production line, it SHALL auto-add a single `AssemblyLine` when **both** hold: `suppressAutoRecipe` is falsy **and** the part has exactly one recipe (`recipeLookup[part.slug].length === 1`). The auto-added line uses rate `productionRate / recipe.productLookup[part.slug]` with `autoCreated: true`. This is the verbatim relocation of the former constructor behavior, now guarded by the same `suppressAutoRecipe` gate the constructor previously applied. The `undefined recipeLookup[part.slug]` case (a part with no recipes) retains today's behavior and is out of scope for this change.

#### Scenario: R2.S1 — Sole-recipe part auto-adds when not suppressed
- **WHEN** `Factory.addProductionLine(part)` is called (suppress defaulting to false) for a part with exactly one recipe
- **THEN** the resulting production line has one `AssemblyLine` whose recipe is that sole recipe, whose `rate` equals `productionRate / recipe.productLookup[part.slug]`, and whose `autoCreated` is `true`

#### Scenario: R2.S2 — Suppression skips the auto-add
- **WHEN** `Factory.addProductionLine(part, false, true)` is called for a part with exactly one recipe
- **THEN** the resulting production line has an empty `assemblyLines` array — the sole-recipe auto-add is suppressed, matching the pre-change `suppressAutoRecipe` behavior relied on by `useFactoryPageFlows` when another library factory already exports the part

#### Scenario: R2.S3 — Multi-recipe part auto-adds nothing
- **WHEN** `Factory.addProductionLine(part)` is called for a part with more than one recipe
- **THEN** the resulting production line has an empty `assemblyLines` array

### Requirement: R3 — Deserialization drops the assemblyLines reset
Because the `ProductionLine` constructor no longer auto-adds a line, `factory-storage` deserialization SHALL NOT need to reset `assemblyLines = []` before populating persisted assembly lines.

#### Scenario: R3.S1 — Persisted lines are the only lines after deserialize
- **WHEN** a production line whose part has exactly one recipe is deserialized with its persisted assembly lines
- **THEN** the deserialized production line contains exactly the persisted assembly lines and no extra auto-added line
