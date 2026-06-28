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
  useReactFlow,
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
import {
  buildGraphModel,
  deriveConsumers,
  type GraphNode,
} from "./logistics/graph-model";
import LogisticEdge from "./logistics/LogisticEdge";
import { nodeSize } from "./logistics/node-size";
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

const GAP_X = 72;
const GAP_Y = 28;

// Burndown layout: pack each column by its widest node (no giant gaps) and stack nodes
// within a column by their real heights (no overlap). Columns come from assignColumns
// (sources/suppliers left, sinks/consumers right, assembly lines by flow depth).
function computeLayout(
  graphNodes: GraphNode[],
  cols: Map<string, number>,
): Map<string, { x: number; y: number }> {
  const byCol = new Map<number, GraphNode[]>();
  for (const n of graphNodes) {
    const col = cols.get(n.id) ?? 0;
    const list = byCol.get(col) ?? [];
    list.push(n);
    byCol.set(col, list);
  }

  const out = new Map<string, { x: number; y: number }>();
  let x = 0;
  for (const col of [...byCol.keys()].sort((a, b) => a - b)) {
    const colNodes = byCol.get(col) ?? [];
    const colW = Math.max(...colNodes.map((n) => nodeSize(n).width));
    let y = 0;
    for (const n of colNodes) {
      const s = nodeSize(n);
      out.set(n.id, { x: x + (colW - s.width) / 2, y });
      y += s.height + GAP_Y;
    }
    x += colW + GAP_X;
  }
  return out;
}

function Graph({
  factory,
  library,
  currentFactoryId,
}: Omit<LogisticsSectionProps, "onNavigateToFactory">) {
  // Deserializing consumer factories is expensive; memoize it so rate edits don't
  // re-derive the whole consumer set every render (same key the overview uses).
  const outputKey = factory
    .allOutputs()
    .map((p) => p.slug)
    .join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: outputs tracked via outputKey, not array identity
  const consumersByPart = useMemo(
    () => deriveConsumers(factory, { library, currentFactoryId }),
    [library, currentFactoryId, outputKey],
  );

  const model = buildGraphModel(factory, {
    library,
    currentFactoryId,
    consumersByPart,
  });

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
    const live = new Set(model.nodes.map((n) => n.id));
    // Prune layout entries for nodes that no longer exist (deleted lines).
    for (const key of Object.keys(factory.graphLayout)) {
      if (!live.has(key)) delete factory.graphLayout[key];
    }
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
        data: {
          partName: e.partName,
          rate: e.rate,
          fluid: e.fluid,
          width: e.width,
        },
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

  // Keep the graph centered on the same flow point when the pane is resized (e.g.
  // maximize), instead of pinning the top-left corner. Track the visible center on
  // every move, then re-apply it after a resize.
  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  const captureCenter = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const c = rf.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    centerRef.current = { x: c.x, y: c.y, zoom: rf.getZoom() };
  }, [rf]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      const c = centerRef.current;
      if (c) rf.setCenter(c.x, c.y, { zoom: c.zoom });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rf]);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={nodesWithData}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onMove={captureCenter}
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
    </div>
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
          aria-label={maximized ? "Exit full screen" : "Maximize"}
          onClick={() => setMaximized((m) => !m)}
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-gray-100 hover:bg-black/70"
        >
          {maximized ? (
            <CloseFullscreenIcon sx={{ fontSize: 14 }} />
          ) : (
            <OpenInFullIcon sx={{ fontSize: 14 }} />
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
