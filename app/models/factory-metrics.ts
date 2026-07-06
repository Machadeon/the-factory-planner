import { totalMachines } from "./assembly-line";
import type Factory from "./factory";
import { RATE_EPSILON } from "./game-data";
import type Part from "./part";
import type Recipe from "./recipe";

export function getTotalPower(factory: Factory): {
  avg: number;
  min: number;
  max: number;
} {
  let avg = 0;
  let min = 0;
  let max = 0;
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      const p = al.getPowerConsumption();
      avg += p.avg;
      min += p.min;
      max += p.max;
    }
  }
  return { avg, min, max };
}

export function getTotalShards(factory: Factory): number {
  let total = 0;
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      if (al.recipe.isFactoryRecipe) {
        total +=
          al.rate *
          (al.recipe as unknown as { shardsPerInstance: number })
            .shardsPerInstance;
      } else {
        total += al.getTotalShards();
      }
    }
  }
  return total;
}

export function getTotalSloops(factory: Factory): number {
  let total = 0;
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      if (al.recipe.isFactoryRecipe) {
        total +=
          al.rate *
          (al.recipe as unknown as { sloopsPerInstance: number })
            .sloopsPerInstance;
      } else {
        const machines = totalMachines(al.getMachineCount());
        total += al.sloopedSlots * machines;
      }
    }
  }
  return total;
}

/**
 * Total machine floor area (m²) of a factory: footprint × machine count summed
 * over every assembly line. Nested factory-recipe lines contribute via their
 * precomputed per-instance area — no recursion happens here.
 */
export function factoryFloorArea(factory: Factory): number {
  let area = 0;
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      if (al.recipe.isFactoryRecipe) {
        const nested = (
          al.recipe as unknown as { footprintAreaPerInstance: number }
        ).footprintAreaPerInstance;
        area += al.rate * (nested ?? 0);
        continue;
      }
      const building = (al.recipe as Recipe).building;
      if (!building?.size) continue;
      const machines = totalMachines(al.getMachineCount());
      area += machines * building.size.width * building.size.length;
    }
  }
  return area;
}

/**
 * Outputs available from a source factory, paired with their net rate.
 *
 * Signature intentionally takes the source factory so a later version can
 * return outputs net of what other factories already pull from it. v1 returns
 * the source factory's own net production.
 */
export function availableOutputsFrom(
  source: Factory,
): { part: Part; rate: number }[] {
  return source
    .getOutputInfo()
    .map((o) => ({
      part: o.part,
      rate: o.rate.productionRate - o.rate.consumptionRate,
    }))
    .filter((o) => o.rate > RATE_EPSILON);
}
