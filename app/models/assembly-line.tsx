import type Part from "./part";
import type Recipe from "./recipe";

export default interface AssemblyLine {
  /**
   * The part which is the main product of this assembly line.
   */
  part: Part;

  /**
   * The number of times the recipe completes per minute.
   */
  rate: number;

  /**
   * The recipe used in this assembly line.
   */
  recipe: Recipe;
}
