import type Part from "./part";
import type ProductLine from "./product-line";
import type Recipe from "./recipe";

export default class Factory {
  products: ProductLine[];
  icon?: string;
  setState: () => void;

  constructor() {
    this.products = [];
    this.setState = () => {};
  }

  /**
   * Recalculates all production line rates based on the updated production rate of the given recipe.
   */
  recalculate(part: Part, recipe: Recipe, productionRate: number) {
    // TODO Recalculate all production line rates
    this.setState();
  }
}
