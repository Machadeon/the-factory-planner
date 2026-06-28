import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LogisticsSection from "@/app/components/LogisticsSection";
import AssemblyLineNode from "@/app/components/logistics/AssemblyLineNode";
import { LogisticsContext } from "@/app/components/logistics/context";
import FactoryLinkNode from "@/app/components/logistics/FactoryLinkNode";
import type {
  AssemblyNodeData,
  FactoryNodeData,
  TerminalNodeData,
} from "@/app/components/logistics/graph-model";
import PartPort from "@/app/components/logistics/PartPort";
import TerminalNode from "@/app/components/logistics/TerminalNode";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import { partSlugLookup, recipes } from "@/app/models/library";
import ProductionLine from "@/app/models/production-line";

// React Flow needs a real canvas/layout the jsdom DOM can't provide; mock its primitives
// so the custom node components render as plain DOM we can assert on.
vi.mock("@xyflow/react", () => ({
  Handle: (p: { id?: string }) => <div data-handle={p.id} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

// biome-ignore lint/style/noNonNullAssertion: recipe exists in test data
const ironIngot = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
const ironIngotPart = partSlugLookup["iron-ingot"];

function nodeProps(data: unknown) {
  return { data } as unknown as Parameters<typeof AssemblyLineNode>[0];
}

describe("LogisticsSection graph view", () => {
  it("AC8: empty factory shows an empty-state, no crash", () => {
    const factory = new Factory();
    factory.update = () => {};
    render(
      <LogisticsSection
        factory={factory}
        library={{ schemaVersion: 5, folders: [], factories: [] }}
        currentFactoryId={null}
        onNavigateToFactory={() => {}}
      />,
    );
    expect(screen.getByTestId("logistics-empty")).toBeInTheDocument();
  });

  it("AC9: an assembly-line node renders input and output ports", () => {
    const factory = new Factory();
    factory.update = () => {};
    const al = new AssemblyLine(ironIngot, 30, 0, 100, 0, false);
    const data: AssemblyNodeData = {
      kind: "assembly",
      assemblyLine: al,
      primaryPartSlug: "iron-ingot",
      factory,
    };
    render(<AssemblyLineNode {...nodeProps(data)} />);
    expect(screen.getByTestId("port-in-iron-ore")).toBeInTheDocument();
    expect(screen.getByTestId("port-out-iron-ingot")).toBeInTheDocument();
  });

  it("AC10: solid ports are squares, fluid ports are circles", () => {
    const { rerender } = render(
      <PartPort part={partSlugLookup["iron-ore"]} rate={30} direction="in" />,
    );
    expect(screen.getByTestId("port-in-iron-ore")).toHaveAttribute(
      "data-shape",
      "square",
    );
    rerender(<PartPort part={partSlugLookup.water} rate={30} direction="in" />);
    expect(screen.getByTestId("port-in-water")).toHaveAttribute(
      "data-shape",
      "circle",
    );
  });

  it("AC11: a factory-byproduct sink node is marked distinct", () => {
    const data: TerminalNodeData = {
      kind: "sink",
      part: ironIngotPart,
      rate: 10,
      byproduct: true,
    };
    render(<TerminalNode {...nodeProps(data)} />);
    expect(screen.getByTestId("terminal-sink-iron-ingot")).toHaveAttribute(
      "data-byproduct",
      "true",
    );
  });

  it("AC13: a supplier factory node links to that factory", () => {
    const onNav = vi.fn();
    const data: FactoryNodeData = {
      kind: "supplier",
      factoryId: "sup-1",
      name: "Ore Supply",
      parts: [{ part: partSlugLookup["iron-ore"], rate: 30 }],
    };
    render(
      <LogisticsContext.Provider value={{ onNavigateToFactory: onNav }}>
        <FactoryLinkNode {...nodeProps(data)} />
      </LogisticsContext.Provider>,
    );
    fireEvent.click(screen.getByText("Ore Supply"));
    expect(onNav).toHaveBeenCalledWith("sup-1");
  });

  it("AC15: a factory-recipe node title navigates to the nested factory", () => {
    const nested = new Factory();
    nested.update = () => nested._updateRates();
    const pl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
    pl.assemblyLines = [new AssemblyLine(ironIngot, 30, 0, 100, 0, false)];
    nested.productionLines = [pl];
    nested._productionLineLookup["iron-ingot"] = pl;
    nested._updateRates();
    const fr = new FactoryRecipe("nested-1", "Iron Sub", nested);

    const factory = new Factory();
    factory.update = () => {};
    const al = new AssemblyLine(fr, 1, 0, 100, 0, false);
    const data: AssemblyNodeData = {
      kind: "assembly",
      assemblyLine: al,
      primaryPartSlug: "iron-ingot",
      factory,
    };
    const onNav = vi.fn();
    render(
      <LogisticsContext.Provider value={{ onNavigateToFactory: onNav }}>
        <AssemblyLineNode {...nodeProps(data)} />
      </LogisticsContext.Provider>,
    );
    fireEvent.click(screen.getByText("Iron Sub"));
    expect(onNav).toHaveBeenCalledWith("nested-1");
  });

  it("AC16: rows control updates rows and persists", () => {
    const factory = new Factory();
    const update = vi.fn();
    factory.update = update;
    const al = new AssemblyLine(ironIngot, 90, 0, 100, 0, false); // 3 machines
    const data: AssemblyNodeData = {
      kind: "assembly",
      assemblyLine: al,
      primaryPartSlug: "iron-ingot",
      factory,
    };
    render(<AssemblyLineNode {...nodeProps(data)} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2" } });
    expect(al.rows).toBe(2);
    expect(update).toHaveBeenCalled();
  });

  it.todo("AC12: raw input renders a source node; net output a sink node");
  it.todo("AC14: consumer factory renders a distinct navigable consumer node");
});
