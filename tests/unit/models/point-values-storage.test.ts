import { beforeAll, describe, expect, it } from "vitest";
import Factory from "@/app/models/factory";
import {
  CURRENT_SCHEMA_VERSION,
  deserializeFactory,
  emptyLibrary,
  type SerializedFactory,
  type StorageLibrary,
  serializeFactory,
} from "@/app/models/factory-storage";
import { partSlugLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";

let ironIngotPart: Part;

beforeAll(() => {
  ironIngotPart = partSlugLookup["iron-ingot"];
});

const meta = {
  id: "f1",
  name: "F1",
  folderId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function buildFactory(overrides: Record<string, number> = {}): Factory {
  const f = new Factory();
  const pl = new ProductionLine(ironIngotPart, 0, 0, false, false);
  pl.assemblyLines = [];
  f.productionLines = [pl];
  f.partPointOverrides = overrides;
  return f;
}

describe("partPointOverrides serialization (F1–F5)", () => {
  it("F1: serialized output includes partPointOverrides when non-empty", () => {
    const f = buildFactory({ "iron-ore": 999 });
    const s = serializeFactory(f, meta);
    expect(s.partPointOverrides).toEqual({ "iron-ore": 999 });
  });

  it("F2: serialized output omits partPointOverrides when empty", () => {
    const f = buildFactory({});
    const s = serializeFactory(f, meta);
    expect(s.partPointOverrides).toBeUndefined();
  });

  it("F3: deserializeFactory restores partPointOverrides", () => {
    const f = buildFactory({ "iron-ore": 42, coal: 7 });
    const s = serializeFactory(f, meta);
    const restored = deserializeFactory(s);
    expect(restored?.partPointOverrides).toEqual({ "iron-ore": 42, coal: 7 });
  });

  it("F5: StorageLibrary.partPointOverrides round-trips through JSON", () => {
    const lib: StorageLibrary = {
      ...emptyLibrary(),
      partPointOverrides: { "iron-ore": 77, coal: 33 },
    };
    const json = JSON.stringify(lib);
    const parsed: StorageLibrary = JSON.parse(json);
    expect(parsed.partPointOverrides).toEqual({ "iron-ore": 77, coal: 33 });
  });

  it("F4: missing partPointOverrides field on legacy data defaults to {}", () => {
    const legacy: SerializedFactory = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: "legacy",
      name: "Legacy",
      folderId: null,
      autoAddProductLines: false,
      productionLines: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      // partPointOverrides intentionally absent
    };
    const restored = deserializeFactory(legacy);
    expect(restored?.partPointOverrides).toEqual({});
  });
});
