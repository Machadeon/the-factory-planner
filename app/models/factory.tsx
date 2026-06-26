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

export default class Factory {
  productionLines: ProductionLine[];
  icon?: string;
  autoAddProductLines: boolean;
  supplierFactories: FactoryRecipe[];
  update: () => void;
  solverError: string | null;
  constraints: PartConstraint[];
  rateLookup: { [partSlug: string]: Rate };

  _productionLineLookup: { [partSlug: string]: ProductionLine };
  _autoSetPartRateInProgress: Set<string>;

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

    this.rateLookup = {};
    this._productionLineLookup = {};
    this._assemblyLineLookup = {};
    this._autoSetPartRateInProgress = new Set();

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

    for (const productionLine of this.productionLines) {
      this._productionLineLookup[productionLine.part.slug] = productionLine;

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
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
    return parts.filter((part) => Object.hasOwn(this.rateLookup, part.slug));
  }

  allOutputs(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      return rate.productionRate - rate.consumptionRate >= 0.0001;
    });
  }

  allInputs(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      const ownDeficit = rate.consumptionRate - rate.productionRate;
      if (ownDeficit <= 0.0001) return false;
      const supplied = this.supplierFactories.reduce((sum, fr) => {
        const p = fr.getProduct(part.slug);
        return sum + (p?.quantity ?? 0);
      }, 0);
      return ownDeficit - supplied > 0.0001;
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
        model.optimize[`_raw_${slug}`] = "min";
      }

      for (const slug of intermediateSlugs) {
        model.optimize[slug] = "min";
      }
    }

    console.debug("Solver v3 model:", JSON.stringify(model, null, 2));
    const start1 = performance.now();
    const raw1 = solver.Solve(model as ModelDefinition);
    console.debug(`solver-v3: ${(performance.now() - start1).toFixed(2)}ms`);
    console.debug("Solver v3 result:", JSON.stringify(raw1, null, 2));

    // @ts-expect-error
    const solution: SolveResult = raw1.midpoint ?? raw1;

    if (solution.feasible) {
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

      // // note imbalanced intermediate parts
      // const imbalanced: string[] = [];
      // for (const slug of intermediateSlugs) {
      //   const surplus = (solution[`_surplus_${slug}`] as number) ?? 0;
      //   const deficit = (solution[`_deficit_${slug}`] as number) ?? 0;
      //   if (surplus > 0.001 || deficit > 0.001) {
      //     const name = partSlugLookup[slug]?.name ?? slug;
      //     const net = surplus - deficit;
      //     imbalanced.push(
      //       `${name} (${net > 0 ? "+" : ""}${net.toFixed(1)}/min)`,
      //     );
      //   }
      // }
      // this.solverError =
      //   imbalanced.length > 0
      //     ? `The following intermediate parts cannot be perfectly balanced and will have excess or deficit production: ${imbalanced.join(", ")}.`
      //     : null;

      this.solverError = null;
      this._applyRates(map);
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
    this.solverError = `No feasible solution: the output target${outputList.length !== 1 ? "s" : ""} ${outputList.join(", ")} cannot be satisfied with the current recipe configuration. Check that all required parts have production recipes assigned.`;
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
      if (productionLine.maximizeOutput) {
        productionLine.outputRate = productionLine.rate;
      }
    }

    this.update();
  }
}
