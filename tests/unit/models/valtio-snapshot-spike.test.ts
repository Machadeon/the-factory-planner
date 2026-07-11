import { proxy, snapshot } from "valtio/vanilla";
import { beforeAll, describe, expect, it } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import type Recipe from "@/app/models/recipe";

// page-structure R7.S2: class-method reads through a valtio snapshot must match
// direct proxy reads — guards the snapshot-vs-class-instance architecture risk.
let ironIngot: Part;
let ironIngotRecipe: Recipe;

beforeAll(() => {
  ironIngot = partSlugLookup["iron-ingot"];
  // biome-ignore lint/style/noNonNullAssertion: recipe exists in game data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
});

describe("valtio snapshot spike (page-structure R7.S2)", () => {
  it("getPartProductionRate and getMachineCount match through snapshot()", () => {
    const raw = new Factory();
    raw.update = () => raw._updateRates();
    const store = proxy({ factory: raw });
    store.factory.addProductionLine(ironIngot, false, false);
    const line = store.factory.productionLines[0];
    line.outputRate = 60;
    line.assemblyLines.push(
      new AssemblyLine({
        recipe: ironIngotRecipe,
        rate: 30,
        allowRemainder: false,
      }),
    );
    store.factory.update();

    const snapFactory = snapshot(store).factory;
    const snapLine = snapFactory.productionLines[0];
    const proxyAl = line.assemblyLines[0];
    const snapAl = snapLine.assemblyLines[0];

    expect(snapAl.getPartProductionRate(ironIngot)).toBe(
      proxyAl.getPartProductionRate(ironIngot),
    );
    expect(snapAl.getMachineCount()).toEqual(proxyAl.getMachineCount());
  });

  it("container swap is a tracked write observable via subscribe", async () => {
    const { subscribe } = await import("valtio/vanilla");
    const store = proxy({ factory: new Factory() });
    let fired = 0;
    subscribe(store, () => {
      fired += 1;
    });
    store.factory = new Factory();
    await Promise.resolve();
    expect(fired).toBe(1);
  });
});
