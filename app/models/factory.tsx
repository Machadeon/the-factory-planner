import type Part from "./part";
import ProductionLine from "./production-line";
import { parts } from "../models/library";
import Error from "next/error";
import type Recipe from "./recipe";
import { solve } from "linear-solve";
import AssemblyLine from "./assembly-line";

export interface Rate {
  consumpionRate: number;
  productionRate: number;
}

export default class Factory {
  productionLines: ProductionLine[];
  icon?: string;
  autoAddProductLines: boolean;
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

    for (const productionLine of this.productionLines) {
      this._productionLineLookup[productionLine.part.slug] = productionLine;

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumpionRate: 0,
            productionRate: 0,
          };

          rate.consumpionRate += assemblyLine.rate * recipePart.quantity;
          this.rateLookup[recipePart.part.slug] = rate;
        }

        for (const recipePart of assemblyLine.recipe.products) {
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumpionRate: 0,
            productionRate: 0,
          };

          rate.productionRate += assemblyLine.rate * recipePart.quantity;
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
    return parts.filter((part) => this.rateLookup.hasOwnProperty(part.slug));
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
      return rate.consumpionRate - rate.productionRate > 0.0001;
    });
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

          productionRate += assemblyLine.rate * recipePart.quantity;
        }

        for (const recipePart of assemblyLine.recipe.products) {
          if (recipePart.part.slug !== part.slug) continue;
          productionRate -= assemblyLine.rate * recipePart.quantity;
        }
      }
    }

    return productionRate;
  }

  setPartRate(part: Part, productionRate: number, isAutoSet: boolean = false) {
    const productionLine = this._productionLineLookup[part.slug];
    const rateMultiplier = productionRate / productionLine.rate;

    for (const assemblyLine of productionLine.assemblyLines) {
      assemblyLine.rate *= rateMultiplier;
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
    if (!productionLine || !productionLine.autoCalculateRate) {
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

    /*
     * Calculates the rates for each recipe assuming all outputs (including byproducts) have been specified.
     *
     * 1. Each product for each recipe gets a variable to define its output rate
     * recycled plastic (plastic) = p1
     * recycled rubber (rubber) = r1
     * residual rubber (rubber) = r2
     * diluted fuel (fuel) = f1
     * fuel (fuel) = f2
     * fuel (polymer resin) = s1
     * heavy oil residue (heavy oil residue) = h1
     * heavy oil residue (polymer resin) = s2
     *
     * 2. Each part gets a variable which defines its production rate
     * plastic = p
     * rubber = r
     * fuel = f
     * polymer resin = s
     * water = w
     * heavy oil residue = h
     * crude oil = o
     *
     * 3. Each part gets an equation where its production rate equals the sum of its recipes
     * p = p1              |  0 = p1 - p
     * r = r1 + r2         |  0 = r1 + r2 - r
     * f = f1 + f2         |  0 = f1 + f2 - f
     * h = h1              |  0 = h1 - h
     * s = s1 + s2         |  0 = s1 + s2 - s
     *
     * 4. Each part that is a product of at least one recipe gets an equation which relates its production rate to the
     *    production rate of all products of recipes it is consumed in, with factory outputs getting a static value.
     *    NOTE: this forces the part to be balanced across the factory
     * p = 40 + 1/2r1      | 80 = 2p - r1
     * r = 1/2p1           |  0 = p1 - 2r
     * f = 1/2p1 + 1/2r1   |  0 = p1 + r1 - 2f
     * h = 1/2f1           |  0 = f1 - 2h
     * s = 2r2             |  0 = 2r2 - s
     *
     * 5. Each part that is not a product of at least one recipe (i.e. is an input) gets an equation for each output of
     *    any recipes it is included in, with each combination of outputs getting its own equation
     * w = 2r2 + f1        |  0 = 2r2 + f1 - w
     * o = 3/2f2 + 3/4h1   |  0 = 6f2 + 3h1 - 4o
     * o = 3/2f2 + 3/2s2   |  0 = 3f2 + 3s2 - 2o
     * o = 2s1 + 3/4h1     |  0 = 8s1 + 3h1 - 4o
     * o = 2s1 + 3/2s2     |  0 = 4s1 + 3s2 - 2o
     */

    // bugs/issues:
    // * aluminum ingots with petroleum coke, then plastic/rubber loop fails, but succeeds if plastic/rubber is specified before aluminum
    // * cannot handle parts used as inputs and outputs that have excess output. Could handle by removing general part variable(s)???

    const allParts = new Set<string>();
    const variables = new Set<string>();
    const equations: Equation[] = [];

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        const recipe = assemblyLine.recipe;
        for (const product of recipe.products) {
          const part = product.part;

          // create variable for each product of each recipe, formula {part-slug}_{recipe-slug} (step 1)
          const productVariable = `${part.slug}_${recipe.slug}`;
          if (variables.has(productVariable)) {
            throw new Error({
              statusCode: 500,
              message: `variable ${productVariable} already exists in variable set`,
            });
          }

          variables.add(productVariable);

          // add part variable for all products (step 2)
          variables.add(part.slug);
          allParts.add(part.slug);
        }

        for (const ingredient of recipe.ingredients) {
          // add part variable for all ingredients (step 2)
          variables.add(ingredient.part.slug);
          allParts.add(ingredient.part.slug);
        }
      }
    }

    // construct recipe lookups
    const recipeLookupByIngredient: { [partSlug: string]: Recipe[] } = {};
    const recipeLookupByProduct: { [partSlug: string]: Recipe[] } = {};
    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        for (const ingredient of assemblyLine.recipe.ingredients) {
          const partSlug = ingredient.part.slug;
          if (!recipeLookupByIngredient[partSlug]) {
            recipeLookupByIngredient[partSlug] = [];
          }
          recipeLookupByIngredient[partSlug].push(assemblyLine.recipe);
        }

        for (const product of assemblyLine.recipe.products) {
          const partSlug = product.part.slug;
          if (!recipeLookupByProduct[partSlug]) {
            recipeLookupByProduct[partSlug] = [];
          }
          recipeLookupByProduct[partSlug].push(assemblyLine.recipe);
        }
      }
    }

    // step 3: each part rate is the sum of its production rate in each recipe it is produced in
    for (const partSlug of allParts) {
      const recipes = recipeLookupByProduct[partSlug];
      if (!recipes) continue;

      const equation = new Equation();
      equation.setVariable(partSlug, -1);
      for (const recipe of recipes) {
        equation.setVariable(`${partSlug}_${recipe.slug}`, 1);
      }

      equations.push(equation);
    }

    // steps 4 and 5 are functionally the same
    for (const partSlug of allParts) {
      // create a permutation of all products across all recipes, one product per recipe
      const recipeEquations = calculateRecipeEquations(
        partSlug,
        recipeLookupByIngredient[partSlug],
      );

      // consider output rate for step 4
      if (this._productionLineLookup[partSlug]?.outputRate > 0) {
        for (const equation of recipeEquations) {
          equation.constant = -this._productionLineLookup[partSlug].outputRate;
        }
      }

      equations.push(...recipeEquations);
    }

    // preparation is complete, so ready, set, solve!
    const variableList: string[] = [];
    const variableLookup: { [variableName: string]: number } = {};
    for (const variable of variables) {
      const index = variableList.length;
      variableList.push(variable);
      variableLookup[variable] = index;
    }

    // console.log(variableList, equations);
    // console.log(JSON.stringify(equations, undefined, 2))

    const matrix = equations.map((e) => e.toArray(variableList));
    const constantsArray = equations.map((e) => e.constant);
    const solution = solve(matrix, constantsArray);

    // apply solution to factory. First set all recipe rates, then set production line rates from applicable recipes
    for (const variable of variables) {
      const newRate =
        Math.round(solution[variableLookup[variable]] * 10e6) / 10e6;
      // console.log(variable, newRate);

      if (variable.indexOf("_") >= 0) {
        // recipe product rate
        const [partSlug, recipeSlug] = variable.split("_");
        const possibleAssemblyLines = this._assemblyLineLookup[
          partSlug
        ]?.filter((al) => al.recipe.slug === recipeSlug);
        if (possibleAssemblyLines?.length > 0) {
          // if it's more than 1 it's a duplicate (water for recipes that consume and produce it)
          const assemblyLine = possibleAssemblyLines[0];
          const recipePart = assemblyLine.recipe.getProduct(partSlug);
          if (recipePart) {
            assemblyLine.rate = newRate / recipePart.quantity;
          } else {
            const message = `assembly line '${partSlug}'/'${recipeSlug}' did not have expected product '${partSlug}'`;
            console.error(message);
            throw new Error({ statusCode: 500, message: message });
          }
        } else {
          const message = `did not find assembly line for '${partSlug}'/'${recipeSlug}'`;
          console.error(message);
          throw new Error({ statusCode: 500, message: message });
        }
      }
    }

    for (const productionLine of this.productionLines) {
      var rate: number = 0;
      for (const assemblyLine of productionLine.assemblyLines) {
        rate +=
          assemblyLine.rate *
          (assemblyLine.recipe.getProduct(productionLine.part)?.quantity ?? 0);
      }

      productionLine.rate = rate;
    }

    this.update();
  }
}

class Equation {
  _variableLookup: { [variableName: string]: number };
  constant: number;

  constructor(constant: number = 0) {
    this._variableLookup = {};
    this.constant = constant;
  }

  setVariable(partSlug: string, coefficient: number) {
    this._variableLookup[partSlug] = coefficient;
  }

  getVariable(partSlug: string) {
    return this._variableLookup[partSlug] || 0;
  }

  toArray(variables: string[]) {
    return variables.map((v) => this.getVariable(v));
  }

  clone(): Equation {
    const clone = new Equation();
    for (const variable in this._variableLookup) {
      clone.setVariable(variable, this._variableLookup[variable]);
    }

    return clone;
  }
}

function calculateRecipeEquations(
  partSlug: string,
  recipes: Recipe[] | undefined,
  index: number = 0,
): Equation[] {
  var downstreamEquations: Equation[] = [];
  if (!recipes || recipes.length === index + 1) {
    downstreamEquations.push(new Equation());
    downstreamEquations[0].setVariable(partSlug, -1);

    if (!recipes) return downstreamEquations;
  } else {
    downstreamEquations = calculateRecipeEquations(
      partSlug,
      recipes,
      index + 1,
    );
  }

  const recipe = recipes[index];
  const ingredient = recipe.getIngredient(partSlug);
  if (!ingredient) {
    throw new Error({
      statusCode: 500,
      message: `did not find ingredient ${partSlug} in recipe ${recipe.slug} while calculating recipe equations`,
    });
  }

  const equations: Equation[] = [];

  for (const downstream of downstreamEquations) {
    for (const product of recipes[index].products) {
      const equation = downstream.clone();
      equation.setVariable(
        `${product.part.slug}_${recipe.slug}`,
        ingredient.quantity / product.quantity,
      );

      equations.push(equation);
    }
  }

  return equations;
}
