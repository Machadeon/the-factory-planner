import type AssemblyLine from "./assembly-line";
import { recipeLookup } from "./library";
import type Part from "./part";

export default class ProductionLine {
  part: Part;

  /**
   * The rate at which the part made in this production line is produced, in items per minute or cubic meters per minute
   */
  rate: number;
  autoCalculateRate: boolean;
  autoCreated: boolean;
  assemblyLines: AssemblyLine[];

  constructor(
    part: Part,
    autoCalculateRate: boolean,
    productionRate: number,
    autoCreated: boolean,
  ) {
    this.part = part;
    this.rate = productionRate;
    this.autoCalculateRate = autoCalculateRate;
    this.autoCreated = autoCreated;
    this.assemblyLines = [];

    const recipes = recipeLookup[part.slug];
    if (recipes.length === 1) {
      this.assemblyLines.push({
        part: part,
        recipe: recipes[0],
        rate: productionRate / recipes[0].productLookup[part.slug],
      });
    }
  }
}
