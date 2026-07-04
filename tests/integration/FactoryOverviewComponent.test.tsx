import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import FactoryOverviewComponent from "@/app/components/FactoryOverviewComponent";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import { emptyLibrary } from "@/app/models/factory-storage";
import { partSlugLookup, recipes } from "@/app/models/library";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
    [k: string]: unknown;
  }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

let ironIngotRecipe: Recipe;
let ironPlateRecipe: Recipe;
let ironIngotPart: Part;
let _ironOrePart: Part;
let ironPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  _ironOrePart = partSlugLookup["iron-ore"];
  ironPlatePart = partSlugLookup["iron-plate"];
});

function buildFactory(): Factory {
  const factory = new Factory();
  factory.update = () => {
    factory._updateRates();
  };

  // Iron Ingot line: 30 ore/min → 30 ingot/min
  const ingotPl = new ProductionLine(ironIngotPart, 0, 0, false, false, true);
  ingotPl.assemblyLines = [
    new AssemblyLine(ironIngotRecipe, 30, 0, 100, 0, false),
  ];
  factory.productionLines.push(ingotPl);
  factory._productionLineLookup[ironIngotPart.slug] = ingotPl;

  // Iron Plate line: 30 ingot/min → 20 plate/min (consumes all ingots → iron ingot is intermediate)
  const platePl = new ProductionLine(ironPlatePart, 0, 20, true, false, true);
  platePl.assemblyLines = [
    new AssemblyLine(ironPlateRecipe, 10, 0, 100, 0, false),
  ];
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
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // Iron Plate is an output (produced 20, consumed 0)
    expect(screen.getByText(/Outputs/i)).toBeInTheDocument();
    // Get all Iron Plate mentions and find the one in the outputs section
    const ironPlateElements = screen.getAllByText(/Iron Plate/i);
    expect(ironPlateElements.length).toBeGreaterThan(0);
  });

  it("renders Inputs section for raw materials consumed", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
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
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // The Intermediate Parts section has a Clickable div (role=generic) containing
    // a VisibilityIcon. It is in a flex row alongside the "Intermediate Parts" heading.
    const intermediateHeading = screen.getByText(/Intermediate Parts/i);
    const row = intermediateHeading.closest(".flex");
    expect(row).not.toBeNull();

    // The header row itself is the Clickable (cursor-pointer)
    // biome-ignore lint/style/noNonNullAssertion: already checked with toBeNull above
    await user.click(row! as HTMLElement);

    // After toggling, Iron Ingot (the intermediate) should appear
    // Use getAllByText since Iron Ingot now appears in multiple places
    const ironIngotElements = screen.getAllByText(/Iron Ingot/i);
    expect(ironIngotElements.length).toBeGreaterThan(0);
  });

  it("hides Outputs section when toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    const outputsHeader = screen.getByText(/Outputs/i).closest(".flex");
    expect(outputsHeader).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: already checked
    await user.click(outputsHeader! as HTMLElement);

    // The wrapper div after the header should have contentVisibility: hidden
    const wrapper = outputsHeader?.nextElementSibling as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.contentVisibility).toBe("hidden");
  });

  it("hides Inputs section when toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    const inputsHeader = screen.getByText(/Inputs/i).closest(".flex");
    expect(inputsHeader).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: already checked
    await user.click(inputsHeader! as HTMLElement);

    const wrapper = inputsHeader?.nextElementSibling as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.contentVisibility).toBe("hidden");
  });

  it("shows Intermediate Parts section when toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    const intermediateHeading = screen.getByText(/Intermediate Parts/i);
    const row = intermediateHeading.closest(".flex");
    expect(row).not.toBeNull();

    // Starts hidden by default
    const wrapper = row?.nextElementSibling as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.contentVisibility).toBe("hidden");

    // biome-ignore lint/style/noNonNullAssertion: already checked above
    await user.click(row! as HTMLElement);

    expect(wrapper?.style.contentVisibility).toBe("visible");
  });

  it("renders Power & Modules section", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    // The power section heading is "Power & Modules"
    expect(screen.getByText(/Power & Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Power Shards/i)).toBeInTheDocument();
  });

  it("starts with Intermediates collapsed and the other sections expanded", () => {
    const factory = buildFactory();
    render(
      <FactoryOverviewComponent
        factory={factory}
        library={emptyLibrary()}
        currentFactoryId={null}
      />,
    );

    const expectExpanded = (name: RegExp, expanded: boolean) =>
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        String(expanded),
      );

    expectExpanded(/^Outputs/i, true);
    expectExpanded(/^Inputs/i, true);
    expectExpanded(/^Intermediate/i, false);
    expectExpanded(/^Power & Modules/i, true);
  });
});
