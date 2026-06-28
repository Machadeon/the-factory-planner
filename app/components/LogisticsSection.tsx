"use client";

import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import {
  applyNodeChanges,
  Background,
  Controls,
  type Edge,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Factory from "../models/factory";
import type { StorageLibrary } from "../models/factory-storage";
import AssemblyLineNode from "./logistics/AssemblyLineNode";
import { GRID } from "./logistics/constants";
import { LogisticsContext } from "./logistics/context";
import FactoryLinkNode from "./logistics/FactoryLinkNode";
import { assignColumns } from "./logistics/graph-layout";
import { buildGraphModel, type GraphNode } from "./logistics/graph-model";
import LogisticEdge from "./logistics/LogisticEdge";
import TerminalNode from "./logistics/TerminalNode";

interface LogisticsSectionProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  onNavigateToFactory?: (id: string) => void;
}

const nodeTypes: NodeTypes = {
  assembly: AssemblyLineNode,
  source: TerminalNode,
  sink: TerminalNode,
  supplier: FactoryLinkNode,
  consumer: FactoryLinkNode,
};

const edgeTypes: EdgeTypes = { logistic: LogisticEdge };

const COL_WIDTH = 320;
const ROW_HEIGHT = 150;

// Stack nodes within their assigned column for any node lacking a saved position.
function computeLayout(
  graphNodes: GraphNode[],
  cols: Map<string, number>,
): Map<string, { x: number; y: number }> {
  const perCol = new Map<number, number>();
  const out = new Map<string, { x: number; y: number }>();
  for (const n of graphNodes) {
    const col = cols.get(n.id) ?? 0;
    const row = perCol.get(col) ?? 0;
    perCol.set(col, row + 1);
    out.set(n.id, { x: col * COL_WIDTH, y: row * ROW_HEIGHT });
  }
  return out;
}

function Graph({
  factory,
  library,
  currentFactoryId,
}: Omit<LogisticsSectionProps, "onNavigateToFactory">) {
  const model = buildGraphModel(factory, { library, currentFactoryId });

  const idSignature = model.nodes.map((n) => n.id).join("|");

  const [nodes, setNodes] = useState<Node[]>([]);
  const lastSignature = useRef<string>("");

  // Rebuild React Flow nodes when the set of graph nodes changes. Positions come from
  // the persisted layout; missing ones are auto-laid-out and written back in-memory so
  // they stay stable (persisted on the next save) without churning autosave.
  useEffect(() => {
    if (lastSignature.current === idSignature) return;
    lastSignature.current = idSignature;
    const cols = assignColumns({
      nodes: model.layoutNodes,
      edges: model.layoutEdges,
    });
    const computed = computeLayout(model.nodes, cols);
    const next: Node[] = model.nodes.map((n) => {
      const saved = factory.graphLayout[n.id];
      const pos = saved ?? computed.get(n.id) ?? { x: 0, y: 0 };
      if (!saved) factory.graphLayout[n.id] = pos;
      return {
        id: n.id,
        type: n.data.kind,
        position: pos,
        data: n.data as unknown as Record<string, unknown>,
      };
    });
    setNodes(next);
  }, [idSignature, model, factory]);

  // Keep node data fresh (rates/rows) without resetting positions on every edit.
  const nodesWithData = useMemo(() => {
    const byId = new Map(model.nodes.map((n) => [n.id, n.data]));
    return nodes.map((n) => ({
      ...n,
      data: (byId.get(n.id) ?? n.data) as unknown as Record<string, unknown>,
    }));
  }, [nodes, model]);

  const edges: Edge[] = useMemo(
    () =>
      model.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: "logistic",
        data: { rate: e.rate, fluid: e.fluid, width: e.width },
      })),
    [model],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      factory.graphLayout[node.id] = {
        x: Math.round(node.position.x / GRID) * GRID,
        y: Math.round(node.position.y / GRID) * GRID,
      };
      factory.update();
    },
    [factory],
  );

  return (
    <ReactFlow
      nodes={nodesWithData}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      snapToGrid
      snapGrid={[GRID, GRID]}
      minZoom={0.1}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={GRID} color="#ffffff10" />
      <MiniMap pannable zoomable />
      <Controls />
    </ReactFlow>
  );
}

export default function LogisticsSection({
  factory,
  library,
  currentFactoryId,
  onNavigateToFactory,
}: LogisticsSectionProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximized]);

  const hasNodes = factory.productionLines.some(
    (pl) => pl.assemblyLines.length > 0,
  );

  if (!hasNodes) {
    return (
      <div
        data-testid="logistics-empty"
        className="flex grow flex-col items-center justify-center p-8 text-center text-gray-400"
      >
        <p className="mb-1 text-lg">Logistics</p>
        <p className="text-sm">
          Add a product to see its parts flow between machines.
        </p>
      </div>
    );
  }

  return (
    <LogisticsContext.Provider value={{ onNavigateToFactory }}>
      <div
        className={
          maximized
            ? "fixed inset-0 z-50 bg-[#0f1420]"
            : "relative flex grow flex-col"
        }
        style={maximized ? undefined : { minHeight: 480 }}
      >
        <button
          type="button"
          onClick={() => setMaximized((m) => !m)}
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-gray-100 hover:bg-black/70"
        >
          {maximized ? (
            <>
              <CloseFullscreenIcon sx={{ fontSize: 14 }} /> Exit full screen
            </>
          ) : (
            <>
              <OpenInFullIcon sx={{ fontSize: 14 }} /> Maximize
            </>
          )}
        </button>
        <ReactFlowProvider>
          <Graph
            factory={factory}
            library={library}
            currentFactoryId={currentFactoryId}
          />
        </ReactFlowProvider>
      </div>
    </LogisticsContext.Provider>
  );
}
