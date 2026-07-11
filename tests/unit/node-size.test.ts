import { beforeAll, describe, expect, it } from "vitest";
import { MIN_BODY_W } from "@/app/components/logistics/constants";
import type { GraphNode } from "@/app/components/logistics/graph-model";
import {
  assemblyBodySize,
  assemblyNodeBox,
  effectiveRows,
  nodeSize,
} from "@/app/components/logistics/node-size";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import ProductionLine from "@/app/models/production-line";
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
    const al = new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 6000,
      allowRemainder: false,
    });
    al.rows = 1;
    const real = assemblyNodeBox(al, true);
    const min = assemblyNodeBox(al, false);
    expect(real.width).toBeGreaterThan(min.width);
    expect(min.width).toBe(MIN_BODY_W);
  });

  it("nodeSize tracks the toggle (off is never larger than on)", () => {
    const al = new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 6000,
      allowRemainder: false,
    });
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

describe("effectiveRows on FactoryRecipe lines (assembly-line-construction R3.S2)", () => {
  it("returns 1 regardless of the stored rows value", () => {
    const nested = new Factory();
    nested.update = () => nested._updateRates();
    const ingotPart = partSlugLookup["iron-ingot"];
    const pl = new ProductionLine(ingotPart, 0, 0, false, false);
    pl.assemblyLines = [
      new AssemblyLine({ recipe: ironIngotRecipe, rate: 30 }),
    ];
    pl.rate = pl.assemblyLines[0].getPartProductionRate(ingotPart);
    nested.productionLines = [pl];
    nested._productionLineLookup[ingotPart.slug] = pl;
    nested._updateRates();

    const fr = new FactoryRecipe("nested", "Iron", nested);
    const al = new AssemblyLine({ recipe: fr, rate: 2 });

    al.rows = 0;
    expect(effectiveRows(al)).toBe(1);
    al.rows = 1;
    expect(effectiveRows(al)).toBe(1);
  });
});

describe("rowSpacing", () => {
  it("adds routing height between rows (n-1 gaps), none for a single row", () => {
    const al = new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 6000,
      allowRemainder: false,
    });
    al.rows = 4;
    const base = assemblyBodySize(al, true).height;
    al.rowSpacing += 10;
    const taller = assemblyBodySize(al, true).height;
    expect(taller).toBeGreaterThan(base);

    // One row → no inter-row gap, so spacing doesn't change height.
    al.rows = 1;
    const oneRow = assemblyBodySize(al, true).height;
    al.rowSpacing += 50;
    expect(assemblyBodySize(al, true).height).toBe(oneRow);
  });
});
