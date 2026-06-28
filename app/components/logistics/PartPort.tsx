import { Handle, Position } from "@xyflow/react";
import type Part from "../../models/part";
import { displayNum } from "../../utils";
import Icon from "../Icon";

interface PartPortProps {
  part: Part;
  rate: number;
  /** "in" = ingredient (left, target handle); "out" = product (right, source handle). */
  direction: "in" | "out";
  /** A product that isn't the production line's primary part. */
  byproduct?: boolean;
}

// A single input/output port: the part icon (rounded square for solids, circle for
// fluids/gases) over a React Flow connection handle, with the port's flow rate.
export default function PartPort({
  part,
  rate,
  direction,
  byproduct,
}: PartPortProps) {
  const fluid = part.fluid || part.gas;
  const isIn = direction === "in";
  const shapeClass = fluid ? "rounded-full" : "rounded-md";
  const ringClass = byproduct
    ? "ring-2 ring-amber-400"
    : "ring-1 ring-white/20";

  return (
    <div
      className={`relative flex items-center gap-1 ${isIn ? "flex-row" : "flex-row-reverse"}`}
      data-testid={`port-${direction}-${part.slug}`}
      data-shape={fluid ? "circle" : "square"}
      data-byproduct={byproduct ? "true" : undefined}
    >
      <Handle
        id={`${isIn ? "in" : "out"}-${part.slug}`}
        type={isIn ? "target" : "source"}
        position={isIn ? Position.Left : Position.Right}
        style={{
          background: part.color || "#888",
          width: 8,
          height: 8,
        }}
      />
      <div
        className={`flex items-center justify-center bg-black/30 p-0.5 ${shapeClass} ${ringClass}`}
        style={{ borderColor: part.color }}
      >
        <Icon src={part.iconSmall} label={part.name} size={20} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-300 whitespace-nowrap">
        {displayNum(rate)}
      </span>
    </div>
  );
}
