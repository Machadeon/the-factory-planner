import solver, {
  type ConstraintBound,
  type ModelDefinition,
  type SolveResult,
  type VariableCoefficients,
} from "javascript-lp-solver";
import {
  defaultResourceLimits,
  partSlugLookup,
  parts,
} from "../models/library";
import type AssemblyLine from "./assembly-line";
import type FactoryRecipe from "./factory-recipe";
import type Part from "./part";
import ProductionLine from "./production-line";

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
  | "sinkPoints"
  | "power"
  | "buildings"
  | "inputValue";

export type RejectPrompt = "ask" | "always" | "never";

/**
 * User-configurable settings for the auto-fill recipes feature. The
 * recipe-selection algorithm that consumes these lives separately; this config
 * is the UI-facing state (see plan:auto-recipe-ui.md).
 */
export interface AutoFillConfig {
  /** Re-run auto-fill on every edit (vs only when the user clicks Run). */
  eager: boolean;
  /** Optimization goal driving the LP objective. */
  objective: ScoringObjective;
  /** Part slugs preferred as already-available inputs. */
  availableParts: string[];
  /** Source factory ids whose outputs are treated as available. */
  availableFactoryIds: string[];
  /** Game phase ceiling for recipe unlocks. */
  phase: number;
  /** Master toggle: standard (non-alternate) recipes selectable. */
  defaultRecipesEnabled: boolean;
  /** Master toggle: alternate recipes selectable. */
  alternateRecipesEnabled: boolean;
  /** Per-recipe allow(true)/deny(false) overrides over the master toggles. */
  recipeOverrides: Record<string, boolean>;
  /** Overwrite all production lines vs only fill gaps. */
  overwrite: boolean;
  /** Whether rejecting a suggestion also removes the recipe from auto-fill. */
  rejectPrompt: RejectPrompt;
}

export const MAX_GAME_PHASE = 5;

export function defaultAutoFillConfig(): AutoFillConfig {
  return {
    eager: false,
    objective: "sinkPoints",
    availableParts: [],
    availableFactoryIds: [],
    phase: MAX_GAME_PHASE,
    defaultRecipesEnabled: true,
    alternateRecipesEnabled: true,
    recipeOverrides: {},
    overwrite: false,
    rejectPrompt: "ask",
  };
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
  autoFill: AutoFillConfig;
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
    this.autoFill = oldFactory?.autoFill ?? defaultAutoFillConfig();

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
   * Auto-fill production lines to satisfy requested outputs from available
   * inputs, choosing recipes per {@link autoFill}. The LP-based recipe-selection
   * algorithm is implemented separately (see plan:auto-recipe-ui.md); this is
   * the entry point the UI invokes.
   */
  autoFillProductionLines() {
    // TODO: implement LP-based recipe selection. No-op for now so the UI wiring
    // (Run button, eager mode) is in place ahead of the algorithm.
  }

  /** True when rejecting a suggestion should prompt the user. */
  shouldPromptReject(): boolean {
    return this.autoFill.rejectPrompt === "ask";
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
      this.autoFill.rejectPrompt = "never";
    } else if (choice === "always") {
      this.autoFill.rejectPrompt = "always";
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
    if (this.autoFill.rejectPrompt === "always") {
      this._denyRecipes(recipeSlugs);
    }
  }

  _denyRecipes(recipeSlugs: string[]) {
    for (const slug of recipeSlugs) {
      if (slug) this.autoFill.recipeOverrides[slug] = false;
    }
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

  autoCalculateRates() {
    // step 1: build one LP variable per recipe which defines that recipe's desired rate
    // step 2: set constraints for output parts with specific target rate
    // step 3: set input constraints
    // step 4: set intermediate constraints: must be non-negative (min: 0)
    // step 5: set optimization target(s)
    //     a: if any ONE production line is maximized, set `optimize: "{slug}"` and `opType: "max"`
    //     b: if multiple production lines are maximized, maximize sum of all targets
    //     c: if no production lines are maximized, minimize each input and intermediate part

    // CURRENT ISSUES:
    // - Rubber/Plastic loop picks the first recipe to maximize, because sum of outputs is always the same

    // IMPROVEMENTS:
    // - allow user to prioritize which part is maximized
    // - Rubber/Plastic loop improvements:
    //   - ensure both output rates are equal
    //   - inform user about unique aspects of loop

    this.solverError = null;
    let objectiveRate = 0;

    type AssemblyLineInfo = {
      assemblyLine: AssemblyLine;
      productionLine: ProductionLine;
      varName: string;
    };

    const assemblyLineInfos: AssemblyLineInfo[] = [];
    const allOutputSlugs = new Set<string>();
    const allInputSlugs = new Set<string>();
    const factoryOutputs = new Map<string, number>();
    const maximizeSlugs = new Set<string>();

    let varIndex = 0;
    for (const productionLine of this.productionLines) {
      if (productionLine.maximizeOutput) {
        maximizeSlugs.add(productionLine.part.slug);
      } else if (productionLine.outputRate > 0) {
        factoryOutputs.set(productionLine.part.slug, productionLine.outputRate);
      }

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const ingredient of assemblyLine.recipe.ingredients) {
          allInputSlugs.add(ingredient.part.slug);
        }
        for (const product of assemblyLine.recipe.products) {
          allOutputSlugs.add(product.part.slug);
        }
        assemblyLineInfos.push({
          assemblyLine,
          productionLine,
          varName: `al_${++varIndex}`,
        });
      }
    }

    const intermediateSlugs = new Set(
      [...allOutputSlugs].filter((s) => allInputSlugs.has(s)),
    );
    const rawInputSlugs = new Set(
      [...allInputSlugs].filter((s) => !allOutputSlugs.has(s)),
    );

    // Build effective limit map: defaultResourceLimits overlaid by user constraints.
    const effectiveLimits = new Map<
      string,
      { min?: number; max?: number; equal?: number }
    >();
    for (const constraint of this.constraints) {
      if (constraint.equal !== undefined) {
        effectiveLimits.set(constraint.partSlug, { equal: constraint.equal });
      } else {
        const limit: ConstraintBound = {};
        if (constraint.min !== undefined) limit.min = constraint.min;
        if (constraint.max !== undefined) limit.max = constraint.max;
        effectiveLimits.set(constraint.partSlug, limit);
      }
    }

    for (const [slug, limit] of Object.entries(defaultResourceLimits)) {
      if (!effectiveLimits.has(slug)) effectiveLimits.set(slug, { max: limit });
    }

    // step 1: build one LP variable per recipe which defines that recipe's desired rate
    const variables: Record<string, VariableCoefficients> = {};
    for (const { assemblyLine, varName } of assemblyLineInfos) {
      const sloopMult = assemblyLine.getSloopMultiplier();
      const coefficients: VariableCoefficients = {};
      for (const ingredient of assemblyLine.recipe.ingredients) {
        coefficients[ingredient.part.slug] =
          (coefficients[ingredient.part.slug] ?? 0) - ingredient.quantity;

        // Track raw-input consumption in a separate positive row so we can
        // use { max: L } constraints (positive RHS) instead of { min: -L }.
        if (
          rawInputSlugs.has(ingredient.part.slug) &&
          effectiveLimits.has(ingredient.part.slug)
        ) {
          const capKey = `_raw_${ingredient.part.slug}`;
          coefficients[capKey] =
            (coefficients[capKey] ?? 0) + ingredient.quantity;
        }
      }

      for (const product of assemblyLine.recipe.products) {
        coefficients[product.part.slug] =
          (coefficients[product.part.slug] ?? 0) + product.quantity * sloopMult;
      }

      variables[varName] = coefficients;
    }

    // step 2: set constraints for output parts with specific target rate
    const constraints: Record<string, ConstraintBound> = {};
    for (const [slug, rate] of factoryOutputs) {
      constraints[slug] = { equal: rate };
    }

    // step 3: set input constraints
    for (const [slug, limit] of effectiveLimits) {
      if (rawInputSlugs.has(slug)) {
        // Use a separate positive-row _raw_<slug> to avoid negative-RHS constraints.
        // The _raw_<slug> row tracks consumption (positive); { max: L } caps it at L.
        const capKey = `_raw_${slug}`;
        constraints[capKey] = limit;
      } else {
        constraints[slug] = limit;
      }
    }

    // step 4: set intermediate constraints: must be non-negative (min: 0)
    for (const slug of intermediateSlugs) {
      if (slug in constraints) {
        if (constraints[slug].equal === undefined) constraints[slug].min = 0;
      } else {
        constraints[slug] = { min: 0 };
      }
    }

    // set model because optimize setup will vary depending on factory configuration
    const model: Omit<ModelDefinition, "optimize"> & {
      optimize?: ModelDefinition["optimize"];
      opType?: string;
    } = {
      constraints: constraints,
      variables: variables,
    };

    // step 5: set optimization target(s)
    //     a: if any ONE production line is maximized, set `optimize: "{slug}"` and `opType: "max"`
    //     b: if multiple production lines are maximized, maximize sum of all targets
    //     c: if no production lines are maximized, minimize each input and intermediate part
    if (maximizeSlugs.size === 1) {
      // single part maximized, configure LP for single optimizer mode
      for (const slug of maximizeSlugs) {
        model.optimize = slug;
      }
      model.opType = "max";
    } else if (maximizeSlugs.size > 1) {
      // TODO: allow user to specify which product to prioritize (e.g. maximize rocket fuel first, then turbofuel)
      // This will lead to multiple LP solves (maximize one, then set constrain it to max value and optimize the next, etc.)
      // For now, just try to maximize the sum of all maximized parts

      // multiple parts maximized, maximize sum of all targets
      model.optimize = "_obj";
      model.opType = "max";

      for (const coefficients of Object.values(variables)) {
        objectiveRate = 0;
        for (const slug of maximizeSlugs) {
          objectiveRate += coefficients[slug] ?? 0;
        }
        if (objectiveRate !== 0) {
          coefficients._obj = objectiveRate;
        }
      }
    } else {
      // no parts maximized, minimize raw resources and intermediate products
      model.optimize = {};
      for (const slug of rawInputSlugs) {
        const rawSlug = `_raw_${slug}`;
        if (rawSlug in constraints) {
          model.optimize[rawSlug] = "min";
        } else {
          model.optimize[slug] = "max";
        }
      }

      for (const slug of intermediateSlugs) {
        model.optimize[slug] = "min";
      }
    }

    console.debug("Solver v3 model:", JSON.stringify(model));
    const start1 = performance.now();
    const raw1 = solver.Solve(model as ModelDefinition);
    console.debug(`solver-v3: ${(performance.now() - start1).toFixed(2)}ms`);
    console.debug("Solver v3 result:", JSON.stringify(raw1));

    // @ts-expect-error
    const solution: SolveResult = raw1.midpoint ?? raw1;

    const actuallyFeasible =
      (solution as SolveResult & { feasible?: boolean }).feasible !== false &&
      Object.keys(solution).some((k) => k.indexOf("al_") === 0);
    if (actuallyFeasible) {
      // extract rates
      const map = new Map<AssemblyLine, number>();
      for (const { assemblyLine, varName } of assemblyLineInfos) {
        map.set(
          assemblyLine,
          typeof solution[varName] === "number"
            ? (solution[varName] as number)
            : 0,
        );
      }

      this.solverError = null;
      this._applyRates(map);

      // wait until after changes are applied and verify constraints are met
      setTimeout(() => {
        var rate: Rate;
        var part: Part;
        const existingSolverError = this.solverError;
        const errors = [];

        for (const [partSlug, constraint] of Object.entries(constraints)) {
          if (partSlug.indexOf("_raw_") === 0) {
            const realPartSlug = partSlug.substring(5);
            rate = this.rateLookup[realPartSlug];
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
          return;
        }

        for (const partSlug of intermediateSlugs) {
          if (maximizeSlugs.has(partSlug)) continue;

          rate = this.rateLookup[partSlug];
          part = partSlugLookup[partSlug];
          const netRate = rate.productionRate - rate.consumptionRate;

          if (Math.abs(netRate) > 0.0001) {
            errors.push(part.name);
          }
        }

        // check for net outputs that do not have a production line
        for (const [partSlug, rate] of Object.entries(this.rateLookup)) {
          if (rawInputSlugs.has(partSlug)) continue;
          const part = partSlugLookup[partSlug];
          if (errors.indexOf(part.name) >= 0) continue;

          const netRate = rate.productionRate - rate.consumptionRate;
          if (
            !this._productionLineLookup[partSlug] &&
            Math.abs(netRate) > 0.0001
          ) {
            errors.push(part.name);
          }
        }

        if (errors.length > 0) {
          this.solverError = `Unable to balance intermediate/secondary parts: ${errors.join(", ")}.`;
          if (this.solverError !== existingSolverError) this.update();
        }
      });

      return;
    }

    const outputList = [
      ...[...factoryOutputs.entries()].map(([slug, rate]) => {
        const name = partSlugLookup[slug]?.name ?? slug;
        return `${name} (${rate}/min)`;
      }),
      ...[...maximizeSlugs].map((slug) => {
        const name = partSlugLookup[slug]?.name ?? slug;
        return `${name} (maximize)`;
      }),
    ];
    this.solverError = `No feasible solution: the output target${outputList.length !== 1 ? "s" : ""} ${outputList.join(", ")} cannot be satisfied with the current recipe configuration.`;
    this.update();
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
