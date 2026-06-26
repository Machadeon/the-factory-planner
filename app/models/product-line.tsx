import type AssemblyLine from "./assembly-line";
import type Part from "./part";

export default interface ProductLine {
  part: Part;
  isFactoryOutput: boolean;
  productionRate: number;
  assemblyLines: AssemblyLine[];
}
