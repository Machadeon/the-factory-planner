import { RATE_EPSILON } from "./game-data/constants";
import type Part from "./part";
import type Recipe from "./recipe";
import type { RecipeLike } from "./recipe-like";

export function shardsForClock(clock: number): number {
  return Math.max(0, Math.ceil((clock - 100) / 50));
}

export type MachineCount =
  | { fullMachines: number; remainderClock: number }
  | { machineCount: number; uniformClock: number };

export function totalMachines(count: MachineCount): number {
  if ("fullMachines" in count) {
    return count.fullMachines + (count.remainderClock > 0 ? 1 : 0);
  }
  return count.machineCount;
}

/** Default routing space (metres) between machine rows in the graph view. */
export const DEFAULT_ROW_SPACING = 8;

export default class AssemblyLine {
  /**
   * Stable unique id, used as the graph-view node key (recipe slug is not unique
   * across the factory when two lines share a recipe).
   */
  readonly id: string;

  /**
   * Machine rows the bank occupies in the graph view. 0 = auto (the graph picks a
   * row count that makes the node roughly 16:9); a positive value is a user override
   * (clamped to 1..machineCount). Affects only the node's rendered footprint shape.
   */
  rows: number;

  /**
   * Routing space, in metres, left between adjacent machine rows in the graph view so
   * belts/pipes for inputs and outputs can be drawn. Defaults to {@link DEFAULT_ROW_SPACING};
   * a per-line override lets dense banks claim more room. Affects only the rendered
   * footprint, never throughput.
   */
  rowSpacing: number;

  /**
   * The {@link RecipeLike} used in this assembly line.
   */
  readonly recipe: RecipeLike;

  /**
   * The number of times the recipe completes per minute (or factory instances for FactoryRecipe).
   */
  rate: number;

  /**
   * Number of Somersloop slots currently filled (0 = no slooping).
   */
  sloopedSlots: number;

  /**
   * Clock speed percentage for the machine bank (100–250).
   */
  machineSpeed: number;

  /**
   * Power shards inserted per machine (0–3). Each shard raises the max clock by 50%.
   */
  powerShards: number;

  /**
   * Whether a fractional remainder machine is allowed to cover leftover throughput.
   */
  allowRemainder: boolean;

  /**
   * Whether this recipe choice was auto-suggested by the recipe optimizer. Tracked
   * independently of the production line's autoCreated flag so a suggested
   * recipe on an otherwise-permanent line can be accepted/rejected on its own.
   */
  autoCreated: boolean;

  constructor(
    recipe: RecipeLike,
    rate: number,
    sloopedSlots: number,
    machineSpeed: number,
    powerShards: number,
    allowRemainder: boolean,
    autoCreated = false,
    id: string = crypto.randomUUID(),
    rows = 0,
    rowSpacing = DEFAULT_ROW_SPACING,
  ) {
    this.recipe = recipe;
    this.rate = rate;
    this.sloopedSlots = sloopedSlots;
    this.machineSpeed = machineSpeed;
    this.powerShards = powerShards;
    this.allowRemainder = allowRemainder;
    this.autoCreated = autoCreated;
    this.id = id;
    this.rows = Math.max(0, Math.floor(rows));
    this.rowSpacing = Math.max(0, rowSpacing);
  }

  maxSloopSlots(): number {
    if (this.recipe.isFactoryRecipe) return 0;
    return (this.recipe as Recipe).building.somersloopSlots ?? 0;
  }

  getSloopMultiplier(): number {
    const max = this.maxSloopSlots();
    if (max === 0 || this.sloopedSlots === 0) return 1;
    return 1 + this.sloopedSlots / max;
  }

  isSlooped(): boolean {
    return this.sloopedSlots > 0;
  }

  setSloopedSlots(n: number) {
    if (this.recipe.isFactoryRecipe) return;
    const oldMult = this.getSloopMultiplier();
    const wasZero = this.sloopedSlots === 0;
    this.sloopedSlots = Math.max(0, Math.min(n, this.maxSloopSlots()));
    const newMult = this.getSloopMultiplier();
    this.rate = (this.rate * oldMult) / newMult;
    if (wasZero && this.sloopedSlots > 0) {
      this.machineSpeed = this.maxMachineSpeed();
      this.powerShards = 3;
    }
  }

  getPartConsumptionRate(part: Part | string): number {
    for (const ingredient of this.recipe.ingredients) {
      if (ingredient.part !== part && ingredient.part.slug !== part) continue;

      return this.rate * ingredient.quantity;
    }

    return 0;
  }

  getPartProductionRate(part: Part | string): number {
    for (const product of this.recipe.products) {
      if (product.part !== part && product.part.slug !== part) continue;

      return this.rate * product.quantity * this.getSloopMultiplier();
    }

    return 0;
  }

  setPartConsumptionRate(part: Part | string, rate: number) {
    for (const ingredient of this.recipe.ingredients) {
      if (ingredient.part !== part && ingredient.part.slug !== part) continue;

      this.rate = rate / ingredient.quantity;
    }
  }

  setPartProductionRate(part: Part | string, rate: number) {
    for (const product of this.recipe.products) {
      if (product.part !== part && product.part.slug !== part) continue;

      this.rate = rate / product.quantity / this.getSloopMultiplier();
    }
  }

  maxMachineSpeed(): number {
    return 100 + 50 * this.powerShards;
  }

  getMachineCount(): MachineCount {
    if (this.recipe.isFactoryRecipe) {
      return { fullMachines: 0, remainderClock: 0 };
    }
    const baseRate = 60 / (this.recipe as Recipe).processingTime;
    const perMachine = baseRate * (this.machineSpeed / 100);

    if (this.allowRemainder) {
      const fullMachines = Math.floor(this.rate / perMachine);
      const leftover = this.rate - fullMachines * perMachine;
      const remainderClock =
        leftover > RATE_EPSILON ? (leftover / baseRate) * 100 : 0;
      return { fullMachines, remainderClock };
    }

    const machineCount = Math.ceil(this.rate / perMachine);
    const uniformClock =
      machineCount > 0
        ? (this.rate / (machineCount * baseRate)) * 100
        : this.machineSpeed;
    return { machineCount, uniformClock };
  }

  getTotalShards(): number {
    const count = this.getMachineCount();
    if ("fullMachines" in count) {
      return (
        count.fullMachines * this.powerShards +
        shardsForClock(count.remainderClock)
      );
    }
    return count.machineCount * this.powerShards;
  }

  getPowerConsumption(): { avg: number; min: number; max: number } {
    if (this.recipe.isFactoryRecipe) {
      const fr = this.recipe as unknown as {
        avgPowerPerInstance: number;
        minPowerPerInstance: number;
        maxPowerPerInstance: number;
      };
      return {
        avg: this.rate * fr.avgPowerPerInstance,
        min: this.rate * fr.minPowerPerInstance,
        max: this.rate * fr.maxPowerPerInstance,
      };
    }
    const recipe = this.recipe as Recipe;
    const maxSloops = this.maxSloopSlots();
    const sloopFactor =
      maxSloops > 0 ? (1 + this.sloopedSlots / maxSloops) ** 2 : 1;
    const count = this.getMachineCount();
    const calcPower = (basePower: number): number => {
      if ("fullMachines" in count) {
        const bankPower =
          count.fullMachines > 0
            ? count.fullMachines *
              basePower *
              sloopFactor *
              (this.machineSpeed / 100) ** 1.321928
            : 0;
        const remPower =
          count.remainderClock > 0
            ? basePower * sloopFactor * (count.remainderClock / 100) ** 1.321928
            : 0;
        return bankPower + remPower;
      }
      return (
        count.machineCount *
        basePower *
        sloopFactor *
        (count.uniformClock / 100) ** 1.321928
      );
    };
    // Some recipes specify custom power usage even though their buildings don't support it.
    // Buildings that support custom/variable power usage all have basePowerUsage === 0
    if (recipe.customPowerUsage && recipe.building.basePowerUsage === 0) {
      const minBase = recipe.minPowerUsage ?? 0;
      const maxBase = recipe.maxPowerUsage ?? 0;
      return {
        avg: calcPower((minBase + maxBase) / 2),
        min: calcPower(minBase),
        max: calcPower(maxBase),
      };
    }
    const p = calcPower(recipe.building.basePowerUsage);
    return { avg: p, min: p, max: p };
  }
}
