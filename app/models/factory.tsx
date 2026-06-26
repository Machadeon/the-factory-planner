import solver, {
  type ConstraintBound,
  type ConstraintRelation,
  type ObjectiveDirection,
  type SolveResult,
  type VariableCoefficients,
} from "javascript-lp-solver";
import { parts } from "../models/library";
import type AssemblyLine from "./assembly-line";
import type FactoryRecipe from "./factory-recipe";
import type Part from "./part";
import ProductionLine from "./production-line";
import type { RecipeLike } from "./recipe-like";

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

  addProductionLine(part: Part, autoCreated: boolean = false) {
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

    if (this.icon === part.iconLarge) {
      if (this.productionLines.length > 0) {
        this.icon = this.productionLines[0].part.iconLarge;
      }
    }

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
    console.clear();

    const recipeOutputs = new Set<Part>();
    const recipeInputs = new Set<Part>();
    const factoryOutputs = new Set<[Part, number]>();
    const allRecipes = new Set<RecipeLike>();
    const assemblyLineLookup = new Map<string, AssemblyLine>();

    // step 1: determine included parts
    for (const productionLine of this.productionLines) {
      if (productionLine.outputRate > 0) {
        factoryOutputs.add([productionLine.part, productionLine.outputRate]);
      }

      for (const assemblyLine of productionLine.assemblyLines) {
        allRecipes.add(assemblyLine.recipe);
        assemblyLineLookup.set(assemblyLine.recipe.slug, assemblyLine);

        for (const ingredient of assemblyLine.recipe.ingredients) {
          recipeInputs.add(ingredient.part);
        }

        for (const product of assemblyLine.recipe.products) {
          recipeOutputs.add(product.part);
        }
      }
    }

    const intermediateParts = recipeOutputs.intersection(recipeInputs);
    const factoryInputs = recipeInputs.difference(intermediateParts);

    const optimize: Record<string, ObjectiveDirection> = {};
    for (const part of factoryInputs) {
      if (part.slug === "water") continue; // do we really need to minimize our water usage?

      optimize[part.slug] = "max"; // input values are negative so we want to maximize them
    }

    const constraints: Record<string, ConstraintBound | ConstraintRelation> =
      {};
    constraints.water = { max: 0 }; // water needs to be an input
    // constraints["dissolved-silica"] = { equal: 0 } // this one really needs to balance

    for (const part of intermediateParts) {
      if (Object.hasOwn(constraints, part.slug)) continue; // water is already accounted for

      constraints[part.slug] = { equal: 0 };
    }

    for (const factoryOutput of factoryOutputs) {
      const part = factoryOutput[0];
      const rate = factoryOutput[1];
      constraints[part.slug] = { equal: rate }; // set output rates
    }

    const variables: Record<string, VariableCoefficients> = {};
    for (const recipe of allRecipes) {
      const assemblyLine = assemblyLineLookup.get(recipe.slug);
      const sloopMultiplier = assemblyLine?.isSlooped() ? 2 : 1;
      variables[recipe.slug] = {};
      for (const ingredient of recipe.ingredients) {
        variables[recipe.slug][ingredient.part.slug] = -ingredient.quantity;
      }
      for (const product of recipe.products) {
        variables[recipe.slug][product.part.slug] =
          product.quantity * sloopMultiplier;
      }
    }

    const model = {
      optimize,
      constraints,
      variables,
    };

    console.log(model);
    console.time("solver-runtime");
    const rawResult = solver.Solve(model);
    console.timeEnd("solver-runtime");
    console.log(rawResult);

    // @ts-expect-error
    const result: SolveResult = rawResult.midpoint ?? rawResult;

    // if (!result.feasible) {
    //   return;
    // }

    for (const productionLine of this.productionLines) {
      productionLine.rate = 0;
      for (const assemblyLine of productionLine.assemblyLines) {
        const product = assemblyLine.recipe.getProduct(productionLine.part);
        if (!product) {
          throw new Error(
            `assembly line recipe '${assemblyLine.recipe.slug}' did not have a product that matched its production line part '${productionLine.part.slug}'`,
          );
        }

        const rate = result[assemblyLine.recipe.slug] ?? 0;
        if (typeof rate === "number") {
          assemblyLine.rate = rate;
          productionLine.rate += assemblyLine.getPartProductionRate(
            product.part,
          );
        }
      }
      productionLine.rate = productionLine.assemblyLines.reduce(
        (acc, assemblyLine) => {
          const product = assemblyLine.recipe.getProduct(productionLine.part);
          if (!product)
            throw new Error(
              `assembly line recipe '${assemblyLine.recipe.slug}' did not have a product that matched its production line part '${productionLine.part.slug}'`,
            );
          return acc + assemblyLine.getPartProductionRate(product.part);
        },
        0,
      );
    }

    this.update();
  }
}
