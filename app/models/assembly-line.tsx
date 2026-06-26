import type Part from "./part";
import type Recipe from "./recipe";

export default class AssemblyLine {
  /**
   * The {@link Recipe} used in this assembly line.
   */
  readonly recipe: Recipe;

  /**
   * The number of times the recipe completes per minute.
   */
  rate: number;

  /**
   * Whether this recipe uses Somersloops.
   */
  private slooped: boolean;

  constructor(recipe: Recipe, rate: number, slooped: boolean) {
    this.recipe = recipe;
    this.rate = rate;
    this.slooped = slooped;
  }

  getPartConsumptionRate(part: Part | string): number {
    for (const ingredient of this.recipe.ingredients) {
      if (ingredient.part !== part && ingredient.part.slug !== part) continue;

      return this.rate * ingredient.quantity;
    }

    return 0;
  }

  getPartProductionRate(part: Part | string): number {
    for (const product of this.recipe.products) {
      if (product.part !== part && product.part.slug !== part) continue;

      const baseRate = this.rate * product.quantity;
      if (this.slooped) return baseRate * 2;
      else return baseRate;
    }

    return 0;
  }

  setPartConsumptionRate(part: Part | string, rate: number) {
    for (const ingredient of this.recipe.ingredients) {
      if (ingredient.part !== part && ingredient.part.slug !== part) continue;

      this.rate = rate / ingredient.quantity;
    }
  }

  setPartProductionRate(part: Part | string, rate: number) {
    for (const product of this.recipe.products) {
      if (product.part !== part && product.part.slug !== part) continue;

      const baseRate = rate / product.quantity;
      if (this.slooped) this.rate = baseRate / 2;
      else this.rate = baseRate;
    }
  }

  isSlooped(): boolean {
    return this.slooped;
  }

  setSlooped(slooped: boolean) {
    if (slooped === this.slooped) return;

    if (slooped) {
      this.slooped = true;
      this.rate /= 2;
    } else {
      this.slooped = false;
      this.rate *= 2;
    }
  }
}
