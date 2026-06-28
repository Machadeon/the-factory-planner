import { describe, expect, it } from "vitest";

// AC17/AC18 (R4.2, R8.1): edge width is log-proportional to rate; auto-layout assigns
// left→right columns and terminates on cyclic flows. These pure helpers are extracted
// so they are testable without React Flow. Module created during implementation.
const MODULE = "@/app/components/logistics/graph-layout";

describe("edgeWidth (AC17)", () => {
  it("is linear in rate against the scale, monotonic and clamped", async () => {
    const { edgeWidth, MIN_EDGE_WIDTH, MAX_EDGE_WIDTH } = await import(MODULE);
    // 0 → MIN, scaleRate → MAX
    expect(edgeWidth(0, 780)).toBeCloseTo(MIN_EDGE_WIDTH);
    expect(edgeWidth(780, 780)).toBeCloseTo(MAX_EDGE_WIDTH);
    // clamps above the scale
    expect(edgeWidth(2000, 780)).toBe(MAX_EDGE_WIDTH);
    // linear midpoint
    expect(edgeWidth(390, 780)).toBeCloseTo(
      MIN_EDGE_WIDTH + (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH) * 0.5,
    );
    // monotonic, and doubling the rate doubles the width above MIN
    expect(edgeWidth(100, 780)).toBeLessThan(edgeWidth(400, 780));
    expect(edgeWidth(200, 780) - MIN_EDGE_WIDTH).toBeCloseTo(
      2 * (edgeWidth(100, 780) - MIN_EDGE_WIDTH),
    );
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
