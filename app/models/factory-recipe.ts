import type Factory from "./factory";
import { partSlugLookup } from "./library";
import type Part from "./part";
import type { RecipePart } from "./recipe";
import type { RecipeLike } from "./recipe-like";

export default class FactoryRecipe implements RecipeLike {
  readonly isFactoryRecipe = true as const;
  readonly slug: string;
  readonly name: string;
  readonly icon?: string;
  readonly ingredients: RecipePart[];
  readonly products: RecipePart[];
  private readonly _ingredientLookup: Record<string, RecipePart> = {};
  private readonly _productLookup: Record<string, RecipePart> = {};

  constructor(factoryId: string, factoryName: string, factory: Factory) {
    this.slug = `factory:${factoryId}`;
    this.name = factoryName;
    this.icon = factory.icon;
    const ingList: RecipePart[] = [];
    const prodList: RecipePart[] = [];

    for (const [partSlug, rate] of Object.entries(factory.rateLookup)) {
      const part = partSlugLookup[partSlug];
      if (!part) continue;
      // note: consumpionRate typo is intentional — matches existing Rate interface
      const netOut = rate.productionRate - rate.consumpionRate;
      if (netOut > 0.0001) {
        const rp: RecipePart = { part, quantity: netOut };
        prodList.push(rp);
        this._productLookup[partSlug] = rp;
      } else if (netOut < -0.0001) {
        const rp: RecipePart = { part, quantity: -netOut };
        ingList.push(rp);
        this._ingredientLookup[partSlug] = rp;
      }
    }
    this.ingredients = ingList;
    this.products = prodList;
  }

  getIngredient(part: Part | string): RecipePart | undefined {
    return this._ingredientLookup[typeof part === "string" ? part : part.slug];
  }

  getProduct(part: Part | string): RecipePart | undefined {
    return this._productLookup[typeof part === "string" ? part : part.slug];
  }
}
