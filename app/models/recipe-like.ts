import type Part from "./part";
import type { RecipePart } from "./recipe";

export interface RecipeLike {
  readonly slug: string;
  readonly name: string;
  readonly ingredients: RecipePart[];
  readonly products: RecipePart[];
  readonly isFactoryRecipe: boolean;
  getIngredient(part: Part | string): RecipePart | undefined;
  getProduct(part: Part | string): RecipePart | undefined;
}
