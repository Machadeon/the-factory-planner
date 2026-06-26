export default interface Building {
  name: string;
  className: string;
  description: string;
  slug: string;
  iconSmall: string;
  iconLarge: string;
  basePowerUsage: number;
  somersloopSlots: number;
  unlockPhase: number;
  menuGroup: BuildingCategory;
  menuGroupIndex: number;
}

export type BuildingCategory = "factory" | "smelter" | "refinery" | "generator";
