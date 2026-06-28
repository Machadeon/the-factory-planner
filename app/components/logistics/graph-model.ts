import type AssemblyLine from "../../models/assembly-line";
import type Factory from "../../models/factory";
import type { StorageLibrary } from "../../models/factory-storage";
import { deserializeFactory } from "../../models/factory-storage";
import type Part from "../../models/part";
import {
  buildPartEdges,
  EDGE_SCALE_FLOOR,
  edgeWidth,
  type FlowEndpoint,
  type LayoutEdge,
  type LayoutNode,
} from "./graph-layout";

export interface AssemblyNodeData {
  kind: "assembly";
  assemblyLine: AssemblyLine;
  /** Slug of the production line's primary part (everything else is a byproduct). */
  primaryPartSlug: string;
  factory: Factory;
}

export interface TerminalNodeData {
  kind: "source" | "sink";
  part: Part;
  rate: number;
  /** A sink that is a factory byproduct (a net output that isn't a main product). */
  byproduct?: boolean;
}

export interface FactoryNodeData {
  kind: "supplier" | "consumer";
  factoryId: string;
  name: string;
  parts: { part: Part; rate: number }[];
}

export type GraphNodeData =
  | AssemblyNodeData
  | TerminalNodeData
  | FactoryNodeData;

export interface GraphNode {
  id: string;
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  partName: string;
  rate: number;
  fluid: boolean;
  width: number;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Lightweight projection for `assignColumns`. */
  layoutNodes: LayoutNode[];
  layoutEdges: LayoutEdge[];
}

const srcId = (slug: string) => `_src_${slug}`;
const sinkId = (slug: string) => `_sink_${slug}`;
const supplierId = (id: string) => `_supplier_${id}`;
const consumerId = (id: string) => `_consumer_${id}`;

/**
 * Build the logistics graph for a factory: one node per assembly line, raw inputs as
 * source nodes, net outputs as sink nodes, supplier/consumer factories as their own
 * distinct nodes, and edges connecting producing output ports to consuming input ports
 * (width log-scaled by throughput, tagged belt vs pipe by fluid).
 */
export function buildGraphModel(
  factory: Factory,
  opts: {
    library?: StorageLibrary;
    currentFactoryId?: string | null;
    /** Precomputed consumers (memoized by the caller to avoid re-deserializing
     * library factories every render). Derived internally when omitted. */
    consumersByPart?: Map<string, { id: string; name: string; rate: number }[]>;
  } = {},
): GraphModel {
  const nodes: GraphNode[] = [];
  const producers = new Map<string, FlowEndpoint[]>();
  const consumers = new Map<string, FlowEndpoint[]>();
  const addProducer = (slug: string, e: FlowEndpoint) => {
    const list = producers.get(slug) ?? [];
    list.push(e);
    producers.set(slug, list);
  };
  const addConsumer = (slug: string, e: FlowEndpoint) => {
    const list = consumers.get(slug) ?? [];
    list.push(e);
    consumers.set(slug, list);
  };

  // Assembly-line nodes + their ports.
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      nodes.push({
        id: al.id,
        data: {
          kind: "assembly",
          assemblyLine: al,
          primaryPartSlug: pl.part.slug,
          factory,
        },
      });
      for (const product of al.recipe.products) {
        addProducer(product.part.slug, {
          nodeId: al.id,
          rate: al.getPartProductionRate(product.part),
        });
      }
      for (const ing of al.recipe.ingredients) {
        addConsumer(ing.part.slug, {
          nodeId: al.id,
          rate: al.getPartConsumptionRate(ing.part),
        });
      }
    }
  }

  // Supplier factory nodes (distinct sources).
  for (const fr of factory.supplierFactories) {
    const fid = fr.slug.slice("factory:".length);
    const id = supplierId(fid);
    const parts: { part: Part; rate: number }[] = [];
    for (const product of fr.products) {
      parts.push({ part: product.part, rate: product.quantity });
      addProducer(product.part.slug, { nodeId: id, rate: product.quantity });
    }
    if (parts.length > 0) {
      nodes.push({
        id,
        data: { kind: "supplier", factoryId: fid, name: fr.name, parts },
      });
    }
  }

  // Raw input source nodes (already net of suppliers via allInputs()).
  for (const part of factory.allInputs()) {
    const rate = factory.rateLookup[part.slug];
    const deficit = rate.consumptionRate - rate.productionRate;
    nodes.push({
      id: srcId(part.slug),
      data: { kind: "source", part, rate: deficit },
    });
    addProducer(part.slug, { nodeId: srcId(part.slug), rate: deficit });
  }

  // Consumer factories (library factories that list this one as a supplier).
  const consumersByPart =
    opts.consumersByPart ?? deriveConsumers(factory, opts);

  // Net output → consumer factory nodes if any consume it, else a sink node.
  for (const part of factory.allOutputs()) {
    const rate = factory.rateLookup[part.slug];
    const net = rate.productionRate - rate.consumptionRate;
    const partConsumers = consumersByPart.get(part.slug);
    if (partConsumers && partConsumers.length > 0) {
      for (const c of partConsumers) {
        const id = consumerId(c.id);
        if (!nodes.some((n) => n.id === id)) {
          nodes.push({
            id,
            data: {
              kind: "consumer",
              factoryId: c.id,
              name: c.name,
              parts: [{ part, rate: c.rate }],
            },
          });
        } else {
          const data = nodes.find((n) => n.id === id)?.data as FactoryNodeData;
          data.parts.push({ part, rate: c.rate });
        }
        addConsumer(part.slug, { nodeId: id, rate: c.rate });
      }
    } else {
      nodes.push({
        id: sinkId(part.slug),
        data: {
          kind: "sink",
          part,
          rate: net,
          byproduct: !factory._mainOutputParts.has(part),
        },
      });
      addConsumer(part.slug, { nodeId: sinkId(part.slug), rate: net });
    }
  }

  // Edges: match producers to consumers per part. Build them first, then size widths
  // linearly against the factory's busiest belt (or EDGE_SCALE_FLOOR, whichever larger).
  const partBySlug = buildPartIndex(factory);
  const edges: GraphEdge[] = [];
  const slugs = new Set([...producers.keys(), ...consumers.keys()]);
  for (const slug of slugs) {
    const prod = producers.get(slug);
    const cons = consumers.get(slug);
    if (!prod || !cons) continue;
    const part = partBySlug.get(slug);
    const fluid = part ? part.fluid || part.gas : false;
    for (const e of buildPartEdges({ producers: prod, consumers: cons })) {
      edges.push({
        id: `${e.from}:${slug}:${e.to}`,
        source: e.from,
        target: e.to,
        sourceHandle: `out-${slug}`,
        targetHandle: `in-${slug}`,
        partName: part?.name ?? slug,
        rate: e.rate,
        fluid,
        width: 0,
      });
    }
  }
  const maxRate = edges.reduce((m, e) => Math.max(m, e.rate), 0);
  const scaleRate = Math.max(maxRate, EDGE_SCALE_FLOOR);
  for (const e of edges) e.width = edgeWidth(e.rate, scaleRate);

  const layoutNodes: LayoutNode[] = nodes.map((n) => ({
    id: n.id,
    kind: n.data.kind,
  }));
  const layoutEdges: LayoutEdge[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
  }));

  return { nodes, edges, layoutNodes, layoutEdges };
}

function buildPartIndex(factory: Factory): Map<string, Part> {
  const map = new Map<string, Part>();
  for (const pl of factory.productionLines) {
    for (const al of pl.assemblyLines) {
      for (const p of al.recipe.products) map.set(p.part.slug, p.part);
      for (const i of al.recipe.ingredients) map.set(i.part.slug, i.part);
    }
  }
  return map;
}

/**
 * Consumer factories per output part, derived exactly as the overview's Consumers
 * section: library factories whose supplierIds include this factory, net-consuming one
 * of its outputs.
 */
export function deriveConsumers(
  factory: Factory,
  opts: { library?: StorageLibrary; currentFactoryId?: string | null },
): Map<string, { id: string; name: string; rate: number }[]> {
  const map = new Map<string, { id: string; name: string; rate: number }[]>();
  const { library, currentFactoryId } = opts;
  if (!library || !currentFactoryId) return map;
  const outputs = factory.allOutputs();
  for (const sf of library.factories) {
    if (!sf.supplierIds?.includes(currentFactoryId)) continue;
    const consumerFactory = deserializeFactory(sf, library);
    if (!consumerFactory) continue;
    for (const output of outputs) {
      const rate = consumerFactory.rateLookup[output.slug];
      if (!rate) continue;
      const net = rate.consumptionRate - rate.productionRate;
      if (net <= 0.0001) continue;
      const list = map.get(output.slug) ?? [];
      list.push({ id: sf.id, name: sf.name, rate: net });
      map.set(output.slug, list);
    }
  }
  return map;
}
