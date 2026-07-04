import FactoryIcon from "@mui/icons-material/Factory";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { displayNum } from "@/app/lib/format";
import Icon from "../ui/Icon";
import { useLogistics } from "./context";
import type { FactoryNodeData } from "./graph-model";

// A supplier (incoming) or consumer (outgoing) factory: a distinct cross-factory
// terminal, visually separate from a raw source/sink, and a link to that factory.
export default function FactoryLinkNode({ data }: NodeProps) {
  const { kind, factoryId, name, parts } = data as unknown as FactoryNodeData;
  const { onNavigateToFactory } = useLogistics();
  const isSupplier = kind === "supplier";

  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-violet-400/60 bg-violet-950/40 px-2 py-1 text-gray-100"
      style={{ contain: "layout style paint" }}
      data-testid={`factory-${kind}-${factoryId}`}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-left text-[11px] font-semibold underline hover:opacity-70"
        onClick={() => onNavigateToFactory?.(factoryId)}
      >
        <FactoryIcon sx={{ fontSize: 14 }} />
        <span className="truncate">{name}</span>
      </button>
      {parts.map((p) => (
        <div
          key={p.part.slug}
          className={`relative flex items-center gap-1 ${isSupplier ? "flex-row-reverse" : "flex-row"}`}
        >
          {isSupplier ? (
            <Handle
              id={`out-${p.part.slug}`}
              type="source"
              position={Position.Right}
              style={{
                opacity: 0,
                width: 10,
                height: 10,
                background: "transparent",
                border: "none",
              }}
            />
          ) : (
            <Handle
              id={`in-${p.part.slug}`}
              type="target"
              position={Position.Left}
              style={{
                opacity: 0,
                width: 10,
                height: 10,
                background: "transparent",
                border: "none",
              }}
            />
          )}
          <Icon src={p.part.iconSmall} label={p.part.name} size={16} />
          <span className="text-[10px] tabular-nums text-gray-300">
            {displayNum(p.rate)}
          </span>
        </div>
      ))}
    </div>
  );
}
