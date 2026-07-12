import { render, screen } from "@testing-library/react";
import { act, memo, useState } from "react";
import { proxy } from "valtio";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  FactoryProvider,
  useFactorySnapshot,
} from "@/app/contexts/FactoryContext";
import {
  LibraryProvider,
  useLibraryContext,
} from "@/app/contexts/LibraryContext";
import Factory from "@/app/models/factory";
import type { StorageLibrary } from "@/app/models/factory-storage";
import { partSlugLookup } from "@/app/models/game-data";
import type Part from "@/app/models/part";

let ironIngot: Part;
let copperIngot: Part;
beforeAll(() => {
  ironIngot = partSlugLookup["iron-ingot"];
  copperIngot = partSlugLookup["copper-ingot"];
});

function makeTwoLineStore() {
  const raw = new Factory();
  const store = proxy({ factory: raw });
  store.factory.addProductionLine(ironIngot, false, false);
  store.factory.addProductionLine(copperIngot, false, false);
  store.factory._updateRates();
  return store;
}

// A probe that reads exactly one production line's rate and counts its renders.
function LineRateProbe({ index, counts }: { index: number; counts: number[] }) {
  const snap = useFactorySnapshot();
  counts[index] = (counts[index] ?? 0) + 1;
  const line = snap.productionLines[index];
  return <div data-testid={`rate-${index}`}>{line?.rate ?? 0}</div>;
}

describe("render scoping (R6.S1)", () => {
  it("editing one line's rate re-renders only that probe", async () => {
    const store = makeTwoLineStore();
    const counts: number[] = [];
    render(
      <FactoryProvider store={store}>
        <LineRateProbe index={0} counts={counts} />
        <LineRateProbe index={1} counts={counts} />
      </FactoryProvider>,
    );
    const before0 = counts[0];
    const before1 = counts[1];

    await act(async () => {
      store.factory.productionLines[0].rate = 123;
      await Promise.resolve();
    });

    expect(counts[0]).toBe(before0 + 1); // edited row re-rendered
    expect(counts[1]).toBe(before1); // sibling did NOT
    expect(screen.getByTestId("rate-0").textContent).toBe("123");
  });
});

describe("solver-coupled edit re-renders affected rows (R6.S3)", () => {
  it("rows whose rate changed re-render; unchanged rows do not", async () => {
    const store = makeTwoLineStore();
    const counts: number[] = [];
    render(
      <FactoryProvider store={store}>
        <LineRateProbe index={0} counts={counts} />
        <LineRateProbe index={1} counts={counts} />
      </FactoryProvider>,
    );
    const before0 = counts[0];
    const before1 = counts[1];

    // Simulate a solver recompute that changes BOTH lines' rates (initial 10,10).
    await act(async () => {
      store.factory.productionLines[0].rate = 55;
      store.factory.productionLines[1].rate = 77;
      await Promise.resolve();
    });

    expect(counts[0]).toBe(before0 + 1);
    expect(counts[1]).toBe(before1 + 1);
  });
});

describe("FactoryPage-scoped fields still re-render (R6.S2 positive)", () => {
  it("a probe reading productionLines.length / solverError re-renders on change", async () => {
    const store = makeTwoLineStore();
    let renders = 0;
    function HeaderProbe() {
      const snap = useFactorySnapshot();
      renders += 1;
      return (
        <div>
          <span data-testid="len">{snap.productionLines.length}</span>
          <span data-testid="err">{JSON.stringify(snap.solverError)}</span>
        </div>
      );
    }
    render(
      <FactoryProvider store={store}>
        <HeaderProbe />
      </FactoryProvider>,
    );
    const before = renders;
    // solverError is one of the three fields FactoryPage's scoped snapshot reads.
    await act(async () => {
      store.factory.solverError = { kind: "infeasible-rates" };
      await Promise.resolve();
    });
    expect(renders).toBe(before + 1);
    expect(screen.getByTestId("err").textContent).toBe(
      JSON.stringify({ kind: "infeasible-rates" }),
    );
  });
});

// R5.S1 — provider memoizes its value: stable prop refs => no consumer re-render.
describe("provider value stability (R5.S1)", () => {
  it("re-rendering parent with same refs does not re-render context consumer", () => {
    const library: StorageLibrary = {
      schemaVersion: 2,
      folders: [],
      factories: [],
    };
    const updateFn = vi.fn();
    let consumerRenders = 0;
    // memo => the consumer only re-renders when the context value identity
    // changes, not merely because its parent re-rendered. Isolates fan-out.
    const Consumer = memo(function Consumer() {
      useLibraryContext();
      consumerRenders += 1;
      return null;
    });
    function Parent() {
      const [, force] = useState(0);
      return (
        <LibraryProvider
          library={library}
          currentFactoryId={null}
          updatePartPointOverrides={updateFn}
        >
          <button type="button" onClick={() => force((n) => n + 1)}>
            force
          </button>
          <Consumer />
        </LibraryProvider>
      );
    }
    render(<Parent />);
    const before = consumerRenders;
    // Force the provider's parent to re-render with identical prop references.
    act(() => {
      screen.getByRole("button", { name: "force" }).click();
    });
    expect(consumerRenders).toBe(before); // memoized value => no fan-out
  });
});
