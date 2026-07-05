import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import {
  CURRENT_SCHEMA_VERSION,
  deserializeFactory,
  type SerializedFactory,
  serializeFactory,
} from "@/app/models/factory-storage";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

// AC6/AC7 (R7): graph layout, per-line id, and rows round-trip through serialization;
// pre-v5 factories migrate cleanly (fresh ids, rows default 1, schema bumped to 5).
let ironIngotRecipe: Recipe;
let ironIngotPart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
});

function buildFactory(): Factory {
  const factory = new Factory();
  factory.update = () => factory._updateRates();
  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
  pl.assemblyLines = [new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false)];
  factory.productionLines = [pl];
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return factory;
}

const meta = {
  id: "f1",
  name: "F1",
  folderId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("graph layout serialization", () => {
  it("AC6: schemaVersion is 5", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
    const s = serializeFactory(buildFactory(), meta);
    expect(s.schemaVersion).toBe(5);
  });

  it("AC6: round-trips graphLayout, per-line id and rows", () => {
    const factory = buildFactory();
    const al = factory.productionLines[0].assemblyLines[0];
    (al as unknown as { rows: number }).rows = 2;
    const alId = (al as unknown as { id: string }).id;
    (
      factory as unknown as {
        graphLayout: Record<string, { x: number; y: number }>;
      }
    ).graphLayout = {
      [alId]: { x: 120, y: 40 },
      "_src_iron-ore": { x: 0, y: 40 },
    };

    const s = serializeFactory(factory, meta);
    // sanity: lines live under productionLines, not at the top level
    expect((s as unknown as { assemblyLines?: unknown }).assemblyLines).toBe(
      undefined,
    );
    expect(s.productionLines[0].assemblyLines[0].rows).toBe(2);
    expect(s.productionLines[0].assemblyLines[0].id).toBe(alId);
    expect(s.graphLayout?.[alId]).toEqual({ x: 120, y: 40 });

    const back = deserializeFactory(s);
    expect(back).not.toBeNull();
    const backAl = back?.productionLines[0].assemblyLines[0];
    expect((backAl as unknown as { rows: number }).rows).toBe(2);
    expect((backAl as unknown as { id: string }).id).toBe(alId);
    expect(
      (
        back as unknown as {
          graphLayout: Record<string, { x: number; y: number }>;
        }
      ).graphLayout[alId],
    ).toEqual({ x: 120, y: 40 });
  });

  it("round-trips a per-line rowSpacing override; default stays out of the payload", () => {
    const factory = buildFactory();
    const al = factory.productionLines[0].assemblyLines[0];
    // Default isn't serialized (keeps payloads lean).
    expect(
      serializeFactory(factory, meta).productionLines[0].assemblyLines[0]
        .rowSpacing,
    ).toBe(undefined);

    (al as unknown as { rowSpacing: number }).rowSpacing = 12;
    const s = serializeFactory(factory, meta);
    expect(s.productionLines[0].assemblyLines[0].rowSpacing).toBe(12);

    const back = deserializeFactory(s);
    const backAl = back?.productionLines[0].assemblyLines[0];
    expect((backAl as unknown as { rowSpacing: number }).rowSpacing).toBe(12);
  });

  it("a pre-rowSpacing line deserializes to the 8 m default", () => {
    const back = deserializeFactory(serializeFactory(buildFactory(), meta));
    const al = back?.productionLines[0].assemblyLines[0];
    expect((al as unknown as { rowSpacing: number }).rowSpacing).toBe(8);
  });

  it("AC7: a pre-v5 factory migrates — fresh ids, rows default 0 (auto), no positions", () => {
    const legacy = {
      schemaVersion: 4,
      id: "old",
      name: "Old",
      folderId: null,
      autoAddProductLines: false,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      productionLines: [
        {
          partSlug: "iron-ingot",
          rate: 30,
          outputRate: 30,
          autoCalculateRate: false,
          autoCreated: false,
          assemblyLines: [
            {
              recipeSlug: "recipe-ingotiron-c",
              rate: 30,
              sloopedSlots: 0,
              machineSpeed: 100,
              allowRemainder: true,
            },
          ],
        },
      ],
    } as unknown as SerializedFactory;

    const back = deserializeFactory(legacy);
    expect(back).not.toBeNull();
    const al = back?.productionLines[0].assemblyLines[0];
    expect(typeof (al as unknown as { id: string }).id).toBe("string");
    expect((al as unknown as { id: string }).id.length).toBeGreaterThan(0);
    // rows defaults to 0 (auto: the graph picks an aspect-fit row count).
    expect((al as unknown as { rows: number }).rows).toBe(0);
  });
});
