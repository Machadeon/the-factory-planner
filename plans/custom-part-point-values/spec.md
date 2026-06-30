# Spec: Custom Part Point Values

## Problem

The `inputValue` LP scoring objective exists in the type system and UI but falls back to raw resource counting (same as `minResources`). There is no economically-motivated weighting of resources, and no way for users to express that some resources are scarcer or more valuable than others.

## Goal

Implement `inputValue` as a first-class optimizer objective: scarce resources cost more by default, derivative part values propagate through recipes, and users can override any part's value globally or per-factory.

---

## Requirements

### R1 — Default point values

Each raw resource in `defaultResourceLimits` gets a default point value:

```
value[slug] = POINT_RATE_CONSTANT / defaultResourceLimits[slug]
```

`POINT_RATE_CONSTANT = 1_000_000`. At maximum extraction, every resource yields the same total point rate (1M pts/min). Scarcer resources (smaller limit) cost more per unit.

Raw resources not in `defaultResourceLimits` (water, power slugs, etc.) default to 0.

### R2 — Derivative value propagation

For each non-raw part, find its **default recipe** (first non-alternate recipe in `recipeLookup[slug]`, falling back to first recipe if all are alternates). Compute:

```
totalInputValue = sum(ing.quantity * value[ing.part])
totalOutputQuantity = sum(prod.quantity)
perUnitValue = totalInputValue / totalOutputQuantity
```

When computing a part's value via the DFS, if its default recipe produces multiple outputs, `perUnitValue` is assigned to all co-products of that recipe — but only if those co-products have not already been computed by a prior DFS visit. In practice, each part independently uses its own `defaultRecipeFor(slug)` as its primary recipe; co-products only share equal values when the multi-output recipe is the primary recipe for all of them. Parts with no recipe get 0.

**Cycle handling:** DFS with an in-progress set. If a slug is encountered while already being computed, return 0 for it immediately. Every part in a cycle receives 0. Parts whose default recipe uses a cyclic part as one ingredient receive a value derived from their other non-zero ingredients (the cyclic input contributes 0 to the sum). Cycles in Satisfactory recipes are rare and this behavior is acceptable.

**Zero-cost resources:** Resources not in `defaultResourceLimits` (water, power slugs, creature remains, etc.) default to 0. This is intentional: they are either unlimited (water), non-automatable, or irrelevant to resource planning. The LP will not penalize recipes that use them — consistent with how `minResources` treats them.

### R3 — Global overrides

`StorageLibrary.partPointOverrides: Record<string, number>` stores library-level overrides. Applies to all factories. After any global override is set, downstream parts (those whose default recipe transitively uses the overridden slug as an **ingredient**) are recomputed from the new value. Co-products of the same recipe as the overridden part are NOT downstream — they are independently derived from recipe inputs. The overridden slug itself is pinned — it does not get re-derived.

### R4 — Per-factory overrides

`SerializedFactory.partPointOverrides: Record<string, number>` stores factory-level overrides. Applied on top of global overrides. Same downstream recompute behavior. Per-factory values take precedence over global values for the same slug.

### R5 — LP integration

When `objective === "inputValue"`, the LP solver prices `_raw_` and `_supply_` variables by their effective point value (resolved from global + factory overrides). All other variables are unpriced. `opType` stays `"min"` — the solver minimizes total input point cost. This mirrors the `sinkPoints` implementation.

### R6 — UI: point values panel

A panel accessible from the RecipeOptimizerPanel (when any objective is selected, via "Customize Point Values" button next to the `inputValue` radio) shows:

- Search/filter by part name
- Table: part icon · name · default value · global override input · factory override input
- Global and factory override columns are independently editable (numeric, supports calculator expressions via `TextCalculatorField` — the project's standard numeric input, not new complexity)
- Overridden part names are highlighted (yellow)
- Hovering a part name shows its effective value as a tooltip
- Clearing an override restores the computed/inherited value
- Only parts with non-zero default values (or active overrides) are shown

### R7 — Persistence

- Global overrides persist in `StorageLibrary` (localStorage `sfp:library`)
- Factory overrides persist in `SerializedFactory` (serialized alongside `optimizer`, `constraints`, `graphLayout`)
- Both fields are optional — omitting them is equivalent to an empty override map (backward compatible, no schema version bump required)
- Export bundles (a `StorageLibrary` with `rootId`) include both `StorageLibrary.partPointOverrides` (global) and the factory's `SerializedFactory.partPointOverrides` (per-factory). Both round-trip through import.

---

## Out of scope

- Undo/redo for point value edits
- Bulk reset (reset all overrides at once)
- Per-assembly-line point value overrides
- Displaying effective point values on production lines or assembly lines
