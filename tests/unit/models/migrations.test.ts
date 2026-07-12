import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import Factory from "@/app/models/factory";
import { emptyLibrary, serializeFactory } from "@/app/models/factory-storage";
import { migrateLibrary } from "@/app/models/migrations";

const meta = {
  id: "f1",
  name: "F1",
  folderId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("schemaVersion pinning (storage-migrations R4)", () => {
  it("R4.S1: serializeFactory, emptyLibrary, migrateLibrary all write schemaVersion 1", () => {
    const s = serializeFactory(new Factory(), meta);
    expect(s.schemaVersion).toBe(1);
    expect(emptyLibrary().schemaVersion).toBe(1);
    expect(migrateLibrary({}).schemaVersion).toBe(1);
  });
});

describe("migrateLibrary() — structural-shape guarantee only (storage-migrations R5)", () => {
  it("R5.S1: missing folders/factories default to empty arrays", () => {
    const lib = migrateLibrary({});
    expect(lib.folders).toEqual([]);
    expect(lib.factories).toEqual([]);
  });
});

describe("module boundary (storage-migrations R6)", () => {
  it("R6.S1: library-ops.ts does not exist", () => {
    const libraryOpsPath = path.resolve(
      __dirname,
      "../../../app/models/library-ops.ts",
    );
    expect(existsSync(libraryOpsPath)).toBe(false);
  });
});
