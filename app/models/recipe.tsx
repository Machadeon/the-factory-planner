import type Building from "./building";
import type Part from "./part";

export interface RecipePart {
  part: Part;
  quantity: number;
}

export interface RecipePartLookup {
  [partSlug: string]: number;
}

export default class Recipe {
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

  _ingredientLookup: { [partSlug: string]: RecipePart };
  _productLookup: { [partSlug: string]: RecipePart };

  constructor(
    name: string,
    className: string,
    slug: string,
    ingredients: RecipePart[],
    ingredientLookup: RecipePartLookup,
    products: RecipePart[],
    productLookup: RecipePartLookup,
    building: Building,
    processingTime: number,
    customPowerUsage: boolean,
  ) {
    this.name = name;
    this.className = className;
    this.slug = slug;
    this.ingredients = ingredients;
    this.ingredientLookup = ingredientLookup;
    this.products = products;
    this.productLookup = productLookup;
    this.building = building;
    this.processingTime = processingTime;
    this.customPowerUsage = customPowerUsage;

    this._ingredientLookup = {};
    for (const ingredient of ingredients) {
      this._ingredientLookup[ingredient.part.slug] = ingredient;
    }

    this._productLookup = {};
    for (const product of products) {
      this._productLookup[product.part.slug] = product;
    }
  }

  getIngredient(part: Part | string): RecipePart | undefined {
    if (typeof part === "string") {
      return this._ingredientLookup[part];
    } else {
      return this._ingredientLookup[part.slug];
    }
  }

  getProduct(part: Part | string): RecipePart | undefined {
    if (typeof part === "string") {
      return this._productLookup[part];
    } else {
      return this._productLookup[part.slug];
    }
  }
}
