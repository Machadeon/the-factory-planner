import solver, {
  type ConstraintBound,
  type ModelDefinition,
  type SolveResult,
  type VariableCoefficients,
} from "javascript-lp-solver";
import {
  buildings,
  defaultResourceLimits,
  notAutomatable,
  partSlugLookup,
  parts,
  recipes,
} from "../models/library";
import { displayNum } from "../utils";
import AssemblyLine from "./assembly-line";
import type FactoryRecipe from "./factory-recipe";
import type Part from "./part";
import { resolveEffectivePointValues } from "./point-values";
import ProductionLine from "./production-line";
import type Recipe from "./recipe";
import type { RecipeLike } from "./recipe-like";

export interface Rate {
  consumptionRate: number;
  productionRate: number;
}

export type PartConstraint = {
  partSlug: string;
  min?: number;
  max?: number;
  equal?: number;
};

export type ScoringObjective =
  | "minResources"
  | "sinkPoints"
  | "power"
  | "buildings"
  | "logistics"
  | "inputValue";

export type RejectPrompt = "ask" | "always" | "never";

/** A part the user marks as already available, with an optional supply rate. */
export interface AvailablePart {
  partSlug: string;
  rate: number;
  /**
   * When true, this supply is the ONLY source of the part: the optimizer may not
   * build recipes that produce it, so output is hard-bounded by `rate`. When
   * false/undefined the part is merely preferred — the optimizer may produce more
   * of it on top of the supplied amount.
   */
  hardLimit?: boolean;
}

/** A declared production goal: a part the factory should output. */
export interface Target {
  partSlug: string;
  /** Fixed output rate (/min, or MW for power). Ignored when maximize=true. */
  rate?: number;
  /** Maximize this part's output instead of pinning a fixed rate. */
  maximize?: boolean;
}

/**
 * User-configurable settings for the optimize recipes feature. The
 * recipe-selection algorithm that consumes these lives separately; this config
 * is the UI-facing state (see plan:auto-recipe-ui.md).
 */
export interface RecipeOptimizerConfig {
  /** Re-run optimizer on every edit (vs only when the user clicks Run). */
  eager: boolean;
  /** Optimization goal driving the LP objective. */
  objective: ScoringObjective;
  /** Parts preferred as already-available inputs, with optional supply rate. */
  availableParts: AvailablePart[];
  /** Declared production goals that drive the solver, independent of lines. */
  targets: Target[];
  /** Source factory ids whose outputs are treated as available. */
  availableFactoryIds: string[];
  /** Game phase ceiling for recipe unlocks. */
  phase: number;
  /** Master toggle: standard (non-alternate) recipes selectable. */
  defaultRecipesEnabled: boolean;
  /** Master toggle: alternate recipes selectable. */
  alternateRecipesEnabled: boolean;
  /** Master toggle: ore conversion recipes selectable. */
  oreConversionRecipesEnabled: boolean;
  /** Explicit list of building slugs enabled as optimizer helpers (UI state). */
  buildingsEnabled: string[];
  /**
   * The exact set of recipe slugs the solver may use — the single source of
   * truth for the solver. The phase / master / building controls above are
   * helpers that mutate this set; they retain their own UI state independently.
   */
  enabledRecipes: string[];
  /** Overwrite all production lines vs only fill gaps. */
  overwrite: boolean;
  /** Whether rejecting a suggestion also removes the recipe from optimizer. */
  rejectPrompt: RejectPrompt;
}

export const MAX_GAME_PHASE = 5;

export function defaultRecipeOptimizerConfig(): RecipeOptimizerConfig {
  return {
    eager: false,
    objective: "minResources",
    availableParts: [],
    targets: [],
    availableFactoryIds: [],
    phase: MAX_GAME_PHASE,
    defaultRecipesEnabled: true,
    alternateRecipesEnabled: true,
    oreConversionRecipesEnabled: false,
    buildingsEnabled: buildings
      .filter((b) => recipes.some((r) => r.building.slug === b.slug))
      .map((b) => b.slug),
    enabledRecipes: recipes
      .filter(
        (r) =>
          !r.isOreConversionRecipe() &&
          r.slug !== "recipe-alternate-dilutedpackagedfuel-c",
      )
      .map((r) => r.slug),
    overwrite: false,
    rejectPrompt: "ask",
  };
}

/** Whether `slug` is in the solver's enabled-recipe set. */
export function isRecipeEnabled(
  config: RecipeOptimizerConfig,
  slug: string,
): boolean {
  return config.enabledRecipes.includes(slug);
}

/**
 * Return the next `enabledRecipes` array with `slugs` added (enabled=true) or
 * removed (enabled=false). Order-insensitive; preserves existing membership for
 * untouched slugs.
 */
export function setRecipesEnabled(
  current: string[],
  slugs: string[],
  enabled: boolean,
): string[] {
  const set = new Set(current);
  if (enabled)
    for (const s of slugs) {
      set.add(s);

      // diluted packaged fuel is worse in every way than diluted fuel
      if (s === "recipe-alternate-dilutedfuel-c")
        set.delete("recipe-alternate-dilutedpackagedfuel-c");
    }
  else for (const s of slugs) set.delete(s);
  return [...set];
}

/**
 * Whether a recipe passes the bulk filters: within the phase ceiling, its
 * building enabled, and its category (default/alternate) master toggle on. The
 * bulk controls compose this so enabling a category never re-enables a recipe a
 * stricter filter (phase or building) excludes. Per-recipe modal toggles may
 * still diverge from this until the next bulk action.
 */
export function recipeMatchesFilters(
  config: RecipeOptimizerConfig,
  recipe: Recipe,
): boolean {
  if (recipe.unlockPhase > config.phase) return false;
  if (!config.buildingsEnabled.includes(recipe.building.slug)) return false;
  if (!config.oreConversionRecipesEnabled && recipe.isOreConversionRecipe())
    return false;
  return recipe.alternate
    ? config.alternateRecipesEnabled
    : config.defaultRecipesEnabled;
}

/** Total part throughput (ingredients + products) per recipe completion. */
function recipeFlow(recipe: RecipeLike): number {
  let total = 0;
  for (const ing of recipe.ingredients) total += ing.quantity;
  for (const prod of recipe.products) total += prod.quantity;
  return total;
}

export interface FactoryOutput {
  part: Part;
  rate: Rate;
  isPrimary: boolean;
}

export default class Factory {
  productionLines: ProductionLine[];
  icon?: string;
  autoAddProductLines: boolean;
  supplierFactories: FactoryRecipe[];
  update: () => void;
  solverError: string | null;
  constraints: PartConstraint[];
  optimizer: RecipeOptimizerConfig;
  /** Persisted graph-view node positions, keyed by node id (assembly-line id,
   * or `_src_/_sink_/_supplier_/_consumer_` terminal keys). */
  graphLayout: { [nodeId: string]: { x: number; y: number } };
  partPointOverrides: Record<string, number>;
  rateLookup: { [partSlug: string]: Rate };

  _productionLineLookup: { [partSlug: string]: ProductionLine };
  _autoSetPartRateInProgress: Set<string>;
  _partsConsumed: Set<Part>;
  _partsProduced: Set<Part>;
  _mainOutputParts: Set<Part>;

  /**
   * An index of all assembly lines that consume or produce the given part
   */
  _assemblyLineLookup: { [partSlug: string]: AssemblyLine[] };

  constructor(oldFactory?: Factory) {
    this.productionLines = oldFactory?.productionLines || [];
    this.icon = oldFactory?.icon;
    this.update = oldFactory?.update || (() => {});
    this.autoAddProductLines = oldFactory?.autoAddProductLines || false;
    this.supplierFactories = oldFactory?.supplierFactories || [];
    this.solverError = oldFactory?.solverError ?? null;
    this.constraints = oldFactory?.constraints ?? [];
    this.optimizer = oldFactory?.optimizer ?? defaultRecipeOptimizerConfig();
    this.graphLayout = oldFactory?.graphLayout ?? {};
    this.partPointOverrides = oldFactory?.partPointOverrides ?? {};

    this.rateLookup = {};
    this._productionLineLookup = {};
    this._assemblyLineLookup = {};
    this._autoSetPartRateInProgress = new Set();

    this._partsConsumed = new Set();
    this._partsProduced = new Set();
    this._mainOutputParts = new Set();

    this._updateRates();
  }

  _addAssemblyLineLookup(partSlug: string, assemblyLine: AssemblyLine) {
    if (!this._assemblyLineLookup[partSlug]) {
      this._assemblyLineLookup[partSlug] = [assemblyLine];
    } else {
      this._assemblyLineLookup[partSlug].push(assemblyLine);
    }
  }

  _updateRates() {
    this.rateLookup = {};
    this._assemblyLineLookup = {};
    this._partsConsumed = new Set();
    this._partsProduced = new Set();
    this._mainOutputParts = new Set();

    for (const productionLine of this.productionLines) {
      this._productionLineLookup[productionLine.part.slug] = productionLine;

      if (productionLine.outputRate > 0 || productionLine.maximizeOutput) {
        this._mainOutputParts.add(productionLine.part);
      }

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          this._partsConsumed.add(recipePart.part);
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumptionRate: 0,
            productionRate: 0,
          };

          rate.consumptionRate += assemblyLine.getPartConsumptionRate(
            recipePart.part,
          );
          this.rateLookup[recipePart.part.slug] = rate;
        }

        for (const recipePart of assemblyLine.recipe.products) {
          this._partsProduced.add(recipePart.part);
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumptionRate: 0,
            productionRate: 0,
          };

          rate.productionRate += assemblyLine.getPartProductionRate(
            recipePart.part,
          );
          this.rateLookup[recipePart.part.slug] = rate;
        }
      }
    }
  }

  /**
   * Outputs available from a source factory, paired with their net rate.
   *
   * Signature intentionally takes the source factory so a later version can
   * return outputs net of what other factories already pull from it. v1 returns
   * this factory's own net production.
   */
  availableOutputsFrom(source: Factory): { part: Part; rate: number }[] {
    return source
      .getOutputInfo()
      .map((o) => ({
        part: o.part,
        rate: o.rate.productionRate - o.rate.consumptionRate,
      }))
      .filter((o) => o.rate > 0.0001);
  }

  /**
   * Optimize production lines to satisfy requested outputs from available
   * inputs, choosing recipes per {@link optimizer}. The LP-based recipe-selection
   * algorithm is implemented separately (see plan:auto-recipe-ui.md); this is
   * the entry point the UI invokes.
   */
  optimizeRecipes(globalPointOverrides: Record<string, number> = {}) {
    // LP-based recipe selection. One variable per candidate recipe holds that
    // recipe's completions/min (matching AssemblyLine.rate). Net part flow forms
    // the balance rows; the ScoringObjective becomes a single linear `_obj` row.
    // The chosen recipes are materialized into ProductionLine/AssemblyLine
    // objects; the caller's autoCalculateRates() then re-balances the rates.
    // console.clear();
    // const optimizeStart = performance.now();
    this.solverError = null;
    const config = this.optimizer;
    const overwrite = config.overwrite;

    // ====================================================================================================
    // Define targets

    const { fixed: targetFixed, maximize: targetMax } =
      this.targetConstraints();

    if (!overwrite) {
      // add targets from existing production lines
      for (const productionLine of this.productionLines) {
        if (productionLine.maximizeOutput) {
          targetMax.add(productionLine.part.slug);
        } else if (productionLine.outputRate > 0.0001) {
          const partSlug = productionLine.part.slug;

          if (
            targetFixed.has(partSlug) &&
            Math.abs(
              productionLine.outputRate - (targetFixed.get(partSlug) ?? 0),
            ) > 0.0001
          ) {
            this.solverError = `Conflicting goals for ${productionLine.part.name}: production target requires ${displayNum(targetFixed.get(partSlug) ?? 0)} but production line requires ${displayNum(productionLine.outputRate)}`;
            this.update();
            return;
          }

          targetFixed.set(partSlug, productionLine.outputRate);
        }
      }
    }

    // console.log("fixed:", targetFixed);
    // console.log("max:", targetMax);

    if (targetFixed.size === 0 && targetMax.size === 0) {
      this.solverError = "Nothing to optimize";
      this.update();
      return;
    }

    // ====================================================================================================
    // Define recipes

    const candidates: RecipeLike[] = [];

    // Gap-fill mode: parts already produced by kept lines are off-limits to new
    // recipes.
    const keptProduced = new Set<string>();
    if (!overwrite) {
      for (const pl of this.productionLines) {
        for (const al of pl.assemblyLines) {
          candidates.push(al.recipe); // all existing recipes are candidates for the solver
          for (const prod of al.recipe.products)
            keptProduced.add(prod.part.slug);
        }
      }
    }

    // console.log("keptProduced", keptProduced);

    // Hard-limited available parts: the optimizer may not produce them.
    const hardLimited = new Set(
      config.availableParts.filter((a) => a.hardLimit).map((a) => a.partSlug),
    );

    // console.log("hardLimited", hardLimited);

    // Candidate recipes: enabled, not blocked by gap-fill or hard-limit rules.
    const enabled = new Set(config.enabledRecipes);
    const producible = new Set<string>();
    for (const recipe of recipes) {
      if (!enabled.has(recipe.slug)) {
        // console.log("skipping recipe because it is disabled", recipe);
        continue;
      }
      if (
        !overwrite &&
        recipe.products.some((p) => keptProduced.has(p.part.slug))
      ) {
        // console.log(
        //   "skipping recipe because its product is already being produced",
        //   recipe,
        // );
        continue;
      }
      if (recipe.products.some((p) => hardLimited.has(p.part.slug))) {
        // console.log(
        //   "Skipping recipe because its product has been hard limited",
        //   recipe,
        // );
        continue;
      }

      candidates.push(recipe);

      for (const product of recipe.products) producible.add(product.part.slug);
    }

    // console.log("candidate recipes", candidates);

    // ====================================================================================================
    // Get default model

    const baseModel = this.createBaseModel(candidates);
    const constraints = baseModel.constraints as Record<
      string,
      ConstraintBound
    >;
    const variables = baseModel.variables;

    // console.log("default constraints", constraints);
    // console.log("default variables", variables);

    // ====================================================================================================
    // Overlay supply information

    // overlay supply constraints
    for (const supplier of this.supplierFactories) {
      for (const product of supplier.products) {
        const supplySlug = `_supply_${product.part.slug}`;
        constraints[supplySlug] = { max: product.quantity };
        this.mergeConstraint(constraints, product.part.slug, { min: 0 });
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
      this.mergeConstraint(constraints, part.partSlug, { min: 0 });
      variables[supplySlug] = {
        [supplySlug]: 1,
        [part.partSlug]: 1,
      };
    }

    // console.log("constraints", constraints);
    // console.log("variables", variables);

    // ====================================================================================================
    // Set fixed targets

    for (const [slug, rate] of targetFixed) constraints[slug] = { equal: rate };

    // step 4: objective. Maximize targets dominate (matches the rate solver);
    // otherwise the ScoringObjective drives a single linear `_obj` row.
    const model: ModelDefinition = {
      constraints,
      variables,
      optimize: "_obj",
    };

    // ====================================================================================================
    // Determine maximum rates for maximize targets

    const onInfeasible = () => {
      const names = [
        ...[...targetFixed].map(
          ([slug, rate]) =>
            `${partSlugLookup[slug]?.name ?? slug} (${rate}/min)`,
        ),
        ...[...targetMax].map(
          (slug) => `${partSlugLookup[slug]?.name ?? slug} (maximize)`,
        ),
      ];
      this.solverError = `No feasible recipe selection for ${names.join(", ")} with the enabled recipes and available inputs.`;
      this.update();
    };

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
      // console.debug("Recipe optimizer model (max):", maxModel);
      // const solutionStart = performance.now();
      const solution = solver.Solve(maxModel) as SolveResult;
      // const solutionTime = performance.now() - solutionStart;
      // console.debug(`max solver took: ${solutionTime.toFixed(2)}ms`);
      // console.debug("Recipe optimizer raw result (max):", solution);

      if (!solution.feasible) {
        onInfeasible();
        return;
      }

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

      // console.log("max rates:", maxRates);

      // set maximum rate as a constraint
      for (const [slug, rate] of Object.entries(maxRates)) {
        model.constraints[slug] = { equal: rate * (1 - 1e-8) }; // add fudge factor for precision errors
      }
    }

    // ====================================================================================================
    // Set optimization targets

    this._buildScoringObjective(
      config.objective,
      model,
      candidates,
      globalPointOverrides,
    );

    // ====================================================================================================
    // Run solver

    // console.debug("Recipe optimizer model:", model);
    // console.debug("Recipe optimizer model:", JSON.stringify(model));
    // const solutionStart = performance.now();
    const solution = solver.Solve(model) as SolveResult;
    // const solutionTime = performance.now() - solutionStart;
    // console.debug(`solver took: ${solutionTime.toFixed(2)}ms`);
    // console.debug("Recipe optimizer raw result:", solution);
    // console.debug("Recipe optimizer raw result:", JSON.stringify(solution));

    // ====================================================================================================
    // Error on infeasible

    if (!solution.feasible) {
      onInfeasible();
      return;
    }

    // ====================================================================================================
    // Update recipes

    const selected: { recipe: RecipeLike; rate: number }[] = [];
    for (const recipe of candidates) {
      const rate =
        typeof solution[recipe.slug] === "number"
          ? (solution[recipe.slug] as number)
          : 0;
      if (rate > 1e-6) selected.push({ recipe, rate });
    }

    // Materialize: group selected recipes by primary product into production lines.
    if (overwrite) {
      this.productionLines = [];
      this._productionLineLookup = {};
    }

    const ensureLine = (part: Part): ProductionLine => {
      let pl = this._productionLineLookup[part.slug];
      if (!pl) {
        pl = new ProductionLine(part, 0, 0, true, true, true);
        this.productionLines.push(pl);
        this._productionLineLookup[part.slug] = pl;
      }
      return pl;
    };

    for (const { recipe, rate } of selected) {
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
          new AssemblyLine(recipe, rate, 0, 100, 0, true, true),
        );
      }
    }

    for (const [slug, rate] of targetFixed) {
      const part = partSlugLookup[slug];
      if (!part) continue;
      const pl = ensureLine(part);
      pl.outputRate = rate;
      pl.autoCalculateRate = true;
      pl.maximizeOutput = false;
    }

    for (const slug of targetMax) {
      const part = partSlugLookup[slug];
      if (!part) continue;
      const pl = ensureLine(part);
      pl.maximizeOutput = true;
      pl.autoCalculateRate = true;
    }

    const rates = new Map<AssemblyLine, number>();
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        rates.set(
          al,
          typeof solution[al.recipe.slug] === "number"
            ? (solution[al.recipe.slug] as number)
            : 0,
        );
      }
    }

    this._applyRates(rates);
    this.update();

    // console.debug(
    //   `full optimization took ${(performance.now() - optimizeStart).toFixed(2)}ms`,
    // );
  }

  /**
   * Translate a {@link ScoringObjective} into a single linear `_obj` row on the
   * recipe-selection model. All goals reduce to per-recipe (or per-supply)
   * coefficients; only the direction (`opType`) differs.
   */
  _buildScoringObjective(
    objective: ScoringObjective,
    model: ModelDefinition,
    recipes: RecipeLike[],
    globalPointOverrides: Record<string, number> = {},
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
        this.partPointOverrides,
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

    for (const recipe of recipes) {
      let v = 0;
      if (recipe.isFactoryRecipe) {
        const fr = recipe as unknown as { avgPowerPerInstance: number };
        if (objective === "power") v = fr.avgPowerPerInstance ?? 0;
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
   * Translate declared {@link Target}s into solver inputs:
   *  - fixed-rate target -> equality constraint { equal: rate }
   *  - maximize target    -> membership in the maximize set (opType "max")
   * The single contract both the rate solver and the recipe-selection algorithm
   * consume. Targets are independent of production lines.
   */
  targetConstraints(): { fixed: Map<string, number>; maximize: Set<string> } {
    const fixed = new Map<string, number>();
    const maximize = new Set<string>();
    for (const t of this.optimizer.targets) {
      if (t.maximize) maximize.add(t.partSlug);
      else if (t.rate !== undefined && t.rate > 0)
        fixed.set(t.partSlug, t.rate);
    }
    return { fixed, maximize };
  }

  /** True when rejecting a suggestion should prompt the user. */
  shouldPromptReject(): boolean {
    return this.optimizer.rejectPrompt === "ask";
  }

  /**
   * Apply the user's choice from the reject-suggestion prompt. Updates
   * rejectPrompt and/or adds a deny override; does not remove any lines (the
   * caller performs the removal).
   */
  applyRejectChoice(
    recipeSlugs: string[],
    choice: "never" | "no" | "yes" | "always",
  ) {
    if (choice === "never") {
      this.optimizer.rejectPrompt = "never";
    } else if (choice === "always") {
      this.optimizer.rejectPrompt = "always";
      this._denyRecipes(recipeSlugs);
    } else if (choice === "yes") {
      this._denyRecipes(recipeSlugs);
    }
  }

  /**
   * Apply the remembered reject behavior when no prompt is shown ("always" adds
   * a deny override, "never" does nothing).
   */
  applyRejectSilent(recipeSlugs: string[]) {
    if (this.optimizer.rejectPrompt === "always") {
      this._denyRecipes(recipeSlugs);
    }
  }

  _denyRecipes(recipeSlugs: string[]) {
    const deny = new Set(recipeSlugs.filter(Boolean));
    this.optimizer.enabledRecipes = this.optimizer.enabledRecipes.filter(
      (s) => !deny.has(s),
    );
  }

  _hasRecycledRubberPlasticLoop(): boolean {
    var hasRecycledPlasticRecipe = false;
    var hasRecycledRubberRecipe = false;

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        if (assemblyLine.recipe.slug === "recipe-alternate-plastic-1-c")
          hasRecycledPlasticRecipe = true;
        if (assemblyLine.recipe.slug === "recipe-alternate-recycledrubber-c")
          hasRecycledRubberRecipe = true;
      }
    }

    return hasRecycledPlasticRecipe && hasRecycledRubberRecipe;
  }

  allParts(): Part[] {
    return [...this._partsConsumed.union(this._partsProduced)];
  }

  allOutputs(): Part[] {
    return Object.entries(this.rateLookup)
      .filter(([_, rate]) => {
        return rate.productionRate - rate.consumptionRate >= 0.0001;
      })
      .map(([partSlug, _]) => partSlugLookup[partSlug]);
  }

  allInputs(): Part[] {
    return Object.entries(this.rateLookup)
      .filter(([partSlug, rate]) => {
        const ownDeficit = rate.consumptionRate - rate.productionRate;
        if (ownDeficit <= 0.0001) return false;
        const supplied = this.supplierFactories.reduce((sum, fr) => {
          const p = fr.getProduct(partSlug);
          return sum + (p?.quantity ?? 0);
        }, 0);
        return ownDeficit - supplied > 0.0001;
      })
      .map(([partSlug, _]) => partSlugLookup[partSlug]);
  }

  getOutputInfo(): FactoryOutput[] {
    return this.allOutputs().map((part) => {
      return {
        part: part,
        rate: this.rateLookup[part.slug],
        isPrimary: this._mainOutputParts.has(part),
      };
    });
  }

  addSupplier(fr: FactoryRecipe) {
    this.supplierFactories.push(fr);
    this.update();
  }

  removeSupplier(factoryId: string) {
    this.supplierFactories = this.supplierFactories.filter(
      (fr) => fr.slug !== `factory:${factoryId}`,
    );
    this.update();
  }

  recipeOutputs(): Part[] {
    // Iterate the assembly lines' products directly (O(assemblyLines)) rather
    // than filtering the full parts list (O(parts)) on every call. This runs
    // per AssemblyLineComponent render, so it must stay cheap.
    const seen = new Map<string, Part>();
    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.products) {
          if (!seen.has(recipePart.part.slug)) {
            seen.set(recipePart.part.slug, recipePart.part);
          }
        }
      }
    }
    return [...seen.values()];
  }

  allIntermediateParts(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      return Math.abs(rate.productionRate - rate.consumptionRate) < 0.0001;
    });
  }

  addProductionLine(
    part: Part,
    autoCreated: boolean = false,
    suppressAutoRecipe = false,
  ) {
    if (part.slug in this._productionLineLookup) {
      console.warn(
        "Cannot add a production line that already exists!",
        part.slug,
      );
      return;
    }
    const demand = this.getPartDemand(part);
    var productionRate: number, outputRate: number;
    if (demand === 0) {
      productionRate = outputRate = 10;
    } else {
      productionRate = demand;
      outputRate = 0;
    }

    const newProductionLine = new ProductionLine(
      part,
      productionRate,
      outputRate,
      true,
      autoCreated,
      suppressAutoRecipe,
    );
    this.productionLines.push(newProductionLine);
    if (!this.icon) this.icon = part.iconLarge;
    this._productionLineLookup[part.slug] = newProductionLine;

    if (this.autoAddProductLines) {
      // TODO select default recipe, add more product lines automatically
    }

    if (!autoCreated) this.update();
  }

  removeProductionLine(part: Part) {
    this.productionLines = this.productionLines.filter(
      (product) => product.part.slug !== part.slug,
    );

    delete this._productionLineLookup[part.slug];

    this.update();
  }

  /**
   * Gets the demand for the part in all production lines except the production line that directly produces the part.
   *
   * @param part The part to get the demand for
   * @returns The demand for the part in all production lines other than the line for the part
   */
  getPartDemand(part: Part) {
    let productionRate = 0;
    for (const productionLine of this.productionLines) {
      if (productionLine.part.slug === part.slug) continue;

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          if (recipePart.part.slug !== part.slug) continue;

          productionRate += assemblyLine.getPartConsumptionRate(
            recipePart.part,
          );
        }

        for (const recipePart of assemblyLine.recipe.products) {
          if (recipePart.part.slug !== part.slug) continue;
          productionRate -= assemblyLine.getPartProductionRate(recipePart.part);
        }
      }
    }

    return productionRate;
  }

  setPartRate(part: Part, productionRate: number, _isAutoSet: boolean = false) {
    const productionLine = this._productionLineLookup[part.slug];

    if (productionLine.rate === 0) {
      // Multiplicative scaling from 0 produces NaN (0 * Infinity); distribute evenly instead
      const n = productionLine.assemblyLines.length;
      for (const assemblyLine of productionLine.assemblyLines) {
        const product = assemblyLine.recipe.getProduct(part);
        assemblyLine.rate =
          product && n > 0 ? productionRate / n / product.quantity : 0;
      }
    } else {
      const rateMultiplier = productionRate / productionLine.rate;
      for (const assemblyLine of productionLine.assemblyLines) {
        assemblyLine.rate *= rateMultiplier;
      }
    }

    productionLine.rate = productionRate;

    for (const assemblyLine of productionLine.assemblyLines) {
      for (const recipePart of assemblyLine.recipe.ingredients) {
        if (recipePart.part.slug === part.slug) continue;

        this.autoSetPartRate(recipePart.part);
      }
    }

    this.update();
  }

  /**
   * Sets the rate for the production line for the part given its demand in other production lines. This will remove the
   * production line for the part if it is not needed anywhere else in the factory and it was created automatically.
   *
   * @param part The part whose production rate needs to be set based on other production lines
   */
  autoSetPartRate(part: Part) {
    if (this._autoSetPartRateInProgress.has(part.slug)) {
      // Cycle detected: this part is already being processed up the call stack
      return;
    }

    const productionLine = this._productionLineLookup[part.slug];
    if (!productionLine?.autoCalculateRate) {
      // do not auto set rate for a production line without the flag set, or one that doesn't exist yet
      return;
    }

    if (
      (part.slug === "rubber" || part.slug === "plastic") &&
      this._hasRecycledRubberPlasticLoop()
    ) {
      console.debug(
        "Handling recycled rubber and plastic loop is not implemented in this loop",
      );
      return;
    }

    this._autoSetPartRateInProgress.add(part.slug);
    try {
      const productionRate = this.getPartDemand(part);
      if (productionLine.autoCreated && productionRate < 0.00001) {
        this.removeProductionLine(part);
      } else {
        this.setPartRate(part, productionRate, true);
      }
    } finally {
      this._autoSetPartRateInProgress.delete(part.slug);
    }
  }

  mergeConstraint(
    constraints: Record<string, ConstraintBound>,
    slug: string,
    desired: ConstraintBound,
  ) {
    const existing = constraints[slug];
    if (existing === undefined) {
      constraints[slug] = desired;
      return;
    }

    if (
      existing.equal !== undefined &&
      desired.equal !== undefined &&
      existing.equal !== desired.equal
    ) {
      console.warn(
        `Tried to merge conflicting constraints for ${slug}: existing:`,
        existing,
        "desired:",
        desired,
      );
      return;
    }

    if (existing.equal !== undefined && desired.equal === undefined) return;
    if (desired.equal !== undefined) {
      constraints[slug] = desired;
      return;
    }

    if (
      desired.min !== undefined &&
      (existing.min === undefined || existing.min < desired.min)
    )
      existing.min = desired.min;
    if (
      desired.max !== undefined &&
      (existing.max === undefined || existing.max > desired.max)
    )
      existing.max = desired.max;
  }

  createBaseModel(recipes: RecipeLike[]): ModelDefinition {
    const constraints: Record<string, ConstraintBound> = {};
    const variables: Record<string, VariableCoefficients> = {};

    for (const [resource, limit] of Object.entries(defaultResourceLimits)) {
      if (limit === 0) {
        // min: 0 means there cannot be a net consumption of these resources, and no recipe
        // produces them so this effectively locks these resources out of any automated solver
        constraints[resource] = { min: 0 };
        continue;
      }

      const rawSlug = `_raw_${resource}`;
      constraints[rawSlug] = { max: limit };
      constraints[resource] = { min: 0 };
      variables[rawSlug] = { [rawSlug]: 1, [resource]: 1 };
    }

    for (const slug of notAutomatable) {
      constraints[slug] = { min: 0 };
    }

    // Overlay factory constraints
    for (const { partSlug, ...desired } of this.constraints) {
      const rawSlug = `_raw_${partSlug}`;
      if (constraints[rawSlug]) {
        this.mergeConstraint(constraints, rawSlug, desired);
      } else {
        this.mergeConstraint(constraints, partSlug, desired);
      }
    }

    // fill recipes
    const recipeInputs = new Set<string>();
    const recipeOutputs = new Set<string>();
    // A factory-as-recipe represents whole copies of a physical sub-factory, so its
    // completions/min must be integer. Mark those variables for the MILP solver.
    const ints: Record<string, 1> = {};

    for (const recipe of recipes) {
      // TODO fix for factories as recipes
      const coefficients: VariableCoefficients = {};
      for (const ingredient of recipe.ingredients) {
        coefficients[ingredient.part.slug] =
          (coefficients[ingredient.part.slug] ?? 0) - ingredient.quantity;

        recipeInputs.add(ingredient.part.slug);
      }

      for (const product of recipe.products) {
        coefficients[product.part.slug] =
          (coefficients[product.part.slug] ?? 0) + product.quantity;

        recipeOutputs.add(product.part.slug);
      }

      variables[recipe.slug] = coefficients;
      if (recipe.isFactoryRecipe) ints[recipe.slug] = 1;
    }

    // set constraints on intermediate parts
    for (const slug of recipeInputs.intersection(recipeOutputs)) {
      if (constraints[slug] !== undefined) {
        if (constraints[slug].equal) continue;
        constraints[slug].min = 0;
      } else if (slug !== "water") {
        constraints[slug] = { min: 0 };
      }
    }

    // create model
    const model: ModelDefinition = {
      constraints,
      variables,
      optimize: "_obj",
    };

    if (Object.keys(ints).length > 0) {
      (model as ModelDefinition & { ints: Record<string, 1> }).ints = ints;
    }

    return model;
  }

  autoCalculateRates() {
    this.solverError = null;

    const solverRecipes: RecipeLike[] = [];
    const maxTargets = new Set<string>();
    const rateTargets = new Map<string, number>();

    for (const pl of this.productionLines) {
      if (pl.maximizeOutput) {
        maxTargets.add(pl.part.slug);
      } else if (pl.outputRate > 0) {
        rateTargets.set(pl.part.slug, pl.outputRate);
      }
      for (const al of pl.assemblyLines) {
        solverRecipes.push(al.recipe);
      }
    }

    const model = this.createBaseModel(solverRecipes);

    // set rate targets
    for (const [partSlug, rate] of rateTargets) {
      model.constraints[partSlug] = { equal: rate };
    }

    // set optimization target
    if (maxTargets.size > 0) {
      // goal is to maximize a part
      for (const partSlug of maxTargets) {
        for (const coefficients of Object.values(model.variables)) {
          if (coefficients[partSlug] !== 0) {
            coefficients._obj = coefficients[partSlug];
          }
        }
      }

      model.opType = "max";
    } else {
      // goal is to minimize inputs
      for (const partSlug of Object.keys(defaultResourceLimits)) {
        const rawPartSlug = `_raw_${partSlug}`;
        for (const coefficients of Object.values(model.variables)) {
          if (coefficients[rawPartSlug] && coefficients[rawPartSlug] !== 0) {
            coefficients._obj =
              (coefficients.obj ?? 0) + coefficients[rawPartSlug];
          }
        }
      }

      model.opType = "min";
    }

    // console.debug("model", model);
    // const solutionStart = performance.now();
    const solution = solver.Solve(model) as SolveResult;
    // const solutionTime = performance.now() - solutionStart;
    // console.debug(`solver took: ${solutionTime.toFixed(2)}ms`);
    // console.debug("solver result:", solution);

    // console.log("feasible", solution.feasible);
    if (solution.feasible) {
      const rates = new Map<AssemblyLine, number>();
      for (const pl of this.productionLines) {
        for (const al of pl.assemblyLines) {
          rates.set(
            al,
            typeof solution[al.recipe.slug] === "number"
              ? (solution[al.recipe.slug] as number)
              : 0,
          );
        }
      }

      this._applyRates(rates);
      this.update();

      // wait until after changes are applied and verify constraints are met
      setTimeout(() => {
        var rate: Rate;
        var part: Part;
        const existingSolverError = this.solverError;
        const errors = [];

        for (const constraintEntry of Object.entries(model.constraints)) {
          const partSlug = constraintEntry[0];
          const constraint = constraintEntry[1] as ConstraintBound;

          if (partSlug.indexOf("_raw_") === 0) {
            const realPartSlug = partSlug.substring(5);
            rate = this.rateLookup[realPartSlug];
            if (!rate) continue;
            rate.consumptionRate = -rate.consumptionRate;
            rate.productionRate = -rate.productionRate;

            part = partSlugLookup[realPartSlug];
          } else {
            rate = this.rateLookup[partSlug];
            part = partSlugLookup[partSlug];
          }

          if (!rate) continue;
          if (!part) {
            console.warn("Unable to find part for constraint", partSlug);
            continue;
          }

          const netRate = rate.productionRate - rate.consumptionRate;
          if (constraint.min && constraint.min - netRate > 0.0001) {
            errors.push(
              `${part.name} must be ${constraint.min}/min or greater, but is ${netRate}/min`,
            );
          } else if (constraint.max && constraint.max - netRate < -0.0001) {
            errors.push(
              `${part.name} must be ${constraint.max}/min or less, but is ${netRate}/min`,
            );
          } else if (
            constraint.equal &&
            Math.abs(constraint.equal - netRate) > 0.0001
          ) {
            errors.push(
              `${part.name} must be exactly ${constraint.min}/min, but is ${netRate}/min`,
            );
          }
        }

        if (errors.length > 0) {
          this.solverError = `No feasible solution! One or more constraints could not be satisified: ${errors.join("; ")}.`;
          if (this.solverError !== existingSolverError) this.update();
        }
      });
    } else {
      this.solverError = "No feasible solution";
      this.update();
    }
  }

  getTotalPower(): { avg: number; min: number; max: number } {
    let avg = 0;
    let min = 0;
    let max = 0;
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        const p = al.getPowerConsumption();
        avg += p.avg;
        min += p.min;
        max += p.max;
      }
    }
    return { avg, min, max };
  }

  getTotalShards(): number {
    let total = 0;
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        if (al.recipe.isFactoryRecipe) {
          total +=
            al.rate *
            (al.recipe as unknown as { shardsPerInstance: number })
              .shardsPerInstance;
        } else {
          total += al.getTotalShards();
        }
      }
    }
    return total;
  }

  getTotalSloops(): number {
    let total = 0;
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        if (al.recipe.isFactoryRecipe) {
          total +=
            al.rate *
            (al.recipe as unknown as { sloopsPerInstance: number })
              .sloopsPerInstance;
        } else {
          const count = al.getMachineCount();
          const machines =
            "fullMachines" in count
              ? count.fullMachines + (count.remainderClock > 0 ? 1 : 0)
              : count.machineCount;
          total += al.sloopedSlots * machines;
        }
      }
    }
    return total;
  }

  _applyRates(rateMap: Map<AssemblyLine, number>) {
    const affected = new Set<ProductionLine>();

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        const rate = rateMap.get(assemblyLine);
        if (rate !== undefined) {
          assemblyLine.rate = rate;
          affected.add(productionLine);
        }
      }
    }

    for (const productionLine of affected) {
      productionLine.rate = productionLine.assemblyLines.reduce(
        (acc, assemblyLine) => {
          const product = assemblyLine.recipe.getProduct(productionLine.part);
          if (!product) return acc;
          return acc + assemblyLine.getPartProductionRate(product.part);
        },
        0,
      );
    }

    this.update();
  }
}
