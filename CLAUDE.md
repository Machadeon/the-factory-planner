# Satisfactory Planner

A Next.js web app for planning production factories in the game [Satisfactory](https://www.satisfactorygame.com/). Users compose a factory by selecting output products and assigning recipes; the app calculates part rates and can auto-optimize them via linear programming.

## Commands

```bash
npm run dev        # start dev server (localhost:3000)
npm run build      # production build
npm run lint       # check with Biome
npm run lint-fix   # auto-fix Biome findings
npm run format     # format with Biome
```

No test suite exists yet.

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **MUI** (`@mui/material`) for interactive components (inputs, tooltips, icons)
- **Tailwind CSS v4** for layout and spacing
- **Biome** for linting and formatting (not ESLint/Prettier)
- **javascript-lp-solver** for the LP optimization

## Project structure

```
app/
  models/
    data.json          # game data: items, buildings, recipes (do not edit)
    library.tsx        # parses data.json into typed objects at module load
    part.tsx           # Part interface
    building.tsx       # Building interface
    recipe.tsx         # Recipe class (ingredients → products, processingTime)
    assembly-line.tsx  # AssemblyLine: one recipe running at a given rate
    production-line.tsx# ProductionLine: one output part, N assembly lines
    factory.tsx        # Factory: all production lines + LP solver
  components/
    FactoryComponent.tsx         # root component, owns Factory state
    ProductionLineComponent.tsx  # one row per output part
    AssemblyLineComponent.tsx    # one row per recipe within a production line
    RecipeComponent.tsx          # recipe display with editable rates
    FactoryOverviewComponent.tsx # sidebar summary of inputs/outputs
    PartSelector.tsx             # autocomplete for picking a part
    TextCalculatorField.tsx      # MUI TextField that accepts math expressions
    ...
  page.tsx            # single page shell
  utils.tsx           # math expression parser (shunting-yard + RPN eval)
```

## Domain model

```
Factory
 └─ ProductionLine[]   (one per output part)
     └─ AssemblyLine[] (one per recipe variant assigned to that part)
         └─ Recipe
```

- **Rate units**: items/min (solids) or m³/min (fluids). `AssemblyLine.rate` is recipe completions/min; multiply by ingredient/product quantities to get part rates.
- **Somersloops**: `AssemblyLine.setSlooped(true)` doubles product output. Internally, `rate` is halved so that `rate * quantity * 2` still equals the intended production rate — callers always use `getPartProductionRate()` rather than reading `rate` directly.

## State management

All mutable state lives in `FactoryComponent` as `useState<Factory>`. Mutations are applied directly to the `Factory` instance and committed by calling `factory.update()`, which is wired to `setFactory(new Factory(factory))` — a shallow clone that triggers React reconciliation. Never mutate state without calling `update()`.

## LP solver (`Factory.autoCalculateRates`)

Called when the user sets a `ProductionLine.outputRate`. Builds an LP problem where:
- **Variables**: each `AssemblyLine`'s recipe slug → coefficient map of net part rates
- **Constraints**: intermediate parts must balance to 0; output parts must hit their target rates; water is constrained as an input (max ≤ 0)
- **Objective**: maximize raw resource inputs (stored as negative values so "maximize" finds the most-efficient mix)

The solver can return a `midpoint` field when a range solution exists; the code handles this with `rawResult.midpoint ?? rawResult`.

**Known issues with the LP solver:**
- The recycled rubber/plastic loop (alternate recipes `recipe-alternate-plastic-1-c` + `recipe-alternate-recycledrubber-c`) creates a circular dependency that the current constraint formulation cannot handle — it is detected and skipped with a console warning.
- Infeasible results are not surfaced to the user; the solver silently produces zeros.
- The `optimize` objective currently excludes water from minimization by design (water is cheap/infinite in most maps).

## Math expression parser (`utils.tsx`)

`TextCalculatorField` lets users type expressions like `60*2+30` in rate fields. The parser is a standard shunting-yard → RPN evaluator supporting `+`, `-`, `*`, `/`, `%`, `^`, and functions `min`, `max`, `sin`, `cos`, `tan`, `log`, `sqrt`. The implementation was adapted from external sources (attributed inline).

## Game data

`app/models/data.json` is exported from the game. `library.tsx` loads it once at module init into:
- `parts` / `partLookup` (by className) / `partSlugLookup`
- `buildings` / `buildingLookup`
- `recipes` / `recipeLookup` (by output part slug, so one part → multiple recipe variants)

Raw resources (ore, water, oil, etc.) are listed in `rawResources` and flagged on `Part.isRawResource`.

## Coding conventions

- Biome enforces style; run `npm run lint-fix` before committing.
- `a11y` rules are disabled in Biome.
- `data.json` is excluded from Biome checks.
- No comments unless the why is non-obvious. Existing JSDoc on model classes is intentional.
- Prefer reading `getPartProductionRate()` / `getPartConsumptionRate()` over accessing `AssemblyLine.rate` directly.
