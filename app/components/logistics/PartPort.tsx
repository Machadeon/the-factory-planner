import { Handle, Position } from "@xyflow/react";
import type Part from "../../models/part";
import Icon from "../ui/Icon";

interface PartPortProps {
  part: Part;
  rate: number;
  /** "in" = ingredient (left, target handle); "out" = product (right, source handle). */
  direction: "in" | "out";
}

// A port icon that sits on the node border (half outside). Rounded square for solids,
// circle for fluids/gases. The connection handle is invisible and fills the icon so
// edges anchor at the icon center — no stray white dot.
export default function PartPort({ part, direction }: PartPortProps) {
  const fluid = part.fluid || part.gas;
  const isIn = direction === "in";

  return (
    <div
      className={`relative flex items-center justify-center bg-[#0f1420] ring-1 ring-white/25 ${fluid ? "rounded-full" : "rounded-md"}`}
      style={{ width: 30, height: 30, borderColor: part.color }}
      data-testid={`port-${direction}-${part.slug}`}
      data-shape={fluid ? "circle" : "square"}
    >
      <Handle
        id={`${isIn ? "in" : "out"}-${part.slug}`}
        type={isIn ? "target" : "source"}
        position={isIn ? Position.Left : Position.Right}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          transform: "none",
          background: "transparent",
          border: "none",
          borderRadius: "inherit",
          opacity: 0,
        }}
      />
      <Icon src={part.iconSmall} label={part.name} size={22} />
    </div>
  );
}
