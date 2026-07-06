# factory-recipe-identifiers Specification (delta)

## ADDED Requirements

### Requirement: R1 — Slug helpers are the only prefix logic
`factory-recipe.ts` SHALL export `factoryRecipeSlug(factoryId: string): string` returning `` `factory:${factoryId}` `` and `factoryRecipeId(slug: string): string` returning the slug with a leading `factory:` prefix removed, or the input unchanged when the prefix is absent. The string literal `"factory:"` SHALL appear nowhere in `app/` outside these two helpers. Known sites to replace: `FactoryRecipe` constructor (`factory-recipe.ts`), `factory.tsx` supplier removal, `factory-storage.ts` (×2 nested-id extraction), `FactoryOverviewComponent.tsx` (×2 navigation), `ProductionLineComponent.tsx` (template construction), `NestedFactoryRow.tsx` (`.replace`), `logistics/AssemblyLineNode.tsx` (`.slice`), `logistics/graph-model.ts` (`.slice`).

#### Scenario: R1.S1 — Round trip
- **WHEN** `factoryRecipeId(factoryRecipeSlug("abc-123"))` is evaluated
- **THEN** it returns `"abc-123"`

#### Scenario: R1.S2 — Prefix absent
- **WHEN** `factoryRecipeId("iron-plate")` is evaluated
- **THEN** it returns `"iron-plate"` unchanged

#### Scenario: R1.S3 — Sweep complete
- **WHEN** `app/` is searched for the literal `factory:` in string context after migration
- **THEN** the only occurrences are inside `factoryRecipeSlug`/`factoryRecipeId`
