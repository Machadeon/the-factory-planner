import type Part from "./part";
import type Recipe from "./recipe";

export default interface AssemblyLine {
  part: Part;
  productionRate: number;
  recipe: Recipe;
}
