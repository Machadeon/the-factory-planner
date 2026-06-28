import { describe, expect, it } from "vitest";

// AC17/AC18 (R4.2, R8.1): edge width is log-proportional to rate; auto-layout assigns
// left→right columns and terminates on cyclic flows. These pure helpers are extracted
// so they are testable without React Flow. Module created during implementation.
const MODULE = "@/app/components/logistics/graph-layout";

describe("edgeWidth (AC17)", () => {
  it("is log-proportional: monotonic, compressed, clamped", async () => {
    const { edgeWidth, MIN_EDGE_WIDTH, MAX_EDGE_WIDTH } = await import(MODULE);
    const w1 = edgeWidth(1);
    const w10 = edgeWidth(10);
    const w1000 = edgeWidth(1000);
    expect(w1).toBeGreaterThanOrEqual(MIN_EDGE_WIDTH);
    expect(w1000).toBeLessThanOrEqual(MAX_EDGE_WIDTH);
    expect(w1).toBeLessThan(w10);
    expect(w10).toBeLessThan(w1000);
    // log compression: a 1000x rate increase is far less than a 1000x width increase
    expect(w1000 / w1).toBeLessThan(50);
  });
});

describe("layoutColumns (AC18)", () => {
  it("orders sources left of assembly nodes left of sinks", async () => {
    const { assignColumns } = await import(MODULE);
    const cols = assignColumns({
      nodes: [
        { id: "_src_iron-ore", kind: "source" },
        { id: "a", kind: "assembly" },
        { id: "_sink_iron-ingot", kind: "sink" },
      ],
      edges: [
        { from: "_src_iron-ore", to: "a" },
        { from: "a", to: "_sink_iron-ingot" },
      ],
    });
    expect(cols.get("_src_iron-ore")).toBeLessThan(cols.get("a"));
    expect(cols.get("a")).toBeLessThan(cols.get("_sink_iron-ingot"));
  });

  it("terminates on a cyclic flow", async () => {
    const { assignColumns } = await import(MODULE);
    const cols = assignColumns({
      nodes: [
        { id: "a", kind: "assembly" },
        { id: "b", kind: "assembly" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    });
    expect(cols.size).toBe(2);
  });
});

describe("buildPartEdges (AC23 — R4.4 multi producer/consumer split)", () => {
  it("single producer + single consumer → one edge carrying the shared rate", async () => {
    const { buildPartEdges } = await import(MODULE);
    const edges = buildPartEdges({
      producers: [{ nodeId: "p1", rate: 30 }],
      consumers: [{ nodeId: "c1", rate: 30 }],
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: "p1", to: "c1" });
    expect(edges[0].rate).toBeCloseTo(30);
  });

  it("two producers + one consumer → consumer demand split evenly", async () => {
    const { buildPartEdges } = await import(MODULE);
    const edges = buildPartEdges({
      producers: [
        { nodeId: "p1", rate: 20 },
        { nodeId: "p2", rate: 20 },
      ],
      consumers: [{ nodeId: "c1", rate: 30 }],
    });
    expect(edges).toHaveLength(2);
    for (const e of edges) expect(e.rate).toBeCloseTo(15);
  });
});
