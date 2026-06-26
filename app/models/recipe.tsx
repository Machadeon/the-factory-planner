import type Building from "./building";
import type Part from "./part";

export interface RecipePart {
  part: Part;
  quantity: number;
}

export interface RecipePartLookup {
  [partSlug: string]: number;
}

export default interface Recipe {
  name: string;
  className: string;
  slug: string;
  ingredients: RecipePart[];
  ingredientLookup: RecipePartLookup;
  products: RecipePart[];
  productLookup: RecipePartLookup;
  building: Building;
  processingTime: number;
  customPowerUsage: boolean;
  minPowerUsage?: number;
  maxPowerUsage?: number;
}
