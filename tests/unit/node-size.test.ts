import { beforeAll, describe, expect, it } from "vitest";
import { MIN_BODY_W } from "@/app/components/logistics/constants";
import type { GraphNode } from "@/app/components/logistics/graph-model";
import {
  assemblyNodeBox,
  nodeSize,
} from "@/app/components/logistics/node-size";
import AssemblyLine from "@/app/models/assembly-line";
import { recipes } from "@/app/models/library";
import type Recipe from "@/app/models/recipe";

// Future revision: an "actual size" toggle. With it off, every assembly node collapses to
// the minimum so the graph reads as topology; with it on, the node grows to the real
// footprint. node-size is pure, so the sizing is unit-testable without React Flow.
let ironIngotRecipe: Recipe;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
});

describe("assemblyNodeBox actual-size toggle", () => {
  it("collapses to the minimum width when actual size is off", () => {
    // A big single-row bank: real footprint is much wider than the minimum.
    const al = new AssemblyLine(ironIngotRecipe, 6000, 0, 100, 0, false);
    al.rows = 1;
    const real = assemblyNodeBox(al, true);
    const min = assemblyNodeBox(al, false);
    expect(real.width).toBeGreaterThan(min.width);
    expect(min.width).toBe(MIN_BODY_W);
  });

  it("nodeSize tracks the toggle (off is never larger than on)", () => {
    const al = new AssemblyLine(ironIngotRecipe, 6000, 0, 100, 0, false);
    al.rows = 1;
    const node = {
      id: al.id,
      data: { kind: "assembly", assemblyLine: al },
    } as unknown as GraphNode;
    expect(nodeSize(node, false).width).toBeLessThanOrEqual(
      nodeSize(node, true).width,
    );
  });
});
