import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

interface LogisticEdgeData {
  rate: number;
  fluid: boolean;
  width: number;
}

// A belt (solid item) or pipe (fluid/gas) between two ports. Stroke width is log-scaled
// by throughput (computed in the model); pipes are tinted and rounded to read as fluid.
export default function LogisticEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const d = data as unknown as LogisticEdgeData;
  const fluid = d?.fluid;

  return (
    <BaseEdge
      path={path}
      style={{
        strokeWidth: d?.width ?? 2,
        stroke: fluid ? "#38bdf8" : "#f59e0b",
        strokeLinecap: "round",
        opacity: 0.85,
      }}
    />
  );
}
