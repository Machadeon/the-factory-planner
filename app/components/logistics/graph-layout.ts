// Pure, framework-free helpers for the logistics graph view. Kept separate from the
// React Flow components so they are unit-testable without a DOM.

export const MIN_EDGE_WIDTH = 1.5;
export const MAX_EDGE_WIDTH = 14;

/**
 * Edge stroke width, log-proportional to throughput so a 1/min belt and a 1000/min belt
 * are both visible but clearly different. Clamped to [MIN_EDGE_WIDTH, MAX_EDGE_WIDTH].
 */
export function edgeWidth(rate: number): number {
  const w = MIN_EDGE_WIDTH + 1.6 * Math.log(Math.max(0, rate) + 1);
  return Math.min(MAX_EDGE_WIDTH, Math.max(MIN_EDGE_WIDTH, w));
}

export type NodeKind = "source" | "supplier" | "assembly" | "sink" | "consumer";

export interface LayoutNode {
  id: string;
  kind: NodeKind;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

const isLeft = (k: NodeKind) => k === "source" || k === "supplier";
const isRight = (k: NodeKind) => k === "sink" || k === "consumer";

/**
 * Assign a left→right column index to each node: terminals on the outside (sources/
 * suppliers leftmost, sinks/consumers rightmost), assembly lines ordered by their
 * longest path from a source. Longest-path relaxation is bounded by node count, so a
 * cyclic flow terminates instead of looping forever.
 */
export function assignColumns({
  nodes,
  edges,
}: {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}): Map<string, number> {
  const col = new Map<string, number>();
  for (const n of nodes) col.set(n.id, 0);

  // Bounded longest-path relaxation (cycle-safe).
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of edges) {
      const from = col.get(e.from);
      const to = col.get(e.to);
      if (from === undefined || to === undefined) continue;
      if (to < from + 1) {
        col.set(e.to, from + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  let maxCol = 0;
  for (const c of col.values()) maxCol = Math.max(maxCol, c);

  for (const n of nodes) {
    if (isLeft(n.kind)) col.set(n.id, 0);
    else if (isRight(n.kind)) col.set(n.id, maxCol + 1);
  }

  return col;
}

export interface FlowEndpoint {
  nodeId: string;
  rate: number;
}

export interface PartFlowEdge {
  from: string;
  to: string;
  rate: number;
}

/**
 * Build edges for one part from its producers to its consumers. With a single producer
 * and consumer, one edge carries the shared rate. With multiple producers, each
 * consumer's demand is split evenly across the producers (a v1 approximation — exact
 * LP-accurate allocation is out of scope).
 */
export function buildPartEdges({
  producers,
  consumers,
}: {
  producers: FlowEndpoint[];
  consumers: FlowEndpoint[];
}): PartFlowEdge[] {
  if (producers.length === 0 || consumers.length === 0) return [];
  const edges: PartFlowEdge[] = [];
  for (const consumer of consumers) {
    const share = consumer.rate / producers.length;
    for (const producer of producers) {
      edges.push({ from: producer.nodeId, to: consumer.nodeId, rate: share });
    }
  }
  return edges;
}
