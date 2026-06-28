import { Handle, type NodeProps, Position } from "@xyflow/react";
import { displayNum } from "../../utils";
import Icon from "../Icon";
import type { TerminalNodeData } from "./graph-model";

// A raw input (source) or net output (sink) terminal: just the part icon and its rate.
// Lighter than a machine node — these are belt endpoints, not buildings.
export default function TerminalNode({ data }: NodeProps) {
  const { kind, part, rate } = data as unknown as TerminalNodeData;
  const fluid = part.fluid || part.gas;
  const isSource = kind === "source";

  return (
    <div
      className="flex items-center gap-1.5 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-gray-200"
      style={{ contain: "layout style paint" }}
      data-testid={`terminal-${kind}-${part.slug}`}
    >
      {!isSource ? (
        <Handle
          id={`in-${part.slug}`}
          type="target"
          position={Position.Left}
          style={{ background: part.color || "#888", width: 8, height: 8 }}
        />
      ) : null}
      <div
        className={`flex items-center justify-center bg-black/30 p-0.5 ${fluid ? "rounded-full" : "rounded-md"} ring-1 ring-white/20`}
      >
        <Icon src={part.iconSmall} label={part.name} size={22} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium">{part.name}</span>
        <span className="text-[10px] tabular-nums text-gray-400">
          {displayNum(rate)}/min
        </span>
      </div>
      {isSource ? (
        <Handle
          id={`out-${part.slug}`}
          type="source"
          position={Position.Right}
          style={{ background: part.color || "#888", width: 8, height: 8 }}
        />
      ) : null}
    </div>
  );
}
