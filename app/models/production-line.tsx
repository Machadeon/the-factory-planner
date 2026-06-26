import AssemblyLine from "./assembly-line";
import { recipeLookup } from "./library";
import type Part from "./part";

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
    this.assemblyLines = [];

    const recipes = recipeLookup[part.slug];
    if (recipes.length === 1) {
      this.assemblyLines.push(new AssemblyLine(
        recipes[0],
        productionRate / recipes[0].productLookup[part.slug],
        false,
      ));
    }
  }

  getAssemblyLine(recipeSlug: string): AssemblyLine | undefined {
    for (const assemblyLine of this.assemblyLines) {
      if (assemblyLine.recipe.slug === recipeSlug) return assemblyLine;
    }
  }
}
