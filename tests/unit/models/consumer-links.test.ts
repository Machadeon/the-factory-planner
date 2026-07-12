import { describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { deriveConsumers } from "@/app/models/consumer-links";
import Factory from "@/app/models/factory";
import {
  emptyLibrary,
  type SerializedFactory,
  type StorageLibrary,
  serializeFactory,
} from "@/app/models/factory-storage";
import { partSlugLookup, RATE_EPSILON, recipes } from "@/app/models/game-data";
import ProductionLine from "@/app/models/production-line";

function buildSupplierFactory(): Factory {
  const factory = new Factory();
  const ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c");
  if (!ironIngotRecipe) throw new Error("missing recipe fixture");
  const ironIngotPart = partSlugLookup["iron-ingot"];
  const pl = new ProductionLine(ironIngotPart, 0, 30, true, false);
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 30,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(pl);
  factory._productionLineLookup[ironIngotPart.slug] = pl;
  factory._updateRates();
  return factory;
}

/** Iron Rod recipe consumes Iron Ingot at a 1:1 ratio, so `rate` (rod output) equals
 * the ingot consumption rate exactly — lets tests pin an exact RATE_EPSILON boundary. */
function buildConsumerFactory(ironRodRate: number): Factory {
  const factory = new Factory();
  const ironRodRecipe = recipes.find((r) => r.slug === "recipe-ironrod-c");
  if (!ironRodRecipe) throw new Error("missing recipe fixture");
  const ironRodPart = partSlugLookup["iron-rod"];
  const pl = new ProductionLine(ironRodPart, 0, 0, false, false);
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironRodRecipe,
      rate: ironRodRate,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(pl);
  factory._productionLineLookup[ironRodPart.slug] = pl;
  factory._updateRates();
  return factory;
}

function buildLibrary(
  supplierId: string,
  supplier: Factory,
  consumerId: string,
  consumer: Factory,
): StorageLibrary {
  const library = emptyLibrary();
  const now = new Date().toISOString();
  const sSupplier = serializeFactory(supplier, {
    id: supplierId,
    name: "Supplier",
    folderId: null,
    createdAt: now,
    updatedAt: now,
  });
  const sConsumer: SerializedFactory = {
    ...serializeFactory(consumer, {
      id: consumerId,
      name: "Consumer",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }),
    supplierIds: [supplierId],
  };
  library.factories = [sSupplier, sConsumer];
  return library;
}

describe("deriveConsumers", () => {
  it("returns empty map when library is undefined", () => {
    const factory = buildSupplierFactory();
    const result = deriveConsumers(factory, {
      library: undefined,
      currentFactoryId: "supplier-1",
    });
    expect(result.size).toBe(0);
  });

  it("returns empty map when currentFactoryId is null, undefined, or empty string", () => {
    const factory = buildSupplierFactory();
    const library = buildLibrary(
      "supplier-1",
      factory,
      "consumer-1",
      buildConsumerFactory(10),
    );
    for (const id of [null, undefined, ""] as const) {
      const result = deriveConsumers(factory, {
        library,
        currentFactoryId: id,
      });
      expect(result.size).toBe(0);
    }
  });

  it("excludes a consumer whose net consumption is exactly RATE_EPSILON", () => {
    const supplier = buildSupplierFactory();
    const consumer = buildConsumerFactory(RATE_EPSILON);
    const library = buildLibrary(
      "supplier-1",
      supplier,
      "consumer-1",
      consumer,
    );
    const ironIngotPart = partSlugLookup["iron-ingot"];
    const result = deriveConsumers(supplier, {
      library,
      currentFactoryId: "supplier-1",
    });
    expect(result.get(ironIngotPart.slug) ?? []).toHaveLength(0);
  });

  it("includes a consumer whose net consumption is just above RATE_EPSILON", () => {
    const supplier = buildSupplierFactory();
    const consumer = buildConsumerFactory(RATE_EPSILON + 1);
    const library = buildLibrary(
      "supplier-1",
      supplier,
      "consumer-1",
      consumer,
    );
    const ironIngotPart = partSlugLookup["iron-ingot"];
    const result = deriveConsumers(supplier, {
      library,
      currentFactoryId: "supplier-1",
    });
    const entries = result.get(ironIngotPart.slug) ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("consumer-1");
  });
});
