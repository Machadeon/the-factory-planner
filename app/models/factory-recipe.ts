import { totalMachines } from "./assembly-line";
import type Factory from "./factory";
import { partSlugLookup, RATE_EPSILON } from "./game-data";
import type Part from "./part";
import type Recipe from "./recipe";
import type { RecipePart } from "./recipe";
import type { RecipeLike } from "./recipe-like";

/**
 * Total machine floor area (m²) of a factory: footprint × machine count summed over
 * every assembly line, recursing into nested factory-recipe lines (× their integer
 * instance count). Depth-capped as a defensive guard; the in-memory factory graph is
 * already acyclic (deserialize stubs cycles).
 */
function factoryFloorArea(factory: Factory, depth = 0): number {
  if (depth > 32) return 0;
  let area = 0;
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      if (al.recipe.isFactoryRecipe) {
        const nested = (al.recipe as unknown as FactoryRecipe)
          .footprintAreaPerInstance;
        area += al.rate * (nested ?? 0);
        continue;
      }
      const building = (al.recipe as Recipe).building;
      if (!building?.size) continue;
      const machines = totalMachines(al.getMachineCount());
      area += machines * building.size.width * building.size.length;
    }
  }
  return area;
}

export function factoryRecipeSlug(factoryId: string): string {
  return `factory:${factoryId}`;
}

/** Extracts the factory id from a factory-recipe slug; non-prefixed input passes through. */
export function factoryRecipeId(slug: string): string {
  return slug.startsWith("factory:") ? slug.slice("factory:".length) : slug;
}

export default class FactoryRecipe implements RecipeLike {
  readonly isFactoryRecipe = true as const;
  readonly slug: string;
  readonly name: string;
  readonly icon?: string;
  readonly ingredients: RecipePart[];
  readonly products: RecipePart[];
  avgPowerPerInstance = 0;
  minPowerPerInstance = 0;
  maxPowerPerInstance = 0;
  shardsPerInstance = 0;
  sloopsPerInstance = 0;
  /** Total machine floor area (m²) of one instance of the nested factory. */
  footprintAreaPerInstance = 0;
  private readonly _ingredientLookup: Record<string, RecipePart> = {};
  private readonly _productLookup: Record<string, RecipePart> = {};

  constructor(factoryId: string, factoryName: string, factory: Factory) {
    this.slug = factoryRecipeSlug(factoryId);
    this.name = factoryName;
    this.icon = factory.icon;
    const ingList: RecipePart[] = [];
    const prodList: RecipePart[] = [];

    for (const [partSlug, rate] of Object.entries(factory.rateLookup)) {
      const part = partSlugLookup[partSlug];
      if (!part) continue;
      const netOut = rate.productionRate - rate.consumptionRate;
      if (netOut > RATE_EPSILON) {
        const rp: RecipePart = { part, quantity: netOut };
        prodList.push(rp);
        this._productLookup[partSlug] = rp;
      } else if (netOut < -RATE_EPSILON) {
        const rp: RecipePart = { part, quantity: -netOut };
        ingList.push(rp);
        this._ingredientLookup[partSlug] = rp;
      }
    }
    this.ingredients = ingList;
    this.products = prodList;

    const totalPower = factory.getTotalPower();
    this.avgPowerPerInstance = totalPower.avg;
    this.minPowerPerInstance = totalPower.min;
    this.maxPowerPerInstance = totalPower.max;
    this.shardsPerInstance = factory.getTotalShards();
    this.sloopsPerInstance = factory.getTotalSloops();
    this.footprintAreaPerInstance = factoryFloorArea(factory);
  }

  getIngredient(part: Part | string): RecipePart | undefined {
    return this._ingredientLookup[typeof part === "string" ? part : part.slug];
  }

  getProduct(part: Part | string): RecipePart | undefined {
    return this._productLookup[typeof part === "string" ? part : part.slug];
  }
}
