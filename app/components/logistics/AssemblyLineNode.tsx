import type { NodeProps } from "@xyflow/react";
import type Recipe from "../../models/recipe";
import { displayNum } from "../../utils";
import Icon from "../Icon";
import { useLogistics } from "./context";
import type { AssemblyNodeData } from "./graph-model";
import { assemblyBodySize, effectiveRows, machineCountOf } from "./node-size";
import PartPort from "./PartPort";

function portStyle(
  index: number,
  count: number,
  side: "left" | "right",
): React.CSSProperties {
  return {
    position: "absolute",
    top: `${((index + 1) / (count + 1)) * 100}%`,
    [side]: 0,
    transform: `translate(${side === "left" ? "-50%" : "50%"}, -50%)`,
  };
}

// One assembly line, drawn to its real factory footprint. Body size = footprint ×
// machine count in `rows` rows. Port icons sit on the body border. Factory-as-recipe
// lines size from the sub-factory's total floor area and link to that factory.
export default function AssemblyLineNode({ data }: NodeProps) {
  const { assemblyLine: al, factory } = data as unknown as AssemblyNodeData;
  const { onNavigateToFactory } = useLogistics();
  const recipe = al.recipe;
  const isFactory = recipe.isFactoryRecipe;
  const machines = Math.max(1, machineCountOf(al));
  const rows = effectiveRows(al);
  const perRow = Math.ceil(machines / rows);
  const sloops = al.sloopedSlots * machines;

  const { width: bodyW, height: footprintH } = assemblyBodySize(al);
  const portCount = Math.max(recipe.ingredients.length, recipe.products.length);
  // Grow the body if needed so stacked port icons don't overlap (keeps width accurate).
  const bodyH = Math.max(footprintH, portCount * 34);

  const icon = isFactory
    ? (recipe as unknown as { icon?: string }).icon
    : (recipe as Recipe).building.iconSmall;

  function setRows(next: number) {
    al.rows = Math.max(1, Math.min(machines, Math.floor(next)));
    factory.update();
  }

  return (
    <div
      className={`flex flex-col items-center rounded-lg border bg-[#1b2230] text-gray-100 shadow-lg ${
        isFactory ? "border-cyan-400/60" : "border-slate-500/60"
      }`}
      style={{ contain: "layout style paint" }}
    >
      <div className="flex flex-col items-center gap-0.5 px-4 pt-2 pb-1">
        {icon ? <Icon src={icon} label={recipe.name} size={36} /> : null}
        {isFactory && onNavigateToFactory ? (
          <button
            type="button"
            className="max-w-48 truncate text-center text-sm font-semibold underline hover:opacity-70"
            onClick={() =>
              onNavigateToFactory(recipe.slug.slice("factory:".length))
            }
          >
            {recipe.name}
          </button>
        ) : (
          <span className="max-w-48 truncate text-center text-sm font-semibold">
            {recipe.name}
          </span>
        )}
        <div className="flex flex-wrap justify-center gap-x-2 text-[10px] text-gray-300">
          {isFactory ? (
            <span>×{displayNum(al.rate)} instances</span>
          ) : (
            <>
              <span>
                {machines} machine{machines === 1 ? "" : "s"}
                {rows > 1 ? ` (${rows}×${perRow})` : ""}
              </span>
              <span>{displayNum(al.machineSpeed)}% clock</span>
              {sloops > 0 ? <span>{sloops} sloops</span> : null}
            </>
          )}
        </div>
      </div>

      <div
        className="relative mx-4 mb-1 rounded bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_2px,transparent_2px,transparent_8px)]"
        style={{ width: bodyW, height: bodyH }}
      >
        {recipe.ingredients.map((ing, i) => (
          <div
            key={ing.part.slug}
            style={portStyle(i, recipe.ingredients.length, "left")}
          >
            <PartPort
              part={ing.part}
              rate={al.getPartConsumptionRate(ing.part)}
              direction="in"
            />
          </div>
        ))}
        {recipe.products.map((prod, i) => (
          <div
            key={prod.part.slug}
            style={portStyle(i, recipe.products.length, "right")}
          >
            <PartPort
              part={prod.part}
              rate={al.getPartProductionRate(prod.part)}
              direction="out"
            />
          </div>
        ))}
      </div>

      {!isFactory && machines > 1 ? (
        <div className="flex w-full items-center justify-center gap-1 border-t border-white/10 px-2 py-1 text-[10px] text-gray-300">
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
