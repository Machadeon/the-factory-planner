import type Building from "./building";
import type Part from "./part";

export interface RecipePart {
  part: Part;
  quantity: number;
}

export default interface Recipe {
  name: string;
  className: string;
  slug: string;
  ingredients: RecipePart[];
  products: RecipePart[];
  building: Building;
  processingTime: number;
  customPowerUsage: boolean;
  minPowerUsage?: number;
  maxPowerUsage?: number;
}
