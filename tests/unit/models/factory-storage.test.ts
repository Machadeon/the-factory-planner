import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  deserializeFactory,
  directDependencyIds,
  type SerializedFactory,
  type StorageLibrary,
} from "@/app/models/factory-storage";

function factory(
  id: string,
  partial: Partial<SerializedFactory> = {},
): SerializedFactory {
  const now = "2024-01-01T00:00:00.000Z";
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: id,
    folderId: null,
    autoAddProductLines: false,
    productionLines: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** A production line whose single assembly line references a nested factory. */
function nestedRefLine(nestedFactoryId: string) {
  return {
    partSlug: "iron-plate",
    rate: 10,
    outputRate: 10,
    autoCalculateRate: false,
    autoCreated: false,
    assemblyLines: [
      {
        nestedFactoryId,
        rate: 1,
        sloopedSlots: 0,
        machineSpeed: 100,
        allowRemainder: true,
      },
    ],
  };
}

describe("deserializeFactory() — unified core (storage-migrations R1-R3)", () => {
  it("R1.S1: nested assembly-line link resolves via resolveNested", () => {
    const nested = factory("nested-1", { name: "Nested" });
    const outer = factory("outer-1", {
      productionLines: [nestedRefLine("nested-1")],
    });
    const resolveNested = (id: string) => (id === "nested-1" ? nested : null);
    const back = deserializeFactory(outer, resolveNested);
    const al = back?.productionLines[0].assemblyLines[0];
    expect(al?.recipe.isFactoryRecipe).toBe(true);
  });

  it("R1.S2: supplier link resolves via resolveNested", () => {
    const supplier = factory("sup-1", { name: "Supplier" });
    const outer = factory("outer-2", { supplierIds: ["sup-1"] });
    const resolveNested = (id: string) => (id === "sup-1" ? supplier : null);
    const back = deserializeFactory(outer, resolveNested);
    expect(back?.supplierFactories).toHaveLength(1);
    expect(back?.supplierFactories[0].slug).toBe("factory:sup-1");
  });

  it("R1.S3: unresolved reference skipped with warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const outer = factory("outer-3", {
      productionLines: [nestedRefLine("missing")],
    });
    const back = deserializeFactory(outer, () => null);
    expect(back?.productionLines[0].assemblyLines).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => String(c[0]).includes("missing"))).toBe(
      true,
    );
    warn.mockRestore();
  });

  it("R1.S4: mixed resolution within one factory", () => {
    const x = factory("x", { name: "X" });
    const outer = factory("outer-4", {
      productionLines: [nestedRefLine("x"), nestedRefLine("y")],
    });
    const resolveNested = (id: string) => (id === "x" ? x : null);
    const back = deserializeFactory(outer, resolveNested);
    expect(
      back?.productionLines[0].assemblyLines[0]?.recipe.isFactoryRecipe,
    ).toBe(true);
    expect(back?.productionLines[1].assemblyLines).toHaveLength(0);
  });

  it("R1.S5: omitted resolveNested defaults to null-resolution", () => {
    const outer = factory("outer-5", {
      productionLines: [nestedRefLine("anything")],
    });
    const back = deserializeFactory(outer);
    expect(back?.productionLines[0].assemblyLines).toHaveLength(0);
  });

  it("R2.S1: sibling nested-factory subtrees don't share _visiting state", () => {
    const sibB = factory("sib-b", { name: "B" });
    const sibC = factory("sib-c", { name: "C" });
    const outer = factory("outer-6", {
      productionLines: [nestedRefLine("sib-b"), nestedRefLine("sib-c")],
    });
    const resolveNested = (id: string) =>
      id === "sib-b" ? sibB : id === "sib-c" ? sibC : null;
    const back = deserializeFactory(outer, resolveNested);
    expect(
      back?.productionLines[0].assemblyLines[0]?.recipe.isFactoryRecipe,
    ).toBe(true);
    expect(
      back?.productionLines[1].assemblyLines[0]?.recipe.isFactoryRecipe,
    ).toBe(true);
  });

  it("R3.S1: cyclic reference breaks without infinite recursion (stub-mode parity)", () => {
    // A -> B -> A: A and B each resolve normally once; the second, re-encountered
    // occurrence of A (already in _visiting) is the one that gets stub-built, so
    // it's *A's* reference to B (not B's to A) that ends up skipped with a warning.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = factory("cyc-a", {
      name: "A",
      productionLines: [nestedRefLine("cyc-b")],
    });
    const b = factory("cyc-b", {
      name: "B",
      productionLines: [nestedRefLine("cyc-a")],
    });
    const resolveNested = (id: string) =>
      id === "cyc-a" ? a : id === "cyc-b" ? b : null;
    const back = deserializeFactory(a, resolveNested);
    expect(back).not.toBeNull();
    const al = back?.productionLines[0].assemblyLines[0];
    expect(al?.recipe.isFactoryRecipe).toBe(true);
    expect(warn.mock.calls.some((c) => String(c[0]).includes("cyc-b"))).toBe(
      true,
    );
    warn.mockRestore();
  });

  it("R3.S2: standalone stub call (deserializeFactory(data, () => null)) skips every nested/supplier reference", () => {
    const outer = factory("outer-7", {
      supplierIds: ["sup-x"],
      productionLines: [nestedRefLine("nest-x")],
    });
    const back = deserializeFactory(outer, () => null);
    expect(back?.supplierFactories).toHaveLength(0);
    expect(back?.productionLines[0].assemblyLines).toHaveLength(0);
  });

  it("R4.S2: legacy field shapes are not repaired — deserializeFactory tolerates them via constructor defaults", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const legacy = {
      ...factory("legacy-1"),
      productionLines: [
        {
          partSlug: "iron-plate",
          rate: 10,
          outputRate: 10,
          autoCalculateRate: false,
          autoCreated: false,
          assemblyLines: [
            // legacy `slooped` field, no sloopedSlots/machineSpeed/allowRemainder
            { recipeSlug: "recipe-ingotiron-c", rate: 1, slooped: true },
            // nestedFactoryData-only, no nestedFactoryId/recipeSlug — skipped
            {
              nestedFactoryData: factory("embedded-1"),
              rate: 1,
              sloopedSlots: 0,
              machineSpeed: 100,
              allowRemainder: true,
            },
          ],
        },
      ],
    } as unknown as SerializedFactory;

    const back = deserializeFactory(legacy);
    const lines = back?.productionLines[0].assemblyLines ?? [];
    // Only the recipeSlug line survives; the nestedFactoryData-only line is skipped.
    expect(lines).toHaveLength(1);
    expect(lines[0].sloopedSlots).toBe(0);
    expect(lines[0].machineSpeed).toBe(100);
    expect(lines[0].allowRemainder).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("directDependencyIds()", () => {
  it("collects nested-recipe and supplier ids", () => {
    const f = factory("root", {
      supplierIds: ["sup1"],
      productionLines: [nestedRefLine("nest1")],
    });
    expect(directDependencyIds(f).sort()).toEqual(["nest1", "sup1"]);
  });
});

describe("collectFactoryBundle()", () => {
  function lib(...factories: SerializedFactory[]): StorageLibrary {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, folders: [], factories };
  }

  it("includes the root plus transitive dependencies", () => {
    const a = factory("A", { productionLines: [nestedRefLine("B")] });
    const b = factory("B", { supplierIds: ["C"] });
    const c = factory("C");
    const other = factory("Z");

    const bundle = collectFactoryBundle(a, lib(a, b, c, other));
    expect(bundle[0].id).toBe("A");
    expect(bundle.map((f) => f.id).sort()).toEqual(["A", "B", "C"]);
  });

  it("skips missing references without throwing", () => {
    const a = factory("A", { productionLines: [nestedRefLine("missing")] });
    const bundle = collectFactoryBundle(a, lib(a));
    expect(bundle.map((f) => f.id)).toEqual(["A"]);
  });

  it("handles dependency cycles", () => {
    const a = factory("A", { productionLines: [nestedRefLine("B")] });
    const b = factory("B", { productionLines: [nestedRefLine("A")] });
    const bundle = collectFactoryBundle(a, lib(a, b));
    expect(bundle.map((f) => f.id).sort()).toEqual(["A", "B"]);
  });
});

describe("normalizeRecipeOptimizer() — cast-free availableParts (optimizer-config R5)", () => {
  it("R5.S1: factory-storage.ts source contains no as-unknown-as cast", () => {
    const text = readFileSync(
      join(process.cwd(), "app/models/factory-storage.ts"),
      "utf8",
    );
    expect(text.includes("as unknown as")).toBe(false);
  });

  it("R5.S2: legacy string[] availableParts normalizes to AvailablePart[]", () => {
    // Legacy stored shape predates AvailablePart objects; simulate the raw
    // JSON a pre-migration localStorage entry would contain.
    const raw = factory("A", {
      optimizer: {
        availableParts: ["iron-ore", "copper-ore"],
      } as unknown as SerializedFactory["optimizer"],
    });
    const f = deserializeFactory(raw);
    expect(f?.optimizer.availableParts).toEqual([
      { partSlug: "iron-ore", rate: 0 },
      { partSlug: "copper-ore", rate: 0 },
    ]);
  });

  it("R5.S3: existing AvailablePart[] availableParts passes through unchanged", () => {
    const raw = factory("A", {
      optimizer: {
        availableParts: [{ partSlug: "iron-ore", rate: 60 }],
      } as unknown as SerializedFactory["optimizer"],
    });
    const f = deserializeFactory(raw);
    expect(f?.optimizer.availableParts).toEqual([
      { partSlug: "iron-ore", rate: 60 },
    ]);
  });
});
