import { render, screen } from "@testing-library/react";
import { act } from "react";
import { proxy, subscribe } from "valtio";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FactoryProvider,
  useFactorySnapshot,
} from "@/app/contexts/FactoryContext";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

let ironPlateRecipe: Recipe;
let ironPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: fixture exists in game data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironPlatePart = partSlugLookup["iron-plate"];
});

function storeWithPlateLine(outputRate = 20) {
  const raw = new Factory();
  const pl = new ProductionLine(
    ironPlatePart,
    20,
    outputRate,
    outputRate > 0,
    false,
  );
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: ironPlateRecipe,
      rate: 20,
      allowRemainder: false,
    }),
  ];
  raw.productionLines.push(pl);
  raw._productionLineLookup[ironPlatePart.slug] = pl;
  raw._updateRates();
  return proxy({ factory: raw });
}

describe("R7 — one action → one notification batch", () => {
  it("R7.S1 — a single mutator fires subscribe exactly once and updates rateLookup", async () => {
    const store = storeWithPlateLine();
    const al = store.factory.productionLines[0].assemblyLines[0];
    let count = 0;
    const unsub = subscribe(store.factory, () => {
      count++;
    });

    store.factory.setClockSpeed(al, 200);
    await Promise.resolve();

    expect(count).toBe(1);
    expect(
      store.factory.rateLookup["iron-plate"].productionRate,
    ).toBeGreaterThan(0);
    unsub();
  });
});

describe("R1.S3 / R6.S2 — proxy mutation re-renders snapshot consumers", () => {
  it("re-renders a component reading rateLookup when a mutator runs", async () => {
    const store = storeWithPlateLine();
    function RateProbe() {
      const snap = useFactorySnapshot();
      return (
        <div data-testid="rate">
          {snap.rateLookup["iron-plate"]?.productionRate ?? 0}
        </div>
      );
    }
    render(
      <FactoryProvider store={store}>
        <RateProbe />
      </FactoryProvider>,
    );
    const before = screen.getByTestId("rate").textContent;
    await act(async () => {
      store.factory.setProductionLineRate(store.factory.productionLines[0], 60);
      await Promise.resolve();
    });
    expect(screen.getByTestId("rate").textContent).not.toBe(before);
  });
});
