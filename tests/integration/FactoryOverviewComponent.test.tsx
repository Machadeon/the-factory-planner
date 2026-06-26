import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AssemblyLine from "@/app/models/assembly-line";
import { emptyLibrary } from "@/app/models/factory-storage";
import Factory from "@/app/models/factory";
import FactoryOverviewComponent from "@/app/components/FactoryOverviewComponent";
import { partSlugLookup, recipes } from "@/app/models/library";
import type Part from "@/app/models/part";
import type Recipe from "@/app/models/recipe";
import ProductionLine from "@/app/models/production-line";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: { src: string; alt: string; [k: string]: unknown }) => (
    // biome-ignore lint/a11y/useAltText: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironIngotPart: Part;
let ironOrePart: Part;
let ironPlatePart: Part;

beforeAll(() => {
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  ironOrePart = partSlugLookup["iron-ore"];
  ironPlatePart = partSlugLookup["iron-plate"];
});

function buildFactory(): Factory {
  const factory = new Factory();
  factory.update = () => {
    factory._updateRates();
  };

  // Iron Ingot line: 30 ore/min → 30 ingot/min
  const ingotPl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
  ingotPl.assemblyLines = [new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false)];
  factory.productionLines.push(ingotPl);
  factory._productionLineLookup[ironIngotPart.slug] = ingotPl;

  // Iron Plate line: 30 ingot/min → 20 plate/min (consumes all ingots → iron ingot is intermediate)
  const platePl = new ProductionLine(ironPlatePart, 0, 20, true, false, true);
  platePl.assemblyLines = [new AssemblyLine(ironPlateRecipe, 10, 0, 100, 0, false)];
  factory.productionLines.push(platePl);
  factory._productionLineLookup[ironPlatePart.slug] = platePl;

  factory._updateRates();
  return factory;
}

describe("FactoryOverviewComponent", () => {
  it("renders Outputs section for a factory with net outputs", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        onRebuild={() => {}}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // Iron Plate is an output (produced 20, consumed 0)
    expect(screen.getByText(/Outputs/i)).toBeInTheDocument();
    expect(screen.getByText(/Iron Plate/i)).toBeInTheDocument();
  });

  it("renders Inputs section for raw materials consumed", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        onRebuild={() => {}}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // Iron Ore is a net input (consumed 30, produced 0)
    expect(screen.getByText(/Inputs/i)).toBeInTheDocument();
    expect(screen.getByText(/Iron Ore/i)).toBeInTheDocument();
  });

  it("can show intermediate parts when the visibility toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        onRebuild={() => {}}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // The Intermediate Parts section has a Clickable div (role=generic) containing
    // a VisibilityIcon. It is in a flex row alongside the "Intermediate Parts" heading.
    const intermediateHeading = screen.getByText(/Intermediate Parts/i);
    const row = intermediateHeading.closest(".flex");
    expect(row).not.toBeNull();

    // The Clickable div is the next sibling div with cursor-pointer class
    const toggleDiv = row!.querySelector<HTMLElement>(".cursor-pointer");
    expect(toggleDiv).not.toBeNull();
    await user.click(toggleDiv!);

    // After toggling, Iron Ingot (the intermediate) should appear
    expect(screen.getByText(/Iron Ingot/i)).toBeInTheDocument();
  });

  it("renders Power & Modules section", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        onRebuild={() => {}}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // The power section heading is "Power & Modules"
    expect(screen.getByText(/Power & Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Power Shards/i)).toBeInTheDocument();
  });
});
