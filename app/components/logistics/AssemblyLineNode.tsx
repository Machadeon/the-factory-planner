import type { NodeProps } from "@xyflow/react";
import { displayNum } from "@/app/lib/format";
import type Recipe from "../../models/recipe";
import Icon from "../Icon";
import { SCALE } from "./constants";
import { useLogistics } from "./context";
import type { AssemblyNodeData } from "./graph-model";
import {
  assemblyNodeBox,
  effectiveRows,
  machineCountOf,
  PORT_OVERHANG,
} from "./node-size";
import PartPort from "./PartPort";

// Above this machine count, drawing one cell per machine is more cost than detail; fall
// back to the hatched body.
const MAX_MACHINE_CELLS = 400;

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
  const { onNavigateToFactory, actualSize = true } = useLogistics();
  const recipe = al.recipe;
  const isFactory = recipe.isFactoryRecipe;
  const machines = Math.max(1, machineCountOf(al));
  const rows = effectiveRows(al);
  const perRow = Math.ceil(machines / rows);
  const sloops = al.sloopedSlots * machines;

  // The whole node is sized to the footprint (floored so header/ports fit). With actual
  // size off it collapses to the minimum. Ports sit on this box's border.
  const { width: boxW, height: boxH } = assemblyNodeBox(al, actualSize);

  const icon = isFactory
    ? (recipe as unknown as { icon?: string }).icon
    : (recipe as Recipe).building.iconSmall;
  // "Alternate:" prefix is redundant noise in the graph — drop it for the label.
  const name = recipe.name.replace(/^Alternate:\s*/, "");

  function setRows(next: number) {
    al.rows = Math.max(1, Math.min(machines, Math.floor(next)));
    factory.update();
  }

  function setSpacing(next: number) {
    al.rowSpacing = Math.max(0, next);
    factory.update();
  }

  // Drag the bottom edge to set the machine-row count: vertical travel maps to whole rows
  // (one in-game machine-length per row), so the body always lands on an integer layout.
  const resizable = actualSize && !isFactory && machines > 1;
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startRows = rows;
    const perRowPx = Math.max(
      1,
      (recipe as Recipe).building.size.length * SCALE,
    );
    const onMove = (ev: PointerEvent) =>
      setRows(startRows + Math.round((ev.clientY - startY) / perRowPx));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const showMachineCells =
    actualSize && !isFactory && machines <= MAX_MACHINE_CELLS;

  return (
    // Transparent wrapper padded left/right by the port overhang so the border-mounted
    // port icons aren't clipped. The inner box is the actual node, sized to the footprint.
    <div
      className="relative"
      style={{ padding: `0 ${PORT_OVERHANG}px`, contain: "layout style" }}
    >
      <div
        className={`relative flex flex-col items-center justify-between rounded-lg border bg-[#1b2230] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_2px,transparent_2px,transparent_8px)] text-gray-100 shadow-lg ${
          isFactory ? "border-cyan-400/60" : "border-slate-500/60"
        }`}
        style={{ width: boxW, height: boxH }}
      >
        {showMachineCells ? (
          <div
            className="pointer-events-none absolute inset-1 grid"
            style={{
              gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              // Row gap = the real routing space; columns stay tight.
              rowGap: rows > 1 ? al.rowSpacing * SCALE : 0,
              columnGap: 1,
            }}
          >
            {Array.from({ length: machines }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional, no id
                key={i}
                className="rounded-[2px] border border-white/10 bg-slate-300/15"
              />
            ))}
          </div>
        ) : null}

        <div className="relative flex flex-col items-center gap-0.5 rounded-md bg-[#1b2230]/80 px-3 pt-2 pb-1">
          {icon ? <Icon src={icon} label={name} size={36} /> : null}
          {isFactory && onNavigateToFactory ? (
            <button
              type="button"
              className="max-w-56 truncate text-center text-sm font-semibold underline hover:opacity-70"
              onClick={() =>
                onNavigateToFactory(recipe.slug.slice("factory:".length))
              }
            >
              {name}
            </button>
          ) : (
            <span className="max-w-56 truncate text-center text-sm font-semibold">
              {name}
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

        {resizable ? (
          <div className="relative flex items-center justify-center gap-2 rounded-md bg-[#1b2230]/80 px-2 pb-1 text-[10px] text-gray-300">
            <label className="flex items-center gap-1">
              <span>Rows</span>
              <input
                type="number"
                min={1}
                max={machines}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="nodrag w-12 rounded bg-black/30 px-1 text-right tabular-nums"
              />
            </label>
            {rows > 1 ? (
              <label className="flex items-center gap-1">
                <span>Gap m</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={al.rowSpacing}
                  onChange={(e) => setSpacing(Number(e.target.value))}
                  className="nodrag w-12 rounded bg-black/30 px-1 text-right tabular-nums"
                />
              </label>
            ) : null}
          </div>
        ) : (
          <div />
        )}

        {resizable ? (
          // Grab strip on the bottom border — drag to change row count.
          <button
            type="button"
            aria-label="Resize machine rows"
            onPointerDown={startResize}
            className="nodrag absolute inset-x-3 bottom-0 h-2 cursor-ns-resize rounded-b bg-transparent hover:bg-white/20"
          />
        ) : null}

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
    </div>
  );
}
