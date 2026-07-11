import solver, {
  type ConstraintBound,
  type ModelDefinition,
  type SolveResult,
} from "javascript-lp-solver";
import AssemblyLine from "../assembly-line";
import type Factory from "../factory";
import type { PartConstraint } from "../factory";
import type FactoryRecipe from "../factory-recipe";
import {
  defaultResourceLimits,
  partSlugLookup,
  RATE_EPSILON,
  recipes,
  SOLVER_EQUALITY_FUDGE,
} from "../game-data";
import type {
  RecipeOptimizerConfig,
  ScoringObjective,
  Target,
} from "../optimizer-config";
import type Part from "../part";
import { resolveEffectivePointValues } from "../point-values";
import ProductionLine from "../production-line";
import type Recipe from "../recipe";
import type { AnyRecipe } from "../recipe-like";
import { createBaseModel, mergeConstraint } from "./base-model";
import type { SolverError } from "./errors";

export interface RecipeSelectionInput {
  productionLines: ProductionLine[];
  supplierFactories: FactoryRecipe[];
  factoryConstraints: PartConstraint[];
  config: RecipeOptimizerConfig;
  partPointOverrides: Record<string, number>;
  globalPointOverrides: Record<string, number>;
}

export interface RecipeSelection {
  selected: { recipe: AnyRecipe; rate: number }[];
  targetFixed: Map<string, number>;
  targetMax: Set<string>;
  /** Solved completions/min per candidate recipe slug (0 for unused). */
  ratesBySlug: Map<string, number>;
  /** Overwrite mode: clear existing production lines before materializing. */
  overwrite: boolean;
}

export type RecipeSelectionResult =
  | { ok: true; selection: RecipeSelection }
  | { ok: false; error: SolverError };

/** Total part throughput (ingredients + products) per recipe completion. */
function recipeFlow(recipe: AnyRecipe): number {
  let total = 0;
  for (const ing of recipe.ingredients) total += ing.quantity;
  for (const prod of recipe.products) total += prod.quantity;
  return total;
}

/**
 * Translate declared {@link Target}s into solver inputs:
 *  - fixed-rate target -> equality constraint { equal: rate }
 *  - maximize target    -> membership in the maximize set (opType "max")
 * A target with maximize=false and rate undefined or <= 0 is silently dropped.
 */
function targetConstraints(targets: Target[]): {
  fixed: Map<string, number>;
  maximize: Set<string>;
} {
  const fixed = new Map<string, number>();
  const maximize = new Set<string>();
  for (const t of targets) {
    if (t.maximize) maximize.add(t.partSlug);
    else if (t.rate !== undefined && t.rate > 0) fixed.set(t.partSlug, t.rate);
  }
  return { fixed, maximize };
}

/**
 * Translate a {@link ScoringObjective} into a single linear `_obj` row on the
 * recipe-selection model. All goals reduce to per-recipe (or per-supply)
 * coefficients; only the direction (`opType`) differs.
 */
function buildScoringObjective(
  objective: ScoringObjective,
  model: ModelDefinition,
  candidates: AnyRecipe[],
  partPointOverrides: Record<string, number>,
  globalPointOverrides: Record<string, number>,
) {
  // all objectives aim to minimize the score
  model.opType = "min";

  if (objective === "sinkPoints") {
    // Price the capped sources (raw + supply).
    for (const [varName, coefficients] of Object.entries(model.variables)) {
      let slug: string | null = null;
      if (varName.startsWith("_raw_")) slug = varName.substring(5);
      else if (varName.startsWith("_supply_")) slug = varName.substring(8);
      else continue;
      const sp = partSlugLookup[slug]?.sinkPoints ?? 0;
      if (sp !== 0) coefficients._obj = sp; // maximize ⇒ inputs are negative
    }

    return;
  }

  if (objective === "inputValue") {
    const pv = resolveEffectivePointValues(
      globalPointOverrides,
      partPointOverrides,
    );
    for (const [varName, coefficients] of Object.entries(model.variables)) {
      let slug: string | null = null;
      if (varName.startsWith("_raw_")) slug = varName.substring(5);
      else if (varName.startsWith("_supply_")) slug = varName.substring(8);
      else continue;
      const v = pv[slug] ?? 0;
      if (v !== 0) coefficients._obj = v;
    }
    return;
  }

  for (const recipe of candidates) {
    let v = 0;
    if (recipe.isFactoryRecipe) {
      if (objective === "power") v = recipe.avgPowerPerInstance ?? 0;
      else if (objective === "logistics") v = recipeFlow(recipe);
      else if (objective === "minResources") {
        for (const ing of recipe.ingredients) {
          if (defaultResourceLimits[ing.part.slug]) {
            v += ing.quantity;
          }
        }
      }
      // buildings: a sub-factory has no physical footprint here.
    } else {
      const r = recipe as Recipe;
      const variablePower =
        r.customPowerUsage && r.building.basePowerUsage === 0;
      const basePower = variablePower
        ? ((r.minPowerUsage ?? 0) + (r.maxPowerUsage ?? 0)) / 2
        : r.building.basePowerUsage;
      switch (objective) {
        case "power":
          // Energy per completion (MJ): MW * seconds. Variable-power machines
          // sweep their full min/max cycle once per completion, so the average
          // is exact, not an approximation.
          v = basePower * r.processingTime;
          break;
        case "logistics":
          v = recipeFlow(r);
          break;
        // Min factory size = total floor area = footprint * machine count.
        case "buildings":
          v =
            (r.processingTime / 60) *
            r.building.size.width *
            r.building.size.length;
          break;
        case "minResources":
          for (const ing of recipe.ingredients) {
            if (defaultResourceLimits[ing.part.slug]) {
              v += ing.quantity;
            }
          }
      }
    }
    if (v !== 0) model.variables[recipe.slug]._obj = v;
  }
}

/**
 * LP-based recipe selection. One variable per candidate recipe holds that
 * recipe's completions/min (matching AssemblyLine.rate). Net part flow forms
 * the balance rows; the ScoringObjective becomes a single linear `_obj` row.
 * Pure: never mutates the input; the caller materializes the selection.
 */
export function solveRecipeSelection(
  input: RecipeSelectionInput,
): RecipeSelectionResult {
  const config = input.config;
  const overwrite = config.overwrite;

  // ====================================================================================================
  // Define targets

  const { fixed: targetFixed, maximize: targetMax } = targetConstraints(
    config.targets,
  );

  if (!overwrite) {
    // add targets from existing production lines
    for (const productionLine of input.productionLines) {
      if (productionLine.maximizeOutput) {
        targetMax.add(productionLine.part.slug);
      } else if (productionLine.outputRate > RATE_EPSILON) {
        const partSlug = productionLine.part.slug;

        if (
          targetFixed.has(partSlug) &&
          Math.abs(
            productionLine.outputRate - (targetFixed.get(partSlug) ?? 0),
          ) > RATE_EPSILON
        ) {
          return {
            ok: false,
            error: {
              kind: "conflicting-goals",
              partSlug,
              targetRate: targetFixed.get(partSlug) ?? 0,
              lineRate: productionLine.outputRate,
            },
          };
        }

        targetFixed.set(partSlug, productionLine.outputRate);
      }
    }
  }

  if (targetFixed.size === 0 && targetMax.size === 0) {
    return { ok: false, error: { kind: "nothing-to-optimize" } };
  }

  // ====================================================================================================
  // Define recipes

  const candidates: AnyRecipe[] = [];

  // Gap-fill mode: parts already produced by kept lines are off-limits to new
  // recipes.
  const keptProduced = new Set<string>();
  if (!overwrite) {
    for (const pl of input.productionLines) {
      for (const al of pl.assemblyLines) {
        candidates.push(al.recipe); // all existing recipes are candidates for the solver
        for (const prod of al.recipe.products) keptProduced.add(prod.part.slug);
      }
    }
  }

  // Hard-limited available parts: the optimizer may not produce them.
  const hardLimited = new Set(
    config.availableParts.filter((a) => a.hardLimit).map((a) => a.partSlug),
  );

  // Candidate recipes: enabled, not blocked by gap-fill or hard-limit rules.
  const enabled = new Set(config.enabledRecipes);
  for (const recipe of recipes) {
    if (!enabled.has(recipe.slug)) continue;
    if (
      !overwrite &&
      recipe.products.some((p) => keptProduced.has(p.part.slug))
    ) {
      continue;
    }
    if (recipe.products.some((p) => hardLimited.has(p.part.slug))) {
      continue;
    }

    candidates.push(recipe);
  }

  // ====================================================================================================
  // Get default model

  const baseModel = createBaseModel(candidates, input.factoryConstraints);
  const constraints = baseModel.constraints as Record<string, ConstraintBound>;
  const variables = baseModel.variables;

  // ====================================================================================================
  // Overlay supply information

  // overlay supply constraints
  for (const supplier of input.supplierFactories) {
    for (const product of supplier.products) {
      const supplySlug = `_supply_${product.part.slug}`;
      constraints[supplySlug] = { max: product.quantity };
      mergeConstraint(constraints, product.part.slug, { min: 0 });
      variables[supplySlug] = {
        [supplySlug]: 1,
        [product.part.slug]: 1,
      };
    }
  }

  // overlay available parts second so they can overwrite supplier factory settings on conflicts
  for (const part of config.availableParts) {
    const supplySlug = `_supply_${part.partSlug}`;
    constraints[supplySlug] = { max: part.rate };
    mergeConstraint(constraints, part.partSlug, { min: 0 });
    variables[supplySlug] = {
      [supplySlug]: 1,
      [part.partSlug]: 1,
    };
  }

  // ====================================================================================================
  // Set fixed targets

  for (const [slug, rate] of targetFixed) constraints[slug] = { equal: rate };

  // objective. Maximize targets dominate (matches the rate solver); otherwise
  // the ScoringObjective drives a single linear `_obj` row.
  const model: ModelDefinition = {
    constraints,
    variables,
    optimize: "_obj",
  };

  // ====================================================================================================
  // Determine maximum rates for maximize targets

  const infeasibleError = (): RecipeSelectionResult => ({
    ok: false,
    error: {
      kind: "infeasible-recipes",
      targets: [
        ...[...targetFixed].map(([partSlug, rate]) => ({ partSlug, rate })),
        ...[...targetMax].map((partSlug) => ({ partSlug, maximize: true })),
      ],
    },
  });

  if (targetMax.size >= 1) {
    const maxModel = structuredClone(model);
    // goal is to maximize a part
    for (const partSlug of targetMax) {
      for (const coefficients of Object.values(maxModel.variables)) {
        if (
          coefficients[partSlug] !== undefined &&
          coefficients[partSlug] !== 0
        ) {
          if (config.objective === "sinkPoints") {
            const sp = partSlugLookup[partSlug]?.sinkPoints ?? 0;
            coefficients._obj =
              (coefficients._obj ?? 0) + coefficients[partSlug] * sp;
          } else {
            coefficients._obj =
              (coefficients._obj ?? 0) + coefficients[partSlug];
          }
        }
      }
    }

    maxModel.opType = "max";

    // Run the optimizer to get maximum rates for each maximized target. Then set those maximized
    // rates as new constraints, then continue to optimize the scoring objective.
    const solution = solver.Solve(maxModel) as SolveResult;

    if (!solution.feasible) return infeasibleError();

    // determine maximum rates
    const maxRates: Record<string, number> = {};
    for (const recipe of candidates) {
      const rate = solution[recipe.slug] as number | undefined;
      if (!rate) continue;

      for (const slug of targetMax) {
        const product = recipe.getProduct(slug);
        if (product) {
          maxRates[slug] = (maxRates[slug] ?? 0) + rate * product.quantity;
        }
      }
    }

    // set maximum rate as a constraint
    for (const [slug, rate] of Object.entries(maxRates)) {
      model.constraints[slug] = { equal: rate * (1 - SOLVER_EQUALITY_FUDGE) };
    }
  }

  // ====================================================================================================
  // Set optimization targets

  buildScoringObjective(
    config.objective,
    model,
    candidates,
    input.partPointOverrides,
    input.globalPointOverrides,
  );

  // ====================================================================================================
  // Run solver

  const solution = solver.Solve(model) as SolveResult;

  if (!solution.feasible) return infeasibleError();

  // ====================================================================================================
  // Collect selection

  const selected: { recipe: AnyRecipe; rate: number }[] = [];
  const ratesBySlug = new Map<string, number>();
  for (const recipe of candidates) {
    const rate =
      typeof solution[recipe.slug] === "number"
        ? (solution[recipe.slug] as number)
        : 0;
    ratesBySlug.set(recipe.slug, rate);
    if (rate > RATE_EPSILON) selected.push({ recipe, rate });
  }

  return {
    ok: true,
    selection: { selected, targetFixed, targetMax, ratesBySlug, overwrite },
  };
}

/**
 * Apply a selection to the factory: group selected recipes by primary product
 * into production lines and set target flags. Uses a local slug→line map — the
 * caller's subsequent `_updateRates()` rebuilds the factory's indexes.
 */
export function materializeSelection(
  factory: Factory,
  selection: RecipeSelection,
): void {
  if (selection.overwrite) {
    factory.productionLines = [];
  }

  const lineBySlug = new Map<string, ProductionLine>();
  for (const pl of factory.productionLines) lineBySlug.set(pl.part.slug, pl);

  const ensureLine = (part: Part): ProductionLine => {
    let pl = lineBySlug.get(part.slug);
    if (!pl) {
      pl = new ProductionLine(part, 0, 0, true, true);
      factory.productionLines.push(pl);
      lineBySlug.set(part.slug, pl);
    }
    return pl;
  };

  for (const { recipe, rate } of selection.selected) {
    const primary = recipe.products[0].part;
    const pl = ensureLine(primary);

    let alExists = false;
    for (const al of pl.assemblyLines) {
      if (al.recipe.slug === recipe.slug) {
        al.rate = rate;
        alExists = true;
        break;
      }
    }
    if (!alExists) {
      pl.assemblyLines.push(
        new AssemblyLine({
          recipe,
          rate,
          machineSpeed: 100,
          allowRemainder: true,
          autoCreated: true,
        }),
      );
    }
  }

  for (const [slug, rate] of selection.targetFixed) {
    const part = partSlugLookup[slug];
    if (!part) continue;
    const pl = ensureLine(part);
    pl.outputRate = rate;
    pl.autoCalculateRate = true;
    pl.maximizeOutput = false;
  }

  for (const slug of selection.targetMax) {
    const part = partSlugLookup[slug];
    if (!part) continue;
    const pl = ensureLine(part);
    pl.maximizeOutput = true;
    pl.autoCalculateRate = true;
  }
}
