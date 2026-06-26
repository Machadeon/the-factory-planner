# Feature Plan: Auto-fill Recipes

This document reviews the feature set where users can have recipes created automatically to fill in the gaps between
their desired product and raw resources.

## Original Plan Details

_This section is pulled out of [plan.md](plan.md#9-auto-production-line-filler)_

**Files:** `app/models/factory.tsx`, new `app/components/AutoFillDialog.tsx`

- Add `autoFillProductionLines(config: AutoFillConfig)` to `Factory`. Config: `resourceLimits`, `targetPartSlugs`,
  `scoringWeights` (defaults to `sinkPoints`).
- LP variables expand to all recipes in `recipeLookup`. Raw resource slugs get `≤ resourceLimits[slug]` constraints.
  Objective depends on user requirements.
- After solving, instantiate `ProductionLine` + `AssemblyLine` objects from non-zero variables and replace
  `factory.productionLines` while adhering to user requirements.
- UI: "Auto-fill" button in `FactoryComponent` opens `AutoFillDialog` with per-resource inputs (`TextCalculatorField`)
  and a score-override table.

Edge cases: exclude the recycled rubber/plastic circular loop (already detected in the current solver). Add a loading
state — the full-recipe LP may be slow for 200+ variables in the pure-JS solver; consider a Web Worker.

## Feature Intent

There are many alternate recipes in Satisfactory, and one of the main challenges of the game is figuring out how to
optimize which recipes you use for particular objectives. There are legitimate use cases for every recipe in the game.

Everyone has different requirements and preferences, and with recent features added to the game the challenge of recipe
selection is deep. Here are a few criteria for determining recipes:

- rarity or availability of inputs
- sink point gains
- power usage
- current tech level
- physical space usage
- ease of setup
- somersloop usage
- which recipes are currently unlocked

The intent of this feature is to enable the user to choose their requirements and let an algorithm do the hard work of
choosing the best recipes for those requirements.

## Requirements Controls

There are several controls the user should have which enable them to select their requirements.

### Part Constraints

There are only so many of each part available per minute. There are worldwide limits, however a user may wish to further
constrain specific parts. This is already possible via the Constraints feature.

### Part Availability

A user may wish to prefer to use parts already available from other factories. They may also list available parts
explicitly.

### Sink Point Gains

Many parts have a point value called sink points. Recipes whose inputs and outputs all have sink points can be given a
score based on how many sink points are gained for each completion. A higher score is better, and negative scores are
possible.

However, not all parts have sink points. Typically the default recipe has a sink point ratio of 2 (i.e. outputs have
twice as many sink points as the inputs), and this can be used to determine a virtual sink score for every part.

### Power Usage

Each run of a recipe will consume a certain amount of power. This is determined by the recipe duration and power
requirements of the building that runs the recipe. Power shards and somersloops increase power usage dramatically. Game
settings can increase or decrease building power usage. A user can opt to minimize power usage.

### Current Technologies

Many recipes are not available until they are unlocked, either through game progression or exploration rewards. Users
can select which recipes are available to choose from. High-level controls such as current game phase can simplify this
process, as there are hundreds of recipes to filter through.

### Physical Space and Ease of Setup

Some recipes require far more space to produce the same number of parts. If the recipe takes a long time to run and is
ran in a physically large building, the space could grow exponentially. Users may opt to minimize total number of
buildings or total space required.

Additionally, some recipes and recipe combinations come with much more difficult logistics. Byproduct handling and sheer
resource quantity are two challenges that come up with certain recipes. Users may opt to simplify logistics and/or
minimize byproducts.

### Part Point Value

Each part has its own availability and value. The in-game sink point score is a good measure, but users may choose other
point values for parts. A user can manually enter point values for specific parts. They can also specify a custom limit
for certain parts and run an algorithm which sets part point value based on those limits. A preset exists which is based
purely on default map part limits (sink points include part limits as well as tech level in their calculation).

For example, Raw Quartz has a sink point value of 15 and a global limit of 13,500 parts per minute. However, Bauxite has
a sink point value of only 8 but has a lower global limit of 12,300 parts per minute. This means that there are over
double the sink points per minute of Raw Quartz available when compared to Bauxite. A different way of scoring these
parts could be to ensure all raw resources have the same global maximum sink points per limit. If Raw Quartz stayed at
15 points, this would make Bauxite worth 16.46 points.

Additionally, point value for constructed parts could be calculated while ignoring things like power and space used and
be nothing more than the sum of the parts used to construct it. The average of all recipes could be taken or some other
heuristic.

Ultimately the optimization approach is to minimize the total value of a factory's inputs.

## Feature Controls

Users can toggle whether recipe selection is performed on every edit or trigger it manually.

Users can select desired products and requirements controls without creating production lines or selecting a single
recipe.

Users can identify which recipes have been added automatically (alternatively: "suggested") and convert them to
"permanent" recipes (alternatively: "accept suggestion").

Users can choose whether to keep existing recipes or overwrite.

Users can order their requirements in priority order.

## Recipe Selection

When the algorithm runs, it must respect the user's requirements.
