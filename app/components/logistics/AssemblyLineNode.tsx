import type { NodeProps } from "@xyflow/react";
import type AssemblyLine from "../../models/assembly-line";
import type Recipe from "../../models/recipe";
import { displayNum } from "../../utils";
import Icon from "../Icon";
import { MIN_BODY_H, MIN_BODY_W, SCALE } from "./constants";
import { useLogistics } from "./context";
import type { AssemblyNodeData } from "./graph-model";
import PartPort from "./PartPort";

function machineCount(al: AssemblyLine): number {
  const count = al.getMachineCount();
  return "fullMachines" in count
    ? count.fullMachines + (count.remainderClock > 0 ? 1 : 0)
    : count.machineCount;
}

// One assembly line, drawn to its real factory footprint. Body size = footprint ×
// machine count, arranged in the user's chosen number of rows. Factory-as-recipe lines
// size from the sub-factory's total floor area and link to that factory.
export default function AssemblyLineNode({ data }: NodeProps) {
  const {
    assemblyLine: al,
    primaryPartSlug,
    factory,
  } = data as unknown as AssemblyNodeData;
  const { onNavigateToFactory } = useLogistics();
  const recipe = al.recipe;
  const isFactory = recipe.isFactoryRecipe;
  const machines = Math.max(1, machineCount(al));
  const rows = Math.min(al.rows, machines);

  let bodyW: number;
  let bodyH: number;
  if (isFactory) {
    const area =
      (recipe as unknown as { footprintAreaPerInstance: number })
        .footprintAreaPerInstance * Math.max(1, al.rate);
    const side = Math.sqrt(Math.max(1, area));
    bodyW = side * SCALE;
    bodyH = side * SCALE;
  } else {
    const { width, length } = (recipe as Recipe).building.size;
    const cols = Math.ceil(machines / rows);
    bodyW = cols * width * SCALE;
    bodyH = rows * length * SCALE;
  }
  bodyW = Math.max(MIN_BODY_W, bodyW);
  bodyH = Math.max(MIN_BODY_H, bodyH);

  const icon = isFactory
    ? (recipe as unknown as { icon?: string }).icon
    : (recipe as Recipe).building.iconSmall;

  function setRows(next: number) {
    al.rows = Math.max(1, Math.min(machines, Math.floor(next)));
    factory.update();
  }

  return (
    <div
      className={`flex flex-col rounded-lg border bg-[#1b2230] text-gray-100 shadow-lg ${
        isFactory ? "border-cyan-400/60" : "border-slate-500/60"
      }`}
      style={{ contain: "layout style paint" }}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1">
        {icon ? <Icon src={icon} label={recipe.name} size={20} /> : null}
        {isFactory && onNavigateToFactory ? (
          <button
            type="button"
            className="truncate text-left text-xs font-semibold underline hover:opacity-70"
            onClick={() =>
              onNavigateToFactory(recipe.slug.slice("factory:".length))
            }
          >
            {recipe.name}
          </button>
        ) : (
          <span className="truncate text-xs font-semibold">{recipe.name}</span>
        )}
        <span className="ml-auto rounded bg-white/10 px-1 text-[10px] tabular-nums">
          {isFactory ? `×${displayNum(al.rate)}` : `${machines}×`}
        </span>
      </div>

      <div className="flex">
        <div className="flex flex-col justify-center gap-1 py-1 pl-1">
          {recipe.ingredients.map((ing) => (
            <PartPort
              key={ing.part.slug}
              part={ing.part}
              rate={al.getPartConsumptionRate(ing.part)}
              direction="in"
            />
          ))}
        </div>

        <div
          className="m-1 flex-1 rounded bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_2px,transparent_2px,transparent_8px)]"
          style={{ width: bodyW, height: bodyH }}
        />

        <div className="flex flex-col justify-center gap-1 py-1 pr-1">
          {recipe.products.map((prod) => (
            <PartPort
              key={prod.part.slug}
              part={prod.part}
              rate={al.getPartProductionRate(prod.part)}
              direction="out"
              byproduct={prod.part.slug !== primaryPartSlug}
            />
          ))}
        </div>
      </div>

      {!isFactory && machines > 1 ? (
        <div className="flex items-center gap-1 border-t border-white/10 px-2 py-1 text-[10px] text-gray-300">
          <span>Machine rows</span>
          <input
            type="number"
            min={1}
            max={machines}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="nodrag w-12 rounded bg-black/30 px-1 text-right tabular-nums"
          />
        </div>
      ) : null}
    </div>
  );
}
