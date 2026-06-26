import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  collectFactoryBundle,
  directDependencyIds,
  migrateLibrary,
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

describe("migrateLibrary() — embedded factory hoisting", () => {
  it("hoists an embedded nestedFactoryData into an independent entry", () => {
    const embedded = factory("child", { name: "Child" });
    const raw = {
      schemaVersion: 3,
      folders: [],
      factories: [
        {
          ...factory("parent", { name: "Parent" }),
          productionLines: [
            {
              partSlug: "iron-plate",
              rate: 10,
              outputRate: 10,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  nestedFactoryId: "child",
                  nestedFactoryData: embedded,
                  rate: 1,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const lib = migrateLibrary(raw);

    expect(lib.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // child is now an independent top-level entry
    expect(lib.factories.map((f) => f.id).sort()).toEqual(["child", "parent"]);
    // embedding stripped, reference preserved
    const al = lib.factories.find((f) => f.id === "parent")?.productionLines[0]
      .assemblyLines[0];
    expect(al?.nestedFactoryId).toBe("child");
    expect(al?.nestedFactoryData).toBeUndefined();
  });

  it("recovers nestedFactoryId from embedded data when the id was missing", () => {
    const raw = {
      schemaVersion: 3,
      folders: [],
      factories: [
        {
          ...factory("parent"),
          productionLines: [
            {
              partSlug: "iron-plate",
              rate: 10,
              outputRate: 10,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  nestedFactoryData: factory("child"),
                  rate: 1,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const lib = migrateLibrary(raw);
    const al = lib.factories.find((f) => f.id === "parent")?.productionLines[0]
      .assemblyLines[0];
    expect(al?.nestedFactoryId).toBe("child");
  });

  it("prefers the top-level entry over an embedded copy of the same id", () => {
    const raw = {
      schemaVersion: 3,
      folders: [],
      factories: [
        factory("child", { name: "Real Child" }),
        {
          ...factory("parent"),
          productionLines: [
            {
              partSlug: "iron-plate",
              rate: 10,
              outputRate: 10,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  nestedFactoryId: "child",
                  nestedFactoryData: factory("child", { name: "Stale Copy" }),
                  rate: 1,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const lib = migrateLibrary(raw);
    expect(lib.factories.find((f) => f.id === "child")?.name).toBe(
      "Real Child",
    );
  });

  it("migrates legacy `slooped` boolean to sloopedSlots", () => {
    const raw = {
      schemaVersion: 1,
      folders: [],
      factories: [
        {
          ...factory("f"),
          productionLines: [
            {
              partSlug: "iron-plate",
              rate: 10,
              outputRate: 10,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                { recipeSlug: "iron-plate", rate: 1, slooped: true },
              ],
            },
          ],
        },
      ],
    };

    const lib = migrateLibrary(raw);
    const al = lib.factories[0].productionLines[0].assemblyLines[0];
    expect(al.sloopedSlots).toBe(1);
    expect(al.machineSpeed).toBe(100);
    expect("slooped" in al).toBe(false);
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
