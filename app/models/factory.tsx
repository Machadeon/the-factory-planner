import type Part from "./part";
import ProductionLine from "./production-line";
import { parts } from "../models/library";

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

  constructor(oldFactory?: Factory) {
    this.productionLines = oldFactory?.productionLines || [];
    this.icon = oldFactory?.icon;
    this.update = oldFactory?.update || (() => {});
    this.autoAddProductLines = oldFactory?.autoAddProductLines || false;

    this.rateLookup = {};

    this._productionLineLookup = {};
    for (const productionLine of this.productionLines) {
      this._productionLineLookup[productionLine.part.slug] = productionLine;
    }

    this._updateRates();
  }

  _updateRates() {
    this.rateLookup = {};

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          const rate = this.rateLookup[recipePart.part.slug] || {
            consumpionRate: 0,
            productionRate: 0,
          };

          rate.consumpionRate += assemblyLine.rate * recipePart.quantity;
          this.rateLookup[recipePart.part.slug] = rate;
        }

        for (const recipePart of assemblyLine.recipe.products) {
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
        if (assemblyLine.recipe.slug === "recipe-alternate-plastic-1-c") hasRecycledPlasticRecipe = true;
        if (assemblyLine.recipe.slug === "recipe-alternate-recycledrubber-c") hasRecycledRubberRecipe = true;
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
      return rate.productionRate > rate.consumpionRate;
    });
  }

  allInputs(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      return rate.productionRate < rate.consumpionRate;
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
    const productionRate = this.getPartDemand(part) || 10;

    const newProductionLine = new ProductionLine(
      part,
      this.productionLines.length > 0, // autoCalculateRate by default if this is not the first product
      productionRate,
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

    if ((part.slug === "rubber" || part.slug === "plastic") && this._hasRecycledRubberPlasticLoop()) {
      console.log("Handling recycled rubber and plastic loop is not yet implemented");
      return;
    }

    const productionRate = this.getPartDemand(part);
    if (productionLine.autoCreated && productionRate === 0) {
      this.removeProductionLine(part);
    } else {
      this.setPartRate(part, productionRate, true);
    }
  }
}
