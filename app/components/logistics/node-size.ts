import type AssemblyLine from "../../models/assembly-line";
import type Recipe from "../../models/recipe";
import { MIN_BODY_H, MIN_BODY_W, SCALE } from "./constants";
import type { GraphNode } from "./graph-model";

// Port icons overhang the body border (~half of a 30px icon) on each side.
const PORT_OVERHANG = 22;
// Vertical room each port needs so stacked ports don't collide.
const PORT_H = 34;
// Header = building icon + recipe name + stats row.
const HEADER_H = 74;
const ROWS_ROW_H = 26;

export function machineCountOf(al: AssemblyLine): number {
  const count = al.getMachineCount();
  return "fullMachines" in count
    ? count.fullMachines + (count.remainderClock > 0 ? 1 : 0)
    : count.machineCount;
}

/**
 * Effective machine-row count for the graph. A positive `rows` is the user override
 * (clamped); 0 means auto — pick the rows that make the body closest to 16:9.
 */
export function effectiveRows(al: AssemblyLine): number {
  if (al.recipe.isFactoryRecipe) return 1;
  const machines = Math.max(1, machineCountOf(al));
  if (al.rows > 0) return Math.min(al.rows, machines);
  const { width, length } = (al.recipe as Recipe).building.size;
  // body aspect = (ceil(M/rows)*width) / (rows*length) ≈ 16/9
  // ⇒ rows ≈ sqrt(M * width * 9 / (16 * length))
  const r = Math.round(Math.sqrt((machines * width * 9) / (16 * length)));
  return Math.max(1, Math.min(machines, r || 1));
}

/** Pixel size of an assembly-line node's hatched body (footprint × machines). */
export function assemblyBodySize(al: AssemblyLine): {
  width: number;
  height: number;
} {
  if (al.recipe.isFactoryRecipe) {
    const area =
      (al.recipe as unknown as { footprintAreaPerInstance: number })
        .footprintAreaPerInstance * Math.max(1, al.rate);
    const side = Math.sqrt(Math.max(1, area)) * SCALE;
    return {
      width: Math.max(MIN_BODY_W, side),
      height: Math.max(MIN_BODY_H, side),
    };
  }
  const { width, length } = (al.recipe as Recipe).building.size;
  const rows = effectiveRows(al);
  const machines = Math.max(1, machineCountOf(al));
  const cols = Math.ceil(machines / rows);
  return {
    width: Math.max(MIN_BODY_W, cols * width * SCALE),
    height: Math.max(MIN_BODY_H, rows * length * SCALE),
  };
}

/** Full bounding size of a graph node (used by auto-layout to avoid overlap). */
export function nodeSize(node: GraphNode): { width: number; height: number } {
  const data = node.data;
  if (data.kind === "assembly") {
    const al = data.assemblyLine;
    const body = assemblyBodySize(al);
    const ports = Math.max(
      al.recipe.ingredients.length,
      al.recipe.products.length,
    );
    const isFactory = al.recipe.isFactoryRecipe;
    const rowsRow = !isFactory && machineCountOf(al) > 1 ? ROWS_ROW_H : 0;
    return {
      width: body.width + 2 * PORT_OVERHANG,
      height: Math.max(body.height, ports * PORT_H) + HEADER_H + rowsRow,
    };
  }
  if (data.kind === "supplier" || data.kind === "consumer") {
    return { width: 190, height: 30 + data.parts.length * 22 };
  }
  return { width: 180, height: 48 };
}
