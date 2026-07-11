import type AssemblyLine from "./assembly-line";
import type Part from "./part";
import type Recipe from "./recipe";

export default class ProductionLine {
  /**
   * The {@link Part} that is produced in this production line
   */
  part: Part;

  /**
   * The rate at which this production line produces the part in items per minute or cubic meters per minute
   */
  rate: number;

  /**
   * The rate at which the user has requested this part be produced at as a factory output
   */
  outputRate: number;

  /**
   * Whether the production rate should be automatically calculated as other production lines are edited
   */
  autoCalculateRate: boolean;

  /**
   * Whether this production line was automatically created
   */
  autoCreated: boolean;

  /**
   * When true, the LP solver maximizes this part's output instead of targeting a fixed outputRate.
   */
  maximizeOutput: boolean;

  /**
   * The individual {@link AssemblyLine}s that make up this production line. The output of all assembly lines sum to the
   * output of this production line.
   */
  assemblyLines: AssemblyLine[];

  constructor(
    part: Part,
    productionRate: number,
    factoryOutputRate: number,
    autoCalculateRate: boolean,
    autoCreated: boolean,
  ) {
    this.part = part;
    this.rate = productionRate;
    this.outputRate = factoryOutputRate;
    this.autoCalculateRate = autoCalculateRate;
    this.autoCreated = autoCreated;
    this.maximizeOutput = false;
    this.assemblyLines = [];
  }

  /**
   * The per-instance production rate a new assembly line for {@link recipe} would
   * need to close the gap between the target {@link rate} and the current summed
   * output of the existing assembly lines. Precondition: {@link recipe} produces
   * this line's part, so `recipe.productLookup[part.slug]` is defined and non-zero.
   */
  recipeInstanceRate(recipe: Recipe): number {
    const actualProductionRate = this.assemblyLines.reduce(
      (acc, assemblyLine) =>
        acc + assemblyLine.getPartProductionRate(this.part),
      0,
    );
    return (
      (this.rate - actualProductionRate) / recipe.productLookup[this.part.slug]
    );
  }

  /**
   * Rescale every assembly line's rate by `n / (n + 1)` (n = current line count),
   * making room for one additional recipe while preserving the total.
   */
  splitRecipeRates(): void {
    const n = this.assemblyLines.length;
    const ratio = n / (n + 1);
    for (const assemblyLine of this.assemblyLines) {
      assemblyLine.rate *= ratio;
    }
  }
}
