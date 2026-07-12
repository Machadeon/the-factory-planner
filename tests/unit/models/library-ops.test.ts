import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  emptyLibrary,
  type SerializedFactory,
  type StorageLibrary,
} from "@/app/models/factory-storage";
import {
  mergeLibrary,
  mergeSingleFactory,
  remapImportedLibrary,
} from "@/app/models/migrations";

const NOW = "2026-01-01T00:00:00.000Z";

function sf(overrides: Partial<SerializedFactory>): SerializedFactory {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "f-src",
    name: "Source",
    folderId: null,
    autoAddProductLines: false,
    productionLines: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function importLib(overrides: Partial<StorageLibrary>): StorageLibrary {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    folders: [],
    factories: [],
    ...overrides,
  };
}

describe("library-ops purity (R1.S1)", () => {
  it("imports no React and no storage-service", () => {
    const src = readFileSync(
      path.resolve(__dirname, "../../../app/models/migrations.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']react["']/);
    expect(src).not.toMatch(/storage-service/);
  });
});

describe("remapImportedLibrary (R2)", () => {
  it("R2.S1 — remaps ids and rewrites folder/supplier/nested references", () => {
    const data = importLib({
      folders: [
        { id: "fo-1", name: "Root", parentId: null, createdAt: NOW },
        { id: "fo-2", name: "Child", parentId: "fo-1", createdAt: NOW },
      ],
      factories: [
        sf({ id: "f-1", folderId: "fo-2", supplierIds: ["f-2"] }),
        sf({
          id: "f-2",
          name: "Supplier",
          productionLines: [
            {
              partSlug: "iron-ingot",
              rate: 30,
              outputRate: 30,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  rate: 30,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: false,
                  nestedFactoryId: "f-1",
                },
              ],
            },
          ],
        }),
      ],
    });

    const { folders, factories, idMap } = remapImportedLibrary(data);

    expect(idMap.get("f-1")).toBeDefined();
    expect(idMap.get("f-1")).not.toBe("f-1");
    expect(folders[1].parentId).toBe(idMap.get("fo-1"));
    const f1 = factories.find((f) => f.id === idMap.get("f-1"));
    const f2 = factories.find((f) => f.id === idMap.get("f-2"));
    expect(f1?.folderId).toBe(idMap.get("fo-2"));
    expect(f1?.supplierIds).toEqual([idMap.get("f-2")]);
    expect(f2?.productionLines[0].assemblyLines[0].nestedFactoryId).toBe(
      idMap.get("f-1"),
    );
  });

  it("R2.S1 — stamps fresh createdAt/updatedAt", () => {
    const { factories } = remapImportedLibrary(
      importLib({ factories: [sf({})] }),
    );
    expect(factories[0].createdAt).not.toBe(NOW);
    expect(factories[0].updatedAt).not.toBe(NOW);
  });

  it("R2.S4 — legacy embedded factory is not hoisted (post-migration-retirement behavior)", () => {
    const legacy = {
      schemaVersion: 3,
      folders: [],
      factories: [
        sf({
          id: "f-outer",
          schemaVersion: 3,
          productionLines: [
            {
              partSlug: "iron-plate",
              rate: 20,
              outputRate: 20,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  rate: 20,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: false,
                  nestedFactoryData: sf({ id: "f-embedded", name: "Embedded" }),
                },
              ],
            },
          ],
        }),
      ],
    } as unknown as StorageLibrary;

    const { factories, idMap } = remapImportedLibrary(legacy);
    // No independent entry is created for the embedded factory — only the
    // outer factory is present, and its embedded data passes through untouched.
    expect(factories.length).toBe(1);
    expect(idMap.get("f-embedded")).toBeUndefined();
    const al = factories[0].productionLines[0].assemblyLines[0];
    expect(al.nestedFactoryId).toBeUndefined();
    expect(
      (al as unknown as { nestedFactoryData?: { id: string } })
        .nestedFactoryData?.id,
    ).toBe("f-embedded");
  });

  it("R2.S3 — dangling refs: supplier/nested pass through, parentId/folderId null out", () => {
    const data = importLib({
      folders: [
        { id: "fo-1", name: "Orphan", parentId: "fo-gone", createdAt: NOW },
      ],
      factories: [
        sf({
          id: "f-1",
          folderId: "fo-gone",
          supplierIds: ["f-gone"],
          productionLines: [
            {
              partSlug: "iron-ingot",
              rate: 30,
              outputRate: 30,
              autoCalculateRate: false,
              autoCreated: false,
              assemblyLines: [
                {
                  rate: 30,
                  sloopedSlots: 0,
                  machineSpeed: 100,
                  allowRemainder: false,
                  nestedFactoryId: "f-gone",
                },
              ],
            },
          ],
        }),
      ],
    });

    const { folders, factories } = remapImportedLibrary(data);
    expect(folders[0].parentId).toBeNull();
    expect(factories[0].folderId).toBeNull();
    expect(factories[0].supplierIds).toEqual(["f-gone"]);
    expect(
      factories[0].productionLines[0].assemblyLines[0].nestedFactoryId,
    ).toBe("f-gone");
  });
});

describe("mergeSingleFactory (R3)", () => {
  it("R3.S1 — merges into existing library and returns remapped root", () => {
    const current = emptyLibrary();
    current.factories.push(sf({ id: "f-existing", name: "Existing" }));
    const incoming = sf({ id: "f-import", name: "Imported" });

    const { library, root } = mergeSingleFactory(current, incoming);
    expect(root).toBeDefined();
    expect(root?.name).toBe("Imported");
    expect(root?.id).not.toBe("f-import");
    expect(library.factories.map((f) => f.name)).toEqual([
      "Existing",
      "Imported",
    ]);
    expect(library.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe("mergeLibrary (R4)", () => {
  it("R4.S1 — resolves bundle rootId to the remapped entry", () => {
    const current = emptyLibrary();
    const bundle = importLib({
      factories: [sf({ id: "f-root", name: "Root" }), sf({ id: "f-dep" })],
      rootId: "f-root",
    });
    const { root } = mergeLibrary(current, bundle);
    expect(root?.name).toBe("Root");
    expect(root?.id).not.toBe("f-root");
  });

  it("R4.S2 — no rootId means no root", () => {
    const { root, library } = mergeLibrary(
      emptyLibrary(),
      importLib({ factories: [sf({})] }),
    );
    expect(root).toBeUndefined();
    expect(library.factories.length).toBe(1);
  });
});
