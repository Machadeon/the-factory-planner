import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import OverviewSidebar from "@/app/components/overview/OverviewSidebar";
import AssemblyLine from "@/app/models/assembly-line";
import Factory from "@/app/models/factory";
import FactoryRecipe from "@/app/models/factory-recipe";
import {
  emptyLibrary,
  type SerializedFactory,
  serializeFactory,
} from "@/app/models/factory-storage";
import { partSlugLookup, recipes } from "@/app/models/game-data";
import type Part from "@/app/models/part";
import ProductionLine from "@/app/models/production-line";
import type Recipe from "@/app/models/recipe";
import { renderWithProviders } from "../../helpers/render-with-providers";

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
let reinforcedPlateRecipe: Recipe;
let ironIngotPart: Part;
let _ironOrePart: Part;
let ironPlatePart: Part;
let reinforcedPlatePart: Part;

beforeAll(() => {
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironIngotRecipe = recipes.find((r) => r.slug === "recipe-ingotiron-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  ironPlateRecipe = recipes.find((r) => r.slug === "recipe-ironplate-c")!;
  // biome-ignore lint/style/noNonNullAssertion: recipes should exist in test data
  reinforcedPlateRecipe = recipes.find(
    (r) => r.slug === "recipe-ironplatereinforced-c",
  )!;
  ironIngotPart = partSlugLookup["iron-ingot"];
  _ironOrePart = partSlugLookup["iron-ore"];
  ironPlatePart = partSlugLookup["iron-plate"];
  reinforcedPlatePart = partSlugLookup["reinforced-iron-plate"];
});

function buildFactory(): Factory {
  const factory = new Factory();
  factory.update = () => {
    factory._updateRates();
  };

  // Iron Ingot line: 30 ore/min → 30 ingot/min
  const ingotPl = new ProductionLine(ironIngotPart, 0, 0, false, false);
  ingotPl.assemblyLines = [
    new AssemblyLine({
      recipe: ironIngotRecipe,
      rate: 30,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(ingotPl);
  factory._productionLineLookup[ironIngotPart.slug] = ingotPl;

  // Iron Plate line: 30 ingot/min → 20 plate/min (consumes all ingots → iron ingot is intermediate)
  const platePl = new ProductionLine(ironPlatePart, 0, 20, true, false);
  platePl.assemblyLines = [
    new AssemblyLine({
      recipe: ironPlateRecipe,
      rate: 10,
      allowRemainder: false,
    }),
  ];
  factory.productionLines.push(platePl);
  factory._productionLineLookup[ironPlatePart.slug] = platePl;

  factory._updateRates();
  return factory;
}

/** A library factory that consumes some of `buildFactory()`'s Iron Plate output,
 * via a Reinforced Iron Plate line, so it shows up in the Consumers section. */
function buildLibraryWithConsumer(currentFactoryId: string) {
  const consumerFactory = new Factory();
  consumerFactory.update = () => consumerFactory._updateRates();
  const pl = new ProductionLine(reinforcedPlatePart, 0, 0, false, false);
  pl.assemblyLines = [
    new AssemblyLine({
      recipe: reinforcedPlateRecipe,
      rate: 1,
      allowRemainder: false,
    }),
  ];
  consumerFactory.productionLines.push(pl);
  consumerFactory._productionLineLookup[reinforcedPlatePart.slug] = pl;
  consumerFactory._updateRates();

  const now = new Date().toISOString();
  const sConsumer: SerializedFactory = {
    ...serializeFactory(consumerFactory, {
      id: "consumer-1",
      name: "Consumer Factory",
      folderId: null,
      createdAt: now,
      updatedAt: now,
    }),
    supplierIds: [currentFactoryId],
  };
  const library = emptyLibrary();
  library.factories = [sConsumer];
  return library;
}

describe("OverviewSidebar", () => {
  it("renders all six sections when outputs, inputs, intermediates, consumers, and suppliers are all present", () => {
    const factory = buildFactory();
    const supplierFactory = buildFactory();
    factory.addSupplier(
      new FactoryRecipe("supplier-1", "Supplier Factory", supplierFactory),
    );
    factory._updateRates();

    const library = buildLibraryWithConsumer("this-factory");

    renderWithProviders(<OverviewSidebar />, {
      factory,
      library,
      currentFactoryId: "this-factory",
    });

    expect(screen.getByText(/^Outputs/i)).toBeInTheDocument();
    expect(screen.getByText(/^Inputs/i)).toBeInTheDocument();
    expect(screen.getByText(/^Intermediate Parts/i)).toBeInTheDocument();
    expect(screen.getByText(/^Power & Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/^Consumers/i)).toBeInTheDocument();
    expect(screen.getByText(/^Suppliers/i)).toBeInTheDocument();
  });

  it("omits the Consumers section when no consumers exist", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });
    expect(screen.queryByText(/^Consumers/i)).not.toBeInTheDocument();
  });

  it("omits the Suppliers section when there are no supplier factories", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });
    expect(screen.queryByText(/^Suppliers/i)).not.toBeInTheDocument();
  });

  it("renders Outputs section for a factory with net outputs", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    expect(screen.getByText(/Outputs/i)).toBeInTheDocument();
    const ironPlateElements = screen.getAllByText(/Iron Plate/i);
    expect(ironPlateElements.length).toBeGreaterThan(0);
  });

  it("renders Inputs section for raw materials consumed", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    expect(screen.getByText(/Inputs/i)).toBeInTheDocument();
    expect(screen.getByText(/Iron Ore/i)).toBeInTheDocument();
  });

  it("can show intermediate parts when the visibility toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    const intermediateHeading = screen.getByText(/Intermediate Parts/i);
    const row = intermediateHeading.closest(".flex");
    expect(row).not.toBeNull();

    // biome-ignore lint/style/noNonNullAssertion: already checked with toBeNull above
    await user.click(row! as HTMLElement);

    const ironIngotElements = screen.getAllByText(/Iron Ingot/i);
    expect(ironIngotElements.length).toBeGreaterThan(0);
  });

  it("hides Outputs section when toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    const outputsHeader = screen.getByText(/Outputs/i).closest(".flex");
    expect(outputsHeader).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: already checked
    await user.click(outputsHeader! as HTMLElement);

    const wrapper = outputsHeader?.nextElementSibling as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.contentVisibility).toBe("hidden");
  });

  it("hides Inputs section when toggle is clicked", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

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
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    const intermediateHeading = screen.getByText(/Intermediate Parts/i);
    const row = intermediateHeading.closest(".flex");
    expect(row).not.toBeNull();

    const wrapper = row?.nextElementSibling as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.contentVisibility).toBe("hidden");

    // biome-ignore lint/style/noNonNullAssertion: already checked above
    await user.click(row! as HTMLElement);

    expect(wrapper?.style.contentVisibility).toBe("visible");
  });

  it("renders Power & Modules section with a single non-variable power span", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    expect(screen.getByText(/Power & Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Power Shards/i)).toBeInTheDocument();
    // Fixed-clock lines here are not variable-power, so a single "{avg} MW" span renders.
    expect(screen.getByText(/^\d+(\.\d+)? MW$/)).toBeInTheDocument();
  });

  it("starts with Intermediates collapsed and the other sections expanded", () => {
    const factory = buildFactory();
    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

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

  it("re-renders the Suppliers section leaf when a supplier is removed", async () => {
    const user = userEvent.setup();
    const factory = buildFactory();
    const supplierFactory = buildFactory();
    factory.addSupplier(
      new FactoryRecipe("supplier-1", "Supplier Factory", supplierFactory),
    );
    factory._updateRates();

    renderWithProviders(<OverviewSidebar />, {
      factory,
      library: emptyLibrary(),
    });

    expect(screen.getByText(/^Suppliers/i)).toBeInTheDocument();
    expect(screen.getByText("Supplier Factory")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", {
      name: "Remove supplier",
    });
    await user.click(removeButton);

    expect(screen.queryByText(/^Suppliers/i)).not.toBeInTheDocument();
  });
});
