import { proxy, snapshot } from "valtio/vanilla";
import { beforeAll, describe, expect, it } from "vitest";
import Factory from "@/app/models/factory";
import { partSlugLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";

// page-structure R7.S2: class-method reads through a valtio snapshot must match
// direct proxy reads — guards the snapshot-vs-class-instance architecture risk.
let ironIngot: Part;

beforeAll(() => {
  ironIngot = partSlugLookup["iron-ingot"];
});

describe("valtio snapshot spike (page-structure R7.S2)", () => {
  it("getPartProductionRate and getMachineCount match through snapshot()", () => {
    const raw = new Factory();
    raw.update = () => raw._updateRates();
    const store = proxy({ factory: raw });
    store.factory.addProductionLine(ironIngot, false, false);
    const line = store.factory.productionLines[0];
    line.setRate(60);

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
