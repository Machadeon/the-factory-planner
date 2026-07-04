import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { useState } from "react";
import { displayNum } from "@/app/lib/format";

interface LogisticEdgeData {
  partName: string;
  rate: number;
  fluid: boolean;
  width: number;
}

// A belt (solid item) or pipe (fluid/gas) between two ports. Width is linear in
// throughput (computed in the model). Hovering highlights the edge and shows the part
// and rate.
export default function LogisticEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const d = data as unknown as LogisticEdgeData;
  const fluid = d?.fluid;
  const [hovered, setHovered] = useState(false);
  const color = fluid ? "#38bdf8" : "#f59e0b";

  return (
    <>
      <BaseEdge
        path={path}
        interactionWidth={0}
        style={{
          strokeWidth: d?.width ?? 2,
          stroke: hovered ? "#ffffff" : color,
          strokeLinecap: "round",
          opacity: hovered ? 1 : 0.85,
        }}
      />
      {/* Wide transparent hit area, rendered last so it sits above React Flow's own
          edge-interaction path (which otherwise steals the hover). */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(16, (d?.width ?? 2) + 12)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
      />
      {hovered ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-white shadow"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {d.partName} · {displayNum(d.rate)}
            {d.partName === "Power" ? " MW" : "/min"}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
