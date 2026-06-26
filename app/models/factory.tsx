import solver, {
  type ConstraintBound,
  type ConstraintRelation,
  type ObjectiveDirection,
  type SolveResult,
  type VariableCoefficients,
} from "javascript-lp-solver";
import { partSlugLookup, parts } from "../models/library";
import type AssemblyLine from "./assembly-line";
import type FactoryRecipe from "./factory-recipe";
import type Part from "./part";
import ProductionLine from "./production-line";

export interface Rate {
  consumpionRate: number;
  productionRate: number;
}

export default class Factory {
  productionLines: ProductionLine[];
  icon?: string;
  autoAddProductLines: boolean;
  supplierFactories: FactoryRecipe[];
  update: () => void;
  solverError: string | null;
  rateLookup: { [partSlug: string]: Rate };

  _productionLineLookup: { [partSlug: string]: ProductionLine };

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

    this.rateLookup = {};
    this._productionLineLookup = {};
    this._assemblyLineLookup = {};

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
            consumpionRate: 0,
            productionRate: 0,
          };

          rate.consumpionRate += assemblyLine.getPartConsumptionRate(
            recipePart.part,
          );
          this.rateLookup[recipePart.part.slug] = rate;
        }

        for (const recipePart of assemblyLine.recipe.products) {
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumpionRate: 0,
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
      return rate.productionRate - rate.consumpionRate >= 0.0001;
    });
  }

  allInputs(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      const ownDeficit = rate.consumpionRate - rate.productionRate;
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
    return parts.filter((part) => {
      for (const assemblyLine of this._assemblyLineLookup[part.slug] || []) {
        if (assemblyLine.recipe.getProduct(part)) {
          return true;
        }
      }

      return false;
    });
  }

  allIntermediateParts(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      return Math.abs(rate.productionRate - rate.consumpionRate) < 0.0001;
    });
  }

  addProductionLine(part: Part, autoCreated: boolean = false, suppressAutoRecipe = false) {
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
    const productionLine = this._productionLineLookup[part.slug];
    if (!productionLine?.autoCalculateRate) {
      // do not auto set rate for a production line without the flag set, or one that doesn't exist yet
      return;
    }

    if (
      (part.slug === "rubber" || part.slug === "plastic") &&
      this._hasRecycledRubberPlasticLoop()
    ) {
      console.log(
        "Handling recycled rubber and plastic loop is not implemented in this loop",
      );
      return;
    }

    const productionRate = this.getPartDemand(part);
    if (productionLine.autoCreated && productionRate < 0.00001) {
      this.removeProductionLine(part);
    } else {
      this.setPartRate(part, productionRate, true);
    }
  }

  autoCalculateRates() {
    this.solverError = null;
    console.clear();

    // applicable factory attributes:
    // - list of recipes (either game recipes or factories. What matters is a recipe has input parts, output parts, and a set ratio between all parts involved)
    // - list of output parts (subset of recipe outputs) and desired rate of each part (either static value or maximize)

    // step 1: build one LP variable per recipe which defines that recipe's desired rate
    // step 2: create constraints/optimizations for each output part: can maximize (as optimization), or set desired output rate (as constraint)
    // step 3: create constraints/optimizations for each input part: maximize (consumption is negative)
    // step 4: create constraints for each intermediate part: set to 0
    // step 5: run solver
    // if solver found a solution: report
    // if solver did not find a solution, allow intermediate parts to have a nonzero rate but still minimized:
    // step 6: remove constraints for each intermediate part. Create additional variables that for each intermediate part:
    // - Let surplus_p ≥ 0 and deficit_p ≥ 0 absorb positive/negative net rates
    // - Add the constraint: net_rate_p = surplus_p - deficit_p
    // - Minimize surplus_p + deficit_p in the objective
    // step 7: run solver
    // if solver found a solution: report
    // if solver did not find a solution: error (not solvable)

    type AssemblyLineInfo = {
      assemblyLine: AssemblyLine;
      productionLine: ProductionLine;
      varName: string;
    };

    const assemblyLineInfos: AssemblyLineInfo[] = [];
    const allOutputSlugs = new Set<string>();
    const allInputSlugs = new Set<string>();
    const factoryOutputs = new Map<string, number>();

    let varIndex = 0;
    for (const productionLine of this.productionLines) {
      if (productionLine.outputRate > 0) {
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
          varName: `al_${varIndex++}`,
        });
      }
    }

    const intermediateSlugs = new Set(
      [...allOutputSlugs].filter((s) => allInputSlugs.has(s)),
    );
    const rawInputSlugs = new Set(
      [...allInputSlugs].filter((s) => !allOutputSlugs.has(s)),
    );

    const buildVariables = (): Record<string, VariableCoefficients> => {
      const vars: Record<string, VariableCoefficients> = {};
      for (const { assemblyLine, varName } of assemblyLineInfos) {
        const sloopMult = assemblyLine.isSlooped() ? 2 : 1;
        const coeffs: VariableCoefficients = {};
        for (const ingredient of assemblyLine.recipe.ingredients) {
          coeffs[ingredient.part.slug] =
            (coeffs[ingredient.part.slug] ?? 0) - ingredient.quantity;
        }
        for (const product of assemblyLine.recipe.products) {
          coeffs[product.part.slug] =
            (coeffs[product.part.slug] ?? 0) + product.quantity * sloopMult;
        }
        vars[varName] = coeffs;
      }
      return vars;
    };

    const buildBaseConstraints = (): Record<
      string,
      ConstraintBound | ConstraintRelation
    > => {
      const c: Record<string, ConstraintBound | ConstraintRelation> = {};
      c.water = { max: 0 };
      for (const slug of intermediateSlugs) {
        if (!Object.hasOwn(c, slug)) c[slug] = { equal: 0 };
      }
      for (const [slug, rate] of factoryOutputs) {
        c[slug] = { equal: rate };
      }
      return c;
    };

    const extractRateMap = (
      solution: SolveResult,
    ): Map<AssemblyLine, number> => {
      const map = new Map<AssemblyLine, number>();
      for (const { assemblyLine, varName } of assemblyLineInfos) {
        map.set(
          assemblyLine,
          typeof solution[varName] === "number"
            ? (solution[varName] as number)
            : 0,
        );
      }
      return map;
    };

    // Phase 1: strict intermediate balancing
    const optimize1: Record<string, ObjectiveDirection> = {};
    for (const slug of rawInputSlugs) {
      if (slug !== "water") optimize1[slug] = "max";
    }

    const model1 = {
      optimize: optimize1,
      constraints: buildBaseConstraints(),
      variables: buildVariables(),
    };
    console.log("Phase 1 model:", model1);
    console.time("solver-v2-phase1");
    const raw1 = solver.Solve(model1);
    console.timeEnd("solver-v2-phase1");
    console.log("Phase 1 result:", raw1);

    // @ts-expect-error
    const result1: SolveResult = raw1.midpoint ?? raw1;

    if (result1.feasible) {
      this.solverError = null;
      this._applyRates(extractRateMap(result1));
      return;
    }

    // Phase 2: relax intermediate constraints by adding surplus/deficit slack variables.
    // For each intermediate part p: net_rate_p - surplus_p + deficit_p = 0
    // Minimize (surplus_p + deficit_p) via the _obj constraint.
    const variables2 = buildVariables();
    for (const slug of intermediateSlugs) {
      variables2[`_surplus_${slug}`] = { [slug]: -1, _obj: -1 };
      variables2[`_deficit_${slug}`] = { [slug]: 1, _obj: -1 };
    }

    const model2 = {
      optimize: { _obj: "max" } as Record<string, ObjectiveDirection>,
      constraints: buildBaseConstraints(),
      variables: variables2,
    };
    console.log("Phase 2 model:", model2);
    console.time("solver-v2-phase2");
    const raw2 = solver.Solve(model2);
    console.timeEnd("solver-v2-phase2");
    console.log("Phase 2 result:", raw2);

    // @ts-expect-error
    const result2: SolveResult = raw2.midpoint ?? raw2;

    if (result2.feasible) {
      const imbalanced: string[] = [];
      for (const slug of intermediateSlugs) {
        const surplus = (result2[`_surplus_${slug}`] as number) ?? 0;
        const deficit = (result2[`_deficit_${slug}`] as number) ?? 0;
        if (surplus > 0.001 || deficit > 0.001) {
          const name = partSlugLookup[slug]?.name ?? slug;
          const net = surplus - deficit;
          imbalanced.push(
            `${name} (${net > 0 ? "+" : ""}${net.toFixed(1)}/min)`,
          );
        }
      }
      this.solverError =
        imbalanced.length > 0
          ? `Circular recipe dependency: the following intermediate parts cannot be perfectly balanced and will have excess or deficit production: ${imbalanced.join(", ")}.`
          : null;
      this._applyRates(extractRateMap(result2));
      return;
    }

    const outputList = [...factoryOutputs.entries()]
      .map(([slug, rate]) => {
        const name = partSlugLookup[slug]?.name ?? slug;
        return `${name} (${rate}/min)`;
      })
      .join(", ");
    this.solverError = `No feasible solution: the output target${factoryOutputs.size !== 1 ? "s" : ""} ${outputList} cannot be satisfied with the current recipe configuration. Check that all required parts have production recipes assigned.`;
    this.update();
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
