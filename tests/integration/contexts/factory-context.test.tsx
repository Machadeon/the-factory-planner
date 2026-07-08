import { render, screen } from "@testing-library/react";
import { act } from "react";
import { proxy } from "valtio";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FactoryProvider,
  useFactory,
  useFactorySnapshot,
} from "@/app/contexts/FactoryContext";
import Factory from "@/app/models/factory";
import { partSlugLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";

let ironIngot: Part;
beforeAll(() => {
  ironIngot = partSlugLookup["iron-ingot"];
});

function makeStore() {
  const raw = new Factory();
  raw.update = () => raw._updateRates();
  return proxy({ factory: raw });
}

function Probe() {
  const snap = useFactorySnapshot();
  return <div data-testid="count">{snap.productionLines.length}</div>;
}

describe("FactoryContext reads/writes (R1.S1, R1.S2)", () => {
  it("snapshot reflects proxy mutation and survives a container swap", async () => {
    const store = makeStore();
    render(
      <FactoryProvider store={store}>
        <Probe />
      </FactoryProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("0");

    // R1.S2 — mutate through the proxy, snapshot updates (valtio flushes async).
    await act(async () => {
      store.factory.addProductionLine(ironIngot, false, false);
      await Promise.resolve();
    });
    expect(screen.getByTestId("count").textContent).toBe("1");

    // R1.S1 — swap the factory on the stable container; consumer reads the new one.
    await act(async () => {
      store.factory = new Factory();
      await Promise.resolve();
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("useFactory returns the mutable proxy, not a frozen snapshot", () => {
    const store = makeStore();
    let proxyFactory: Factory | null = null;
    function Grab() {
      proxyFactory = useFactory();
      return null;
    }
    render(
      <FactoryProvider store={store}>
        <Grab />
      </FactoryProvider>,
    );
    expect(proxyFactory).toBe(store.factory);
    // mutating it does not throw (snapshots are frozen and would)
    expect(() => {
      // biome-ignore lint/style/noNonNullAssertion: set above
      proxyFactory!.addProductionLine(ironIngot, false, false);
    }).not.toThrow();
  });
});
