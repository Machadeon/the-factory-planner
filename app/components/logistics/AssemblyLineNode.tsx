import type { NodeProps } from "@xyflow/react";
import type Recipe from "../../models/recipe";
import { displayNum } from "../../utils";
import Icon from "../Icon";
import { useLogistics } from "./context";
import type { AssemblyNodeData } from "./graph-model";
import { assemblyBodySize, effectiveRows, machineCountOf } from "./node-size";
import PartPort from "./PartPort";

// One assembly line, drawn to its real factory footprint. Body size = footprint ×
// machine count, arranged in `rows` rows. Factory-as-recipe lines size from the
// sub-factory's total floor area and link to that factory.
export default function AssemblyLineNode({ data }: NodeProps) {
  const { assemblyLine: al, factory } = data as unknown as AssemblyNodeData;
  const { onNavigateToFactory } = useLogistics();
  const recipe = al.recipe;
  const isFactory = recipe.isFactoryRecipe;
  const machines = Math.max(1, machineCountOf(al));
  const rows = effectiveRows(al);

  const { width: bodyW, height: bodyH } = assemblyBodySize(al);

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
