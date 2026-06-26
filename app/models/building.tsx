export default interface Building {
  name: string;
  className: string;
  description: string;
  slug: string;
  iconSmall: string;
  iconLarge: string;
  basePowerUsage: number;
  maxSomersloops?: number;
  variablePowerUsage?: boolean;
  minPowerUsage?: number;
  maxPowerUsage?: number;
  itemInputs?: number;
  fluidInputs?: number;
  itemOutputs?: number;
  fluidOutputs?: number;
}
