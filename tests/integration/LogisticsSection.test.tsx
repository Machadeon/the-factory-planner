import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LogisticsSection from "@/app/components/LogisticsSection";
import Factory from "@/app/models/factory";

// Replaces the old placeholder test. The Logistics tab now renders the graph view.
// Render-heavy cases that mount React Flow are stubbed as todo and filled in during
// the implementation loop (see plans/logistics-graph-view/validation.md AC8-AC16).
function emptyFactory(): Factory {
  const factory = new Factory();
  factory.update = () => {};
  return factory;
}

describe("LogisticsSection graph view", () => {
  it("AC8: empty factory shows an empty-state, no crash", () => {
    render(
      <LogisticsSection
        factory={emptyFactory()}
        library={{ schemaVersion: 5, folders: [], factories: [] }}
        currentFactoryId={null}
        onNavigateToFactory={() => {}}
      />,
    );
    expect(screen.getByTestId("logistics-empty")).toBeInTheDocument();
  });

  it.todo("AC9: a 1-line factory renders a node with input and output ports");
  it.todo("AC10: solid ports are rounded squares, fluid ports are circles");
  it.todo("AC11: byproduct output port is visually distinct from primary");
  it.todo("AC12: raw input renders a source node; net output a sink node");
  it.todo("AC13: supplier factory renders a distinct navigable supplier node");
  it.todo("AC14: consumer factory renders a distinct navigable consumer node");
  it.todo("AC15: factory-recipe node title navigates to the nested factory");
  it.todo(
    "AC16: node body scales with footprint; rows control resizes + persists",
  );
});
