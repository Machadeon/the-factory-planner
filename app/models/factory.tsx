import { solve } from "linear-solve";
import { parts, partSlugLookup } from "../models/library";
import type AssemblyLine from "./assembly-line";
import type Part from "./part";
import ProductionLine from "./production-line";
import type Recipe from "./recipe";

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
     * Calculates the rates for each recipe assuming all outputs have been specified.
     *
     * 1. Determine which parts need to be included in the calculation (i.e. determine which parts can be unbound). Only
     *    include parts that are: 1. a set factory output, or 2. are an intermediate part, i.e. are both produced and
     *    consumed by recipes.
     * plastic: factory output, intermediate part (produced in: recycled plastic; consumed in: recycled rubber)
     * rubber: intermediate part (produced in: recycled rubber, residual rubber; consumed in: recycled plastic)
     * fuel: intermediate part (produced in: diluted fuel, fuel; consumed in: recycled rubber, recycled plastic)
     * polymer resin: intermediate part (produced in: fuel, heavy oil residue; consumed in: residual rubber)
     * heavy oil residue: intermediate part (produced in: heavy oil residue; consumed in: diluted fuel)
     *
     * 2. Each included part gets a variable which defines its production rate
     * plastic = p
     * rubber = r
     * fuel = f
     * polymer resin = s
     * heavy oil residue = h
     *
     * 3. Each product for each recipe gets a variable to define its output rate
     * plastic (recycled plastic) = p1
     * rubber (recycled rubber) = r1
     * rubber (residual rubber) = r2
     * fuel (diluted fuel) = f1
     * fuel (fuel) = f2
     * polymer resin (fuel) = s1
     * heavy oil residue (heavy oil residue) = h1
     * polymer resin (heavy oil residue) = s2
     *
     * 4. Each part gets an equation where its production rate equals the sum of its recipes
     * p = p1              |  0 = p1 - p
     * r = r1 + r2         |  0 = r1 + r2 - r
     * f = f1 + f2         |  0 = f1 + f2 - f
     * h = h1              |  0 = h1 - h
     * s = s1 + s2         |  0 = s1 + s2 - s
     *
     * 5. Each recipe with more than one product gets an equation which relates the output rate of its products
     * 3f2 = 4s1           | 0 = 4s1 - 3f2
     * 2h1 = 4s2           | 0 = 4s2 - 2h1
     *
     * 6. Each intermediate part and factory output gets an equation which relates its production rate to the production
     *    rate of all parts it is used in producing. Factory outputs get a constant value in the equation.
     * p = 1/2r1 + 40      | 40 = 1/2r1 - p
     * r = 1/2p1           | 0 = 1/2p1 - r
     * f = 1/2p1 + 1/2r1   | 0 = 1/2p1 + 1/2r1 - f
     * h = 1/2f1           | 0 = 1/2f1 - h
     * s = 2r2             | 0 = r2r - s
     *
     * 7. IF there are fewer equations than variables, then look for production lines that have more than one recipe.
     *    Create a new equation for each production line with more than one recipe that relates the relative production
     *    rates of each recipe
     * f1 = f2             | 0 = f2 - f1
     */

    // bugs/issues:
    // * aluminum ingots with petroleum coke, then plastic/rubber loop fails, but succeeds if plastic/rubber is specified before aluminum
    // * cannot handle parts used as inputs and outputs that have excess output. Could handle by removing general part variable(s)???

    const recipeOutputs = new Set<Part>();
    const recipeInputs = new Set<Part>();
    const factoryOutputs = new Set<Part>();
    const allRecipes = new Set<Recipe>();
    const variables = new Set<string>();
    const equations: Equation[] = [];
    const recipeLookupByIngredient: { [partSlug: string]: Recipe[] } = {};
    const recipeLookupByProduct: { [partSlug: string]: Recipe[] } = {};

    // step 1: determine included parts
    for (const productionLine of this.productionLines) {
      if (productionLine.outputRate > 0) {
        factoryOutputs.add(productionLine.part);
      }

      for (const assemblyLine of productionLine.assemblyLines) {
        allRecipes.add(assemblyLine.recipe);
        for (const ingredient of assemblyLine.recipe.ingredients) {
          recipeInputs.add(ingredient.part);

          // construct recipe lookups
          if (!recipeLookupByIngredient[ingredient.part.slug]) {
            recipeLookupByIngredient[ingredient.part.slug] = [];
          }
          recipeLookupByIngredient[ingredient.part.slug].push(assemblyLine.recipe);
        }

        for (const product of assemblyLine.recipe.products) {
          recipeOutputs.add(product.part);

          // construct recipe lookups
          if (!recipeLookupByProduct[product.part.slug]) {
            recipeLookupByProduct[product.part.slug] = [];
          }
          recipeLookupByProduct[product.part.slug].push(assemblyLine.recipe);
        }
      }
    }

    const intermediateParts = recipeOutputs.intersection(recipeInputs);
    const allParts = intermediateParts.union(factoryOutputs);

    // remove allowable byproducts (really just water)
    intermediateParts.delete(partSlugLookup["water"]);
    allParts.delete(partSlugLookup["water"]);

    console.log([...intermediateParts], [...factoryOutputs]);

    // 2. Each included part gets a variable which defines its production rate
    for (const part of allParts) {
      variables.add(part.slug);
    }

    // 3. Each product for each recipe gets a variable to define its output rate
    for (const recipe of allRecipes) {
      for (const product of recipe.products) {
        variables.add(`${product.part.slug}_${recipe.slug}`);
      }

      // 5. Each recipe with more than one product gets an equation which relates the output rate of its products
      if (recipe.products.length < 2) continue;

      const equation = new Equation();
      const product1 = recipe.products[0];
      const product2 = recipe.products[1];

      // skip if we don't care about one of the products
      if (!allParts.has(product1.part) || !allParts.has(product2.part)) continue;

      equation.setVariable(`${product1.part.slug}_${recipe.slug}`, product2.quantity);
      equation.setVariable(`${product2.part.slug}_${recipe.slug}`, -product1.quantity);
      equations.push(equation);
    }

    // 4. Each part gets an equation where its production rate equals the sum of its recipes
    for (const part of allParts) {
      const recipes = recipeLookupByProduct[part.slug];
      if (!recipes?.length) continue;

      const equation = new Equation();
      equation.setVariable(part.slug, -1);
      for (const recipe of recipes) {
        equation.setVariable(`${part.slug}_${recipe.slug}`, 1);
      }

      equations.push(equation);
    }

    /*
     * 6. Each intermediate part and factory output gets an equation which relates its production rate to the production
     *    rate of all parts it is used in producing. Factory outputs get a constant value in the equation.
     * p = 1/2r1 + 40      | 40 = p - 1/2r1
     * r = 1/2p1           | 0 = r - 1/2p1
     * f = 1/2p1 + 1/2r1   | 0 = f - 1/2p1 - 1/2r1
     * h = 1/2f1           | 0 = h - 1/2f1
     * s = 2r2             | 0 = s - r2r
     */
    for (const part of allParts) {
      const equation = new Equation();
      equation.setVariable(part.slug, 1);
      if (factoryOutputs.has(part)) {
        equation.constant = this._productionLineLookup[part.slug].outputRate;
      }

      if (intermediateParts.has(part)) {
        for (const recipe of recipeLookupByIngredient[part.slug] ?? []) {
          const ingredient = recipe.getIngredient(part);
          if (!ingredient) {
            throw new Error(`recipe '${recipe.slug}' did not have expected ingredient '${part.slug}'`);
          }
          const product = recipe.products[0];
          equation.setVariable(`${product.part.slug}_${recipe.slug}`, -ingredient.quantity / product.quantity);
        }
      }

      equations.push(equation);
    }

    /*
     * 7. IF there are fewer equations than variables, then look for production lines that have more than one recipe.
     *    Create a new equation for each production line with more than one recipe that relates the relative production
     *    rates of each recipe
    */

    if (equations.length < variables.size) {
      console.warn("automatically setting recipe ratios");
      for (const productionLine of this.productionLines) {
        if (productionLine.assemblyLines.length < 2) continue;

        const part = productionLine.part;
        console.warn("setting recipe ratio for production line", part.slug);

        for (var i = 0; i + 1 < productionLine.assemblyLines.length; i++) {
          const assemblyLine1 = productionLine.assemblyLines[i];
          const assemblyLine2 = productionLine.assemblyLines[i + 1];

          const product1 = assemblyLine1.recipe.getProduct(part);
          const product2 = assemblyLine2.recipe.getProduct(part);

          if (!product1) {
            throw new Error(`assembly line recipe '${assemblyLine1.recipe.slug}' did not have a product that matched its production line part '${part.slug}'`)
          }

          if (!product2) {
            throw new Error(`assembly line recipe '${assemblyLine2.recipe.slug}' did not have a product that matched its production line part '${part.slug}'`)
          }

          const rate1 = assemblyLine1.rate * product1.quantity;
          const rate2 = assemblyLine2.rate * product2.quantity;

          const equation = new Equation();
          equation.setVariable(`${part.slug}_${assemblyLine1.recipe.slug}`, rate2);
          equation.setVariable(`${part.slug}_${assemblyLine2.recipe.slug}`, -rate1);
          equations.push(equation);
        }

        if (equations.length >= variables.size) break;
      }
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
            throw new Error(message);
          }
        } else {
          const message = `did not find assembly line for '${partSlug}'/'${recipeSlug}'`;
          console.error(message);
          throw new Error(message);
        }
      }
    }

    var rate: number;
    for (const productionLine of this.productionLines) {
      rate = 0;
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
